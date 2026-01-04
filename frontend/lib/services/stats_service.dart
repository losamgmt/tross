/// Stats Service - Aggregation queries for dashboards and reports
///
/// SOLE RESPONSIBILITY: Fetch aggregate stats from the backend Stats API
///
/// ENDPOINTS:
/// - GET /api/stats/:entity - Count records
/// - GET /api/stats/:entity?filter=value - Count with filters
/// - GET /api/stats/:entity/grouped/:field - Count grouped by field
/// - GET /api/stats/:entity/sum/:field - Sum a numeric field
///
/// FEATURES:
/// - RLS enforcement (users only see stats for their accessible data)
/// - Permission-aware (requires read access to entity)
/// - Caching-ready (results are immutable)
///
/// USAGE:
/// ```dart
/// // Get from Provider
/// final stats = context.read<StatsService>();
///
/// // Count all work orders
/// final total = await stats.count('work_order');
///
/// // Count pending work orders
/// final pending = await stats.count('work_order', filters: {'status': 'pending'});
///
/// // Get work orders grouped by status
/// final byStatus = await stats.countGrouped('work_order', 'status');
///
/// // Sum paid invoice totals
/// final revenue = await stats.sum('invoice', 'total', filters: {'status': 'paid'});
/// ```
library;

import 'dart:convert';
import 'api/api_client.dart';
import 'auth/token_manager.dart';
import 'error_service.dart';

/// Result of a grouped count query
class GroupedCount {
  final String value;
  final int count;

  const GroupedCount({required this.value, required this.count});

  factory GroupedCount.fromJson(Map<String, dynamic> json) {
    return GroupedCount(
      value: json['value']?.toString() ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  String toString() => 'GroupedCount($value: $count)';
}

/// Stats Service
///
/// All aggregation queries go through this service.
/// Respects RLS and permissions - users only see stats for data they can access.
class StatsService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Constructor - requires ApiClient injection
  StatsService(this._apiClient);

  /// Count records for an entity
  ///
  /// Optionally filter by field values.
  ///
  /// Example:
  /// ```dart
  /// final totalOrders = await stats.count('work_order');
  /// final pendingOrders = await stats.count('work_order', filters: {'status': 'pending'});
  /// ```
  Future<int> count(String entityName, {Map<String, dynamic>? filters}) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Build query string from filters
      final queryParams = <String, String>{};
      if (filters != null) {
        for (final entry in filters.entries) {
          if (entry.value != null) {
            queryParams[entry.key] = entry.value.toString();
          }
        }
      }

      final queryString = queryParams.isNotEmpty
          ? '?${queryParams.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/stats/$entityName$queryString',
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;
        return (data?['count'] as num?)?.toInt() ?? 0;
      } else if (response.statusCode == 403) {
        // No permission - return 0 gracefully
        ErrorService.logWarning(
          'No permission to view stats for $entityName',
          context: {'statusCode': response.statusCode},
        );
        return 0;
      } else {
        throw Exception('Failed to fetch stats: ${response.statusCode}');
      }
    } catch (e) {
      ErrorService.logError(
        'StatsService.count failed',
        error: e,
        context: {'entity': entityName, 'filters': filters},
      );
      rethrow;
    }
  }

  /// Count records grouped by a field
  ///
  /// Returns list of (value, count) pairs sorted by count descending.
  ///
  /// Example:
  /// ```dart
  /// final byStatus = await stats.countGrouped('work_order', 'status');
  /// // Returns: [GroupedCount('completed', 42), GroupedCount('pending', 12), ...]
  /// ```
  Future<List<GroupedCount>> countGrouped(
    String entityName,
    String groupByField, {
    Map<String, dynamic>? filters,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Build query string from filters
      final queryParams = <String, String>{};
      if (filters != null) {
        for (final entry in filters.entries) {
          if (entry.value != null) {
            queryParams[entry.key] = entry.value.toString();
          }
        }
      }

      final queryString = queryParams.isNotEmpty
          ? '?${queryParams.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/stats/$entityName/grouped/$groupByField$queryString',
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as List<dynamic>?;
        if (data == null) return [];

        return data
            .map((item) => GroupedCount.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response.statusCode == 403) {
        // No permission - return empty gracefully
        ErrorService.logWarning(
          'No permission to view grouped stats for $entityName',
          context: {'statusCode': response.statusCode, 'field': groupByField},
        );
        return [];
      } else {
        throw Exception(
          'Failed to fetch grouped stats: ${response.statusCode}',
        );
      }
    } catch (e) {
      ErrorService.logError(
        'StatsService.countGrouped failed',
        error: e,
        context: {
          'entity': entityName,
          'groupByField': groupByField,
          'filters': filters,
        },
      );
      rethrow;
    }
  }

  /// Sum a numeric field
  ///
  /// Optionally filter by field values.
  ///
  /// Example:
  /// ```dart
  /// final revenue = await stats.sum('invoice', 'total', filters: {'status': 'paid'});
  /// final outstanding = await stats.sum('invoice', 'total', filters: {'status': 'sent'});
  /// ```
  Future<double> sum(
    String entityName,
    String field, {
    Map<String, dynamic>? filters,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Build query string from filters
      final queryParams = <String, String>{};
      if (filters != null) {
        for (final entry in filters.entries) {
          if (entry.value != null) {
            queryParams[entry.key] = entry.value.toString();
          }
        }
      }

      final queryString = queryParams.isNotEmpty
          ? '?${queryParams.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '/stats/$entityName/sum/$field$queryString',
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;
        return (data?['sum'] as num?)?.toDouble() ?? 0.0;
      } else if (response.statusCode == 403) {
        // No permission - return 0 gracefully
        ErrorService.logWarning(
          'No permission to view sum stats for $entityName',
          context: {'statusCode': response.statusCode, 'field': field},
        );
        return 0.0;
      } else {
        throw Exception('Failed to fetch sum stats: ${response.statusCode}');
      }
    } catch (e) {
      ErrorService.logError(
        'StatsService.sum failed',
        error: e,
        context: {'entity': entityName, 'field': field, 'filters': filters},
      );
      rethrow;
    }
  }
}
