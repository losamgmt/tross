// Auth Service - Clean orchestration of authentication flows
import '../../config/app_config.dart';
import '../../config/api_endpoints.dart';
import '../../config/constants.dart';
import 'auth0_platform_service.dart';
import 'auth_token_service.dart';
import 'auth_profile_service.dart';
import '../api_client.dart';
import '../error_service.dart';

class AuthService {
  String? _token;
  Map<String, dynamic>? _user;

  final Auth0PlatformService _auth0Service = Auth0PlatformService();
  final AuthTokenService _tokenService = AuthTokenService();
  final AuthProfileService _profileService = AuthProfileService();

  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal() {
    // Wire up auto token refresh callback
    ApiClient.onTokenRefreshNeeded = _handleTokenRefresh;
  }

  // Getters
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null;

  // Strategy Detection Helpers
  /// Determine which auth strategy is currently in use
  String get authStrategy {
    if (_user == null) return AppConstants.authProviderUnknown;
    final provider = _user!['provider'];
    if (provider == AppConstants.authProviderAuth0) {
      return AppConstants.authProviderAuth0;
    }
    if (provider == AppConstants.authProviderDevelopment) {
      return AppConstants.authProviderDevelopment;
    }
    return AppConstants.authProviderUnknown;
  }

  /// Check if user is authenticated via Auth0
  bool get isAuth0User => authStrategy == AppConstants.authProviderAuth0;

  /// Check if user is authenticated via development mode
  bool get isDevUser => authStrategy == AppConstants.authProviderDevelopment;

  /// Initialize and restore authentication state from local storage only
  /// KISS Principle: No HTTP calls during initialization - just check what we have stored
  Future<void> initialize() async {
    try {
      final storedData = await _tokenService.getStoredAuthData();

      if (storedData != null) {
        _token = storedData['token'];
        _user = storedData['user'];
        ErrorService.logInfo('Auth state restored from local storage');
      } else {
        ErrorService.logInfo('No stored auth data found');
      }
    } catch (e) {
      ErrorService.logError('Failed to initialize auth state', error: e);
      await _clearAuthState();
    }
  }

  /// Handle automatic token refresh when 401 occurs
  /// Called by ApiClient interceptor
  Future<String?> _handleTokenRefresh() async {
    try {
      ErrorService.logInfo('Auto token refresh triggered');

      final success = await refreshToken();
      if (success && _token != null) {
        ErrorService.logInfo('Auto token refresh successful');
        return _token;
      }

      ErrorService.logError('Auto token refresh failed - token is null');
      return null;
    } catch (e) {
      ErrorService.logError('Auto token refresh exception', error: e);
      return null;
    }
  }

  /// Validate stored token by checking with backend
  /// Call this when user tries to access protected resources, not during initialization
  Future<bool> validateStoredToken() async {
    if (_token == null) {
      ErrorService.logInfo('Token validation skipped - no token present');
      return false;
    }

    try {
      final profile = await _tokenService.validateToken(_token!);
      if (profile != null) {
        _user = profile;
        ErrorService.logInfo(
          'Token validated successfully',
          context: {'strategy': authStrategy},
        );
        return true;
      } else {
        // Token is invalid, clear stored data
        ErrorService.logInfo('Token validation failed - clearing auth state');
        await _clearAuthState();
        return false;
      }
    } catch (e) {
      ErrorService.logError('Token validation exception', error: e);
      await _clearAuthState();
      return false;
    }
  }

  /// Auth0 Production Login - Works on all platforms (web, iOS, Android)
  Future<bool> loginWithAuth0() async {
    try {
      final credentials = await _auth0Service.login();

      // Web redirects away, so credentials will be null
      // Mobile returns credentials immediately
      if (credentials != null && credentials.isValid) {
        return await _completeAuth0Login(credentials);
      }

      // For web, return true to indicate redirect started
      // Actual login completion happens in handleAuth0Callback
      if (Auth0PlatformService.isWeb) {
        ErrorService.logInfo('Auth0 web redirect initiated');
        return true;
      }

      return false;
    } catch (e) {
      ErrorService.logError('Auth0 login failed', error: e);
      return false;
    }
  }

  /// Handle Auth0 callback (web-only) - Call this on app startup if URL contains auth code
  Future<bool> handleAuth0Callback() async {
    if (!Auth0PlatformService.isWeb) return false;

    try {
      final credentials = await _auth0Service.handleWebCallback();
      if (credentials != null && credentials.isValid) {
        return await _completeAuth0Login(credentials);
      }
      return false;
    } catch (e) {
      ErrorService.logError('Auth0 callback handling failed', error: e);
      return false;
    }
  }

