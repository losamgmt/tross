/// ApiException - typed error for non-2xx API responses.
library;

/// Exception thrown when the API returns a non-2xx response.
///
/// Mirrors the backend's canonical error envelope:
/// `{ success: false, error, code, message, details?, timestamp }`.
///
/// Callers should branch on the stable, machine-readable [code]
/// (e.g. `'RESOURCE_NOT_FOUND'`, `'AUTH_REQUIRED'`) rather than parsing the
/// human-readable [message], which may change or be localized.
class ApiException implements Exception {
  const ApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.details,
  });

  /// HTTP status code of the failed response (e.g. 404).
  final int statusCode;

  /// Machine-readable error code from the envelope's `code` field
  /// (e.g. `'RESOURCE_NOT_FOUND'`), or `null` if the response omitted it.
  final String? code;

  /// Human-readable message from the envelope's `message` field
  /// (falling back to `error`).
  final String message;

  /// Optional structured details (e.g. field-level validation errors).
  final Object? details;

  /// Returns the plain [message] (no `Exception:` prefix) so it can be shown
  /// directly in the UI.
  @override
  String toString() => message;
}
