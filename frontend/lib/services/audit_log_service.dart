/// Audit Log Service - Fetches audit/activity history for entities
///
/// SOLE RESPONSIBILITY: Fetch and format audit trail data
///
/// USAGE:
/// ```dart
/// // Get history for a work order
/// final history = await AuditLogService.getResourceHistory(
///   resourceType: 'work_order',
///   resourceId: 123,
/// );
///
/// // Get user's activity history
/// final myActivity = await AuditLogService.getUserHistory(userId: 5);
/// ```
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'auth/token_manager.dart';
import 'error_service.dart';

/// A single audit log entry
class AuditLogEntry {
  final int id;
  final String resourceType;
  final int? resourceId;
  final String action;
  final Map<String, dynamic>? oldValues;
  final Map<String, dynamic>? newValues;
  final int? userId;
  final DateTime createdAt;
  final String? ipAddress;
  final String? userAgent;
  final String? result;
  final String? errorMessage;

  const AuditLogEntry({
    required this.id,
    required this.resourceType,
    this.resourceId,
    required this.action,
    this.oldValues,
    this.newValues,
    this.userId,
    required this.createdAt,
    this.ipAddress,
    this.userAgent,
    this.result,
    this.errorMessage,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: json['id'] as int,
      resourceType: json['resource_type'] as String,
      resourceId: json['resource_id'] as int?,
      action: json['action'] as String,
      oldValues: json['old_values'] as Map<String, dynamic>?,
      newValues: json['new_values'] as Map<String, dynamic>?,
      userId: json['user_id'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      ipAddress: json['ip_address'] as String?,
      userAgent: json['user_agent'] as String?,
      result: json['result'] as String?,
      errorMessage: json['error_message'] as String?,
    );
  }

  /// Get human-readable action description
  String get actionDescription {
    switch (action.toLowerCase()) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      case 'deactivate':
        return 'Deactivated';
      case 'login':
        return 'Logged in';
      case 'logout':
        return 'Logged out';
      case 'login_failed':
        return 'Failed login attempt';
      default:
        // Convert snake_case to Title Case
        return action
            .replaceAll('_', ' ')
            .split(' ')
            .map((w) => w.isNotEmpty 
                ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
                : '')
            .join(' ');
    }
  }

  /// Get list of changed fields (for updates)
  List<String> get changedFields {
    if (oldValues == null || newValues == null) return [];
    
    final changed = <String>[];
    for (final key in newValues!.keys) {
      final oldVal = oldValues![key];
      final newVal = newValues![key];
      if (oldVal != newVal) {
        changed.add(key);
      }
    }
    return changed;
  }
}

/// Service for fetching audit logs
class AuditLogService {
  // Private constructor - static only
  AuditLogService._();

  /// Get audit history for a specific resource
  ///
  /// [resourceType] - Entity type (work_order, customer, user, etc.)
  /// [resourceId] - ID of the resource
  /// [limit] - Maximum entries to return (default 50)
  static Future<List<AuditLogEntry>> getResourceHistory({
    required String resourceType,
    required int resourceId,
    int limit = 50,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token');
      }

      final uri = Uri.parse(
        '${AppConfig.baseUrl}/audit/$resourceType/$resourceId?limit=$limit',
      );

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to fetch audit history: ${response.statusCode}');
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
  static Future<List<AuditLogEntry>> getUserHistory({
    required int userId,
    int limit = 50,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token');
      }

      final uri = Uri.parse(
        '${AppConfig.baseUrl}/audit/user/$userId?limit=$limit',
      );

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
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