  /// Complete Auth0 login after getting credentials (mobile or web callback)
  Future<bool> _completeAuth0Login(Auth0Credentials credentials) async {
    try {
      // Use backend app token for API calls, NOT Auth0 access token
      _token = credentials.appToken ?? credentials.accessToken;

      // Get user profile from backend
      final profile = await _profileService.getUserProfile(_token!);
      if (profile != null) {
        _user = profile;

        // Store authentication data
        await _tokenService.storeAuthData(
          token: _token!,
          user: _user!,
          refreshToken: credentials.refreshToken,
        );

        ErrorService.logInfo('Auth0 login completed successfully');
        return true;
      }

      return false;
    } catch (e) {
      ErrorService.logError('Auth0 login completion failed', error: e);
      return false;
    }
  }

  /// Development Test Token Login
  ///
  /// Supports all roles: admin, manager, dispatcher, technician, client
  /// Security: Triple-validated (UI hidden, service blocked, backend rejected)
  Future<bool> loginWithTestToken({required String role}) async {
    ErrorService.logInfo('Test token login started', context: {'role': role});

    // SECURITY LAYER 2: Service-level validation
    // Throws StateError in production - caught and logged
    try {
      ErrorService.logInfo('Validating dev auth');
      AppConfig.validateDevAuth();
      ErrorService.logInfo('Dev auth validated');
    } on StateError catch (e) {
      ErrorService.logError(
        'Security violation: Dev authentication attempted in production',
        context: {
          'method': 'loginWithTestToken',
          'role': role,
          'environment': AppConfig.environmentName,
        },
        error: e,
      );
      return false; // Silent failure - better UX than throwing
    }

    try {
      ErrorService.logInfo(
        'Calling ApiClient.getTestToken',
        context: {'role': role},
      );

      final token = await ApiClient.getTestToken(role: role);

      ErrorService.logInfo(
        'Test token received',
        context: {'hasToken': token != null, 'tokenLength': token?.length ?? 0},
      );

      if (token != null) {
        ErrorService.logInfo('Storing valid token');
        _token = token;

        // Get user profile
        ErrorService.logInfo('Fetching user profile');
        final profile = await _profileService.getUserProfile(_token!);

        ErrorService.logInfo(
          'User profile received',
          context: {
            'hasProfile': profile != null,
            'profileKeys': profile?.keys.toList() ?? [],
          },
        );

        if (profile != null) {
          ErrorService.logInfo('Profile valid, storing user');
          _user = profile;

          // Store for development
          ErrorService.logInfo('Storing auth data');
          await _tokenService.storeAuthData(token: _token!, user: _user!);

          ErrorService.logInfo(
            'Test login successful',
            context: {'role': role, 'actualRole': _user?['role']},
          );
          return true;
        } else {
          ErrorService.logError('Profile is null after getUserProfile');
        }
      } else {
        ErrorService.logError('Token is null after getTestToken');
      }

      ErrorService.logWarning('Test login returning false - end of try block');
      return false;
    } catch (e) {
      ErrorService.logError('Test login exception', error: e);
      return false;
    }
  }

  /// Refresh token
  Future<bool> refreshToken() async {
    try {
      final result = await _tokenService.refreshToken();
      if (result != null) {
        _token = result['token'];
        _user = result['user'];

        // Update stored data
        await _tokenService.storeAuthData(
          token: _token!,
          user: _user!,
          refreshToken: result['refreshToken'],
        );

        ErrorService.logInfo('Token refreshed successfully');
        return true;
      }

      return false;
    } catch (e) {
      ErrorService.logError('Token refresh failed', error: e);
      return false;
    }
  }

