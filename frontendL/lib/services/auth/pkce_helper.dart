import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

/// PKCE (Proof Key for Code Exchange) Helper
///
/// Implements RFC 7636 for secure OAuth2 authorization code flow
/// in public clients (SPAs, mobile apps) without client secrets.
///
/// Flow:
/// 1. Generate random code_verifier
/// 2. Create SHA256 hash code_challenge
/// 3. Send challenge to Auth0 during authorization
/// 4. Send verifier to Auth0 during token exchange
/// 5. Auth0 verifies challenge matches verifier
class PKCEHelper {
  /// Generate a cryptographically secure random code verifier
  ///
  /// Requirements (RFC 7636):
  /// - Length: 43-128 characters
  /// - Characters: A-Z, a-z, 0-9, -, ., _, ~
  /// - High entropy (unpredictable)
  ///
  /// Returns: Base64-URL encoded random string (43 characters)
  static String generateCodeVerifier() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  /// Generate code challenge from verifier using SHA256
  ///
  /// Method: S256 (SHA256 hash)
  /// Alternative: plain (not recommended - less secure)
  ///
  /// Process:
  /// 1. Convert verifier to UTF-8 bytes
  /// 2. Hash bytes with SHA256
  /// 3. Base64-URL encode the hash
  ///
  /// Args:
  ///   verifier: The code verifier string
  ///
  /// Returns: Base64-URL encoded SHA256 hash
  static String generateCodeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    return base64Url.encode(digest.bytes).replaceAll('=', '');
  }
}
