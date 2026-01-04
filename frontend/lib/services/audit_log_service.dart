/// Audit Log Service - Fetches audit/activity history for entities
///
/// SOLE RESPONSIBILITY: Fetch and format audit trail data
///
/// USAGE:
/// ```dart
/// // Get from Provider
/// final auditService = context.read<AuditLogService>();
///
/// // Get history for a work order
/// final history = await auditService.getResourceHistory(
///   resourceType: 'work_order',
///   resourceId: 123,
/// );
///
/// // Get user's activity history
/// final myActivity = await auditService.getUserHistory(userId: 5);
///
/// // Get all recent logs (admin only)
/// final allLogs = await auditService.getAllLogs(filter: 'data');
/// ```
library;

import 'dart:convert';
import '../models/audit_log_entry.dart';
import 'api/api_client.dart';
import 'auth/token_manager.dart';
import 'error_service.dart';

/// Result from paginated audit log query
class AuditLogResult {
  final List<AuditLogEntry> logs;
  final int total;
  final int limit;
  final int offset;

  const AuditLogResult({
    required this.logs,
    required this.total,
    required this.limit,
    required this.offset,
  });
}

/// Service for fetching audit logs
class AuditLogService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Constructor - requires ApiClient injection
  AuditLogService(this._apiClient);

  /// Get all recent audit logs (admin only)
  ///
  /// [filter] - 'data' for CRUD events, 'auth' for auth events, null for all
  /// [limit] - Maximum entries to return (default 100, max 500)
  /// [offset] - Offset for pagination (default 0)
  Future<AuditLogResult> getAllLogs({
    String? filter,
    int limit = 100,
    int offset = 0,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token');
      }

      final queryParams = <String, String>{
        'limit': limit.toString(),
        'offset': offset.toString(),
      };
      if (filter != null) {
        queryParams['filter'] = filter;
      }

      final queryString = queryParams.entries
          .map((e) => '${e.key}=${e.value}')
          .join('&');

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/audit/all?$queryString',
        token: token,
      );

      if (response.statusCode == 403) {
        throw Exception('You do not have permission to view audit logs');
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to fetch audit logs: ${response.statusCode}');
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final data = json['data'] as List<dynamic>? ?? [];
      final meta = json['meta'] as Map<String, dynamic>? ?? {};
      final pagination = meta['pagination'] as Map<String, dynamic>? ?? {};

      return AuditLogResult(
        logs: data
            .map((e) => AuditLogEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
        total: pagination['total'] as int? ?? data.length,
        limit: pagination['limit'] as int? ?? limit,
        offset: pagination['offset'] as int? ?? offset,
      );
    } catch (e) {
      ErrorService.logError(
        '[AuditLogService] Failed to get all logs',
        error: e,
      );
      rethrow;
    }
  }

  /// Get audit history for a specific resource
  ///
  /// [resourceType] - Entity type (work_order, customer, user, etc.)
  /// [resourceId] - ID of the resource
  /// [limit] - Maximum entries to return (default 50)
  Future<List<AuditLogEntry>> getResourceHistory({
    required String resourceType,
    required int resourceId,
    int limit = 50,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token');
      }

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/audit/$resourceType/$resourceId?limit=$limit',
        token: token,
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to fetch audit history: ${response.statusCode}',
        );
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final data = json['data'] as List<dynamic>? ?? [];

      return data
          .map((e) => AuditLogEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      ErrorService.logError(
        '[AuditLogService] Failed to get resource history',
        error: e,
      );
      rethrow;
    }
  }

  /// Get activity history for a specific user
  ///
  /// [userId] - ID of the user
  /// [limit] - Maximum entries to return (default 50)
  Future<List<AuditLogEntry>> getUserHistory({
    required int userId,
    int limit = 50,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token');
      }

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/audit/user/$userId?limit=$limit',
        token: token,
      );

      if (response.statusCode == 403) {
        throw Exception('You can only view your own activity history');
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to fetch user history: ${response.statusCode}');
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final data = json['data'] as List<dynamic>? ?? [];

      return data
          .map((e) => AuditLogEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      ErrorService.logError(
        '[AuditLogService] Failed to get user history',
        error: e,
      );
      rethrow;
    }
  }
}