  /// Logout
  /// Works for BOTH development and production auth strategies
  /// Calls backend /api/auth/logout for audit trail and token revocation
  Future<void> logout() async {
    final logoutStartTime = DateTime.now();
    ErrorService.logInfo(
      '🔑 AUTH SERVICE: ========== LOGOUT START (${logoutStartTime.toString().split('.')[0]}) ==========',
      context: {
        'token': _token != null ? 'present' : 'null',
        'strategy': authStrategy,
        'isAuth0': isAuth0User,
        'isDevUser': isDevUser,
      },
    );

    try {
      // Step 1: Call backend logout endpoint for audit trail and token revocation
      // Non-blocking - continue even if backend call fails
      if (_token != null) {
        try {
          final backendCallStart = DateTime.now();
          ErrorService.logInfo(
            '🔑 AUTH SERVICE: Calling backend /auth/logout...',
          );
          final response = await ApiClient.authenticatedRequest(
            'POST',
            ApiEndpoints.authLogout,
            token: _token!,
            body: {'provider': authStrategy},
          );
          final backendDuration = DateTime.now()
              .difference(backendCallStart)
              .inMilliseconds;
          ErrorService.logInfo(
            '🔑 AUTH SERVICE: Backend logout response',
            context: {
              'statusCode': response.statusCode,
              'duration_ms': backendDuration,
            },
          );
          if (response.statusCode == 200) {
            ErrorService.logInfo('🔑 AUTH SERVICE: Backend logout successful');
          }
        } catch (e) {
          // Log but don't block logout on backend failure
          ErrorService.logError(
            '🔑 AUTH SERVICE: Backend logout failed (non-blocking)',
            error: e,
          );
        }
      } else {
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: No token, skipping backend logout',
        );
      }

      // Step 2: Call provider-specific logout using strategy detection
      if (isAuth0User) {
        // Auth0 logout - triggers browser redirect (NEVER returns on web!)
        // Don't await or clear state - browser is navigating away
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: Auth0 logout - redirecting to Auth0...',
        );
        _auth0Service.logout(); // NO AWAIT - redirects immediately
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: Auth0 redirect triggered (code should not reach here on web)',
        );
        // Code after this NEVER executes on web (browser redirects)
        return; // Exit early - browser is navigating away
      } else if (isDevUser) {
        // Dev auth logout - stateless JWT, no provider cleanup needed
        final clearStateStart = DateTime.now();
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: Development auth - clearing state...',
        );
        // Step 3: Clear local state (dev auth only - Auth0 redirects instead)
        await _clearAuthState();
        final clearDuration = DateTime.now()
            .difference(clearStateStart)
            .inMilliseconds;
        final totalDuration = DateTime.now()
            .difference(logoutStartTime)
            .inMilliseconds;
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: Development logout complete ✅',
          context: {
            'clear_state_ms': clearDuration,
            'total_logout_ms': totalDuration,
          },
        );
      } else {
        ErrorService.logInfo(
          '🔑 AUTH SERVICE: Unknown auth strategy, clearing state...',
        );
        await _clearAuthState();
      }
    } catch (e) {
      final errorDuration = DateTime.now()
          .difference(logoutStartTime)
          .inMilliseconds;
      ErrorService.logError(
        '🔑 AUTH SERVICE: Logout failed',
        error: e,
        context: {
          'strategy': authStrategy,
          'duration_before_error_ms': errorDuration,
        },
      );
      // Always clear local state even if remote logout fails
      ErrorService.logInfo('🔑 AUTH SERVICE: Clearing state in catch block...');
      await _clearAuthState();
      ErrorService.logInfo('🔑 AUTH SERVICE: State cleared in catch block');
    }

    final finalDuration = DateTime.now()
        .difference(logoutStartTime)
        .inMilliseconds;
    ErrorService.logInfo(
      '🔑 AUTH SERVICE: ========== LOGOUT END (total: ${finalDuration}ms) ==========',
    );
  }

  /// Update user profile
  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    if (_token == null) return false;

    final profile = await _profileService.updateProfile(_token!, updates);
    if (profile != null) {
      _user = profile;
      await _tokenService.storeAuthData(token: _token!, user: _user!);
      return true;
    }

    return false;
  }

  /// Make authenticated API request
  Future<dynamic> authenticatedRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
  }) async {
    if (_token == null) {
      throw Exception('Not authenticated - no token available');
    }

    return ApiClient.authenticatedRequest(
      method,
      endpoint,
      token: _token!,
      body: body,
      additionalHeaders: additionalHeaders,
    );
  }

  /// Check if user has specific role
  bool hasRole(String roleName) => AuthProfileService.hasRole(_user, roleName);

  /// Check if user is admin
  bool get isAdmin => AuthProfileService.isAdmin(_user);

  /// Check if user is technician
  bool get isTechnician => AuthProfileService.isTechnician(_user);

  /// Get user's display name
  String get displayName => AuthProfileService.getDisplayName(_user);

  /// Clear authentication state
  Future<void> _clearAuthState() async {
    ErrorService.logInfo('Clearing auth state');
    _token = null;
    _user = null;
    await _tokenService.clearAuthData();
    ErrorService.logInfo('Auth state cleared');
  }
}
