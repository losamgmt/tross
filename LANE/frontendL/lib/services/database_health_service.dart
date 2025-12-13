/// Database Health Service
///
/// Fetches database health information from backend API.
/// Uses dependency injection pattern for testability.
///
/// Production: ApiDatabaseHealthService (real HTTP calls)
/// Testing: Mock/Fake implementations
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/database_health.dart';
import 'error_service.dart';

/// Abstract service interface for database health operations
abstract class DatabaseHealthService {
  /// Fetch health status for all databases
  Future<DatabasesHealthResponse> fetchHealth();
}

/// Production implementation using real API endpoint
class ApiDatabaseHealthService implements DatabaseHealthService {
  final String apiBaseUrl;
  final String authToken;
  final http.Client client;

  ApiDatabaseHealthService({
    required this.apiBaseUrl,
    required this.authToken,
    http.Client? client,
  }) : client = client ?? http.Client();

  @override
  Future<DatabasesHealthResponse> fetchHealth() async {
    try {
      final response = await client.get(
        Uri.parse('$apiBaseUrl/api/health/databases'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return DatabasesHealthResponse.fromJson(data);
      } else if (response.statusCode == 304) {
        throw Exception('Unexpected 304 response - cache issue');
      } else if (response.statusCode == 401) {
        throw Exception(AppConstants.authError);
      } else if (response.statusCode == 403) {
        throw Exception('Forbidden: Admin access required');
      } else {
        throw Exception(
          '${AppConstants.failedToLoadData}: HTTP ${response.statusCode}',
        );
      }
    } catch (error, stackTrace) {
      ErrorService.logError(
        'Failed to fetch database health',
        error: error,
        stackTrace: stackTrace,
        context: {
          'apiBaseUrl': apiBaseUrl,
          'hasAuthToken': authToken.isNotEmpty,
        },
      );
      rethrow;
    }
  }
}
