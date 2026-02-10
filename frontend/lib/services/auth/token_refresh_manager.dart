// Token Refresh Manager - Proactive token refresh before expiration
//
// Implements WidgetsBindingObserver to detect app lifecycle changes
// and schedule token refresh before the access token expires.
//
// Refresh Strategy:
// - Schedule refresh 5 minutes before token expiry
// - On app resume: check if refresh is needed
// - Uses backend /api/auth/refresh for secure token rotation
//
// This eliminates abrupt logouts when tokens expire during active use.
import 'dart:async';
import 'package:flutter/widgets.dart';
import 'token_manager.dart';
import 'auth_token_service.dart';
import '../error_service.dart';

/// Callback type for when token is refreshed
/// [newToken] - The new access token
/// [newRefreshToken] - The new refresh token (null for dev mode)
/// [expiresAt] - Token expiry timestamp in seconds
/// [user] - Updated user profile
/// [provider] - Auth provider (auth0 or development)
typedef OnTokenRefreshed =
    void Function(
      String newToken,
      String? newRefreshToken,
      int? expiresAt,
      Map<String, dynamic>? user,
      String? provider,
    );

/// Callback type for when refresh fails and logout is needed
typedef OnRefreshFailed = void Function();

/// Manages proactive token refresh before expiration
///
/// Usage:
/// ```dart
/// final manager = TokenRefreshManager(
///   tokenService: authTokenService,
///   onTokenRefreshed: (token, refresh, exp) => authService.updateTokens(...),
///   onRefreshFailed: () => authService.logout(),
/// );
/// manager.initialize();
/// // Later...
/// manager.dispose();
/// ```
class TokenRefreshManager with WidgetsBindingObserver {
  final AuthTokenService _tokenService;
  final OnTokenRefreshed _onTokenRefreshed;
  final OnRefreshFailed _onRefreshFailed;

  /// How long before expiry to trigger proactive refresh
  final Duration refreshBuffer;

  Timer? _refreshTimer;
  bool _isRefreshing = false;
  bool _isInitialized = false;

  TokenRefreshManager({
    required AuthTokenService tokenService,
    required OnTokenRefreshed onTokenRefreshed,
    required OnRefreshFailed onRefreshFailed,
    this.refreshBuffer = const Duration(minutes: 5),
  }) : _tokenService = tokenService,
       _onTokenRefreshed = onTokenRefreshed,
       _onRefreshFailed = onRefreshFailed;

  /// Initialize the manager and register lifecycle observer
  void initialize() {
    if (_isInitialized) return;

    WidgetsBinding.instance.addObserver(this);
    _isInitialized = true;
    ErrorService.logInfo('TokenRefreshManager initialized');
  }

  /// Schedule refresh based on token expiry time
  ///
  /// Call this after login or token refresh to schedule the next refresh.
  Future<void> scheduleRefresh() async {
    _cancelTimer();

    final expiry = await TokenManager.getTokenExpiry();
    if (expiry == null) {
      ErrorService.logDebug(
        'No token expiry stored - cannot schedule proactive refresh',
      );
      return;
    }

    final now = DateTime.now();
    final refreshAt = expiry.subtract(refreshBuffer);

    if (refreshAt.isBefore(now)) {
      // Token is expired or will expire within buffer - refresh now
      ErrorService.logInfo(
        'Token expires soon or already expired - refreshing immediately',
      );
      await _performRefresh();
      return;
    }

    final delay = refreshAt.difference(now);
    ErrorService.logInfo(
      'Scheduling token refresh in ${delay.inMinutes} minutes',
      context: {
        'expiresAt': expiry.toIso8601String(),
        'refreshAt': refreshAt.toIso8601String(),
      },
    );

    _refreshTimer = Timer(delay, () async {
      await _performRefresh();
    });
  }

  /// Cancel any pending refresh timer
  void cancelRefresh() {
    _cancelTimer();
    ErrorService.logDebug('Token refresh cancelled');
  }

  /// Lifecycle callback - check token when app resumes
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _onAppResumed();
    }
  }

  /// Handle app resume - check if token needs refresh
  Future<void> _onAppResumed() async {
    ErrorService.logDebug('App resumed - checking token status');

    final shouldRefresh = await TokenManager.shouldRefreshToken(
      buffer: refreshBuffer,
    );

    if (shouldRefresh) {
      ErrorService.logInfo('Token needs refresh after app resume');
      await _performRefresh();
    } else {
      // Re-schedule if we haven't already
      if (_refreshTimer == null || !_refreshTimer!.isActive) {
        await scheduleRefresh();
      }
    }
  }

  /// Perform the actual token refresh
  Future<void> _performRefresh() async {
    if (_isRefreshing) {
      ErrorService.logDebug('Refresh already in progress - skipping');
      return;
    }

    _isRefreshing = true;
    _cancelTimer();

    try {
      ErrorService.logInfo('Performing proactive token refresh');

      final result = await _tokenService.refreshTokenViaBackend();

      if (result != null) {
        final newToken = result['token'] as String;
        final newRefreshToken = result['refreshToken'] as String?;
        final expiresAt = result['expiresAt'] as int?;
        final user = result['user'] as Map<String, dynamic>?;
        final provider = result['provider'] as String?;

        // Notify caller of new tokens and user data
        _onTokenRefreshed(newToken, newRefreshToken, expiresAt, user, provider);

        // Schedule next refresh
        await scheduleRefresh();

        ErrorService.logInfo('Proactive token refresh successful');
      } else {
        ErrorService.logWarning('Proactive token refresh failed - no result');
        _onRefreshFailed();
      }
    } catch (e) {
      ErrorService.logError('Proactive token refresh error', error: e);
      _onRefreshFailed();
    } finally {
      _isRefreshing = false;
    }
  }

  void _cancelTimer() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  /// Clean up resources
  void dispose() {
    _cancelTimer();
    if (_isInitialized) {
      WidgetsBinding.instance.removeObserver(this);
      _isInitialized = false;
    }
    ErrorService.logInfo('TokenRefreshManager disposed');
  }
}
