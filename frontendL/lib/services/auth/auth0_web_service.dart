// Auth0 Web Service - PKCE OAuth2 flow for Single Page Applications
import 'dart:convert';
import 'package:web/web.dart' as web;
import '../../config/app_config.dart';
import '../error_service.dart';
import 'package:http/http.dart' as http;
import 'pkce_helper.dart';

/// Auth0 Web Service implementing PKCE (Proof Key for Code Exchange)
///
/// This is the correct and secure approach for Single Page Applications:
/// 1. No client_secret (SPAs are public clients)
/// 2. PKCE replaces client_secret for security
/// 3. Frontend exchanges code directly with Auth0
/// 4. Backend only validates tokens
class Auth0WebService {
  static const String _redirectUri = 'http://localhost:8080/callback';
  static const String _responseType = 'code';
  static const String _scope = 'openid profile email';
  static const String _storageKeyVerifier = 'auth0_code_verifier';

  /// Start PKCE OAuth2 login flow - redirects to Auth0
  Future<void> login() async {
    try {
      // Generate PKCE values
      final codeVerifier = PKCEHelper.generateCodeVerifier();
      final codeChallenge = PKCEHelper.generateCodeChallenge(codeVerifier);

      // Store verifier in session storage (survives page redirect)
      web.window.sessionStorage.setItem(_storageKeyVerifier, codeVerifier);

      // Build Auth0 authorization URL with PKCE parameters
      final params = {
        'client_id': AppConfig.auth0ClientId,
        'redirect_uri': _redirectUri,
        'response_type': _responseType,
        'scope': _scope,
        'code_challenge': codeChallenge,
        'code_challenge_method': 'S256', // SHA256 hashing
      };

      // Only include audience if specified (it's optional)
      if (AppConfig.auth0Audience.isNotEmpty) {
        params['audience'] = AppConfig.auth0Audience;
      }

      final query = params.entries
          .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
          .join('&');
      final authUrl = 'https://${AppConfig.auth0Domain}/authorize?$query';

      ErrorService.logInfo(
        'Starting Auth0 PKCE login',
        context: {
          'codeChallenge': '${codeChallenge.substring(0, 10)}...',
          'audience': AppConfig.auth0Audience,
        },
      );

      // Redirect to Auth0 login page
      web.window.location.href = authUrl;
    } catch (e) {
      ErrorService.logError('Auth0 PKCE login initiation failed', error: e);
      rethrow;
    }
  }

  /// Handle callback from Auth0 (extract code from URL)
  static String? getAuthorizationCode() {
    final uri = Uri.parse(web.window.location.href);
    ErrorService.logInfo(
      'Checking for auth code',
      context: {
        'path': uri.path,
        'hasCode': uri.queryParameters.containsKey('code'),
        'params': uri.queryParameters.keys.toList(),
      },
    );

    if (uri.path == '/callback' && uri.queryParameters.containsKey('code')) {
      final code = uri.queryParameters['code']!;
      ErrorService.logInfo(
        'Auth code found!',
        context: {'codePrefix': '${code.substring(0, 10)}...'},
      );
      return code;
    }

    ErrorService.logError('No auth code found in callback URL');
    return null;
  }

  /// Exchange authorization code for tokens DIRECTLY with Auth0
  ///
  /// This is the CORRECT flow for SPAs:
  /// 1. Frontend calls Auth0 /oauth/token endpoint directly
  /// 2. Provides code + code_verifier (PKCE)
  /// 3. Auth0 validates and returns tokens
  /// 4. Frontend then validates with backend
  Future<Map<String, dynamic>?> exchangeCodeForToken(String code) async {
    try {
      // Retrieve stored code verifier from session
      final codeVerifier = web.window.sessionStorage.getItem(
        _storageKeyVerifier,
      );
      if (codeVerifier == null) {
        throw Exception('Code verifier not found - session may have expired');
      }

      ErrorService.logInfo(
        'Exchanging code with Auth0 (PKCE)',
        context: {
          'codePrefix': '${code.substring(0, 10)}...',
          'hasVerifier': true,
        },
      );

      // Exchange code for tokens DIRECTLY with Auth0 (no backend)
      final response = await http.post(
        Uri.parse('https://${AppConfig.auth0Domain}/oauth/token'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'grant_type': 'authorization_code',
          'client_id': AppConfig.auth0ClientId,
          'code': code,
          'redirect_uri': _redirectUri,
          'code_verifier': codeVerifier, // PKCE verifier
        }),
      );

      // Clear stored verifier (one-time use)
      web.window.sessionStorage.removeItem(_storageKeyVerifier);

      if (response.statusCode == 200) {
        final tokens = json.decode(response.body);

        ErrorService.logInfo('Auth0 token exchange successful');

        // Validate token with backend and get user profile
        final userProfile = await _validateTokenAndGetProfile(
          tokens['access_token'],
          tokens['id_token'],
        );

        if (userProfile == null) {
          throw Exception('Backend token validation failed');
        }

        return {
          'access_token': tokens['access_token'],
          'id_token': tokens['id_token'],
          'refresh_token': tokens['refresh_token'],
          'app_token': userProfile['app_token'],
          'user': userProfile['user'],
        };
      } else {
        ErrorService.logError(
          'Auth0 token exchange failed',
          context: {'status': response.statusCode, 'body': response.body},
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Auth0 token exchange error', error: e);
      return null;
    }
  }

  /// Validate Auth0 token with backend and get user profile
  ///
  /// Backend flow:
  /// 1. Verifies Auth0 token signature
  /// 2. Finds/creates user in local database
  /// 3. Returns app-specific JWT token
  /// 4. Returns user profile data
  Future<Map<String, dynamic>?> _validateTokenAndGetProfile(
    String accessToken,
    String idToken,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth0/validate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: json.encode({'id_token': idToken}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        ErrorService.logInfo('Backend validation successful');
        return data;
      } else {
        ErrorService.logError(
          'Backend validation failed',
          context: {'status': response.statusCode},
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Backend validation error', error: e);
      return null;
    }
  }

  /// Logout - redirect to Auth0 logout
  Future<void> logout() async {
    // Get the current origin (e.g., http://localhost:8080)
    final origin = web.window.location.origin;
    final returnToUrl = '$origin/login';

    final params = {
      'client_id': AppConfig.auth0ClientId,
      'returnTo': returnToUrl,
    };

    final query = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final logoutUrl = 'https://${AppConfig.auth0Domain}/v2/logout?$query';

    ErrorService.logInfo(
      'Auth0 web logout',
      context: {'url': logoutUrl, 'returnTo': returnToUrl},
    );
    web.window.location.href = logoutUrl;
  }
}
