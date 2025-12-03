/// EnvironmentService - Service for fetching environment and system status
///
/// Single Responsibility: Fetch real-time environment data from backend
/// Used by development tools to display current system configuration
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../config/api_endpoints.dart';
import '../config/constants.dart';

/// Environment information from backend
class EnvironmentInfo {
  final String backendUrl;
  final String authMode;
  final String apiHealth;
  final String? databaseStatus;
  final int provenEndpoints;
  final int totalEndpoints;
  final String phase;

  const EnvironmentInfo({
    required this.backendUrl,
    required this.authMode,
    required this.apiHealth,
    this.databaseStatus,
    this.provenEndpoints = 9,
    this.totalEndpoints = 24,
    this.phase = 'MVP Phase - Read Operations Complete',
  });

  /// Calculate endpoint coverage percentage
  double get coveragePercentage => (provenEndpoints / totalEndpoints * 100);

  /// Format coverage as string
  String get coverageDisplay =>
      '$provenEndpoints/$totalEndpoints (${coveragePercentage.toStringAsFixed(1)}%)';
}

class EnvironmentService {
  EnvironmentService._(); // Private constructor

  /// Fetch complete environment information
  static Future<EnvironmentInfo> getEnvironmentInfo({
    required String token,
  }) async {
    try {
      // Fetch dev status
      final devStatusUri = Uri.parse(
        '${AppConfig.baseUrl}${ApiEndpoints.devStatus}',
      );
      final devStatusResponse = await http
          .get(
            devStatusUri,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(AppConfig.httpTimeout);

      String authMode = AppConstants.authProviderUnknown;
      if (devStatusResponse.statusCode == 200) {
        final devData = json.decode(devStatusResponse.body);
        // Backend returns 'provider' field (e.g., 'development', 'auth0')
        final provider = devData['provider'];
        if (provider == AppConstants.authProviderDevelopment) {
          authMode = AppConstants.authProviderDevelopment;
        } else if (provider == AppConstants.authProviderAuth0) {
          authMode = AppConstants.authProviderAuth0;
        } else if (provider != null) {
          authMode = provider.toString();
        }
      }

      // Fetch health status
      final healthUri = Uri.parse(
        '${AppConfig.baseUrl}${ApiEndpoints.healthCheck}',
      );
      final healthResponse = await http
          .get(healthUri)
          .timeout(AppConfig.httpTimeout);

      String apiHealth = 'Unknown';
      if (healthResponse.statusCode == 200) {
        final healthData = json.decode(healthResponse.body);
        apiHealth = healthData['status'] ?? 'Unknown';
      }

      // Try to get database status (requires auth)
      String? databaseStatus;
      try {
        final dbUri = Uri.parse('${AppConfig.baseUrl}/health/databases');
        final dbResponse = await http
            .get(
              dbUri,
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
            )
            .timeout(AppConfig.httpTimeout);

        if (dbResponse.statusCode == 200) {
          final dbData = json.decode(dbResponse.body);
          if (dbData is List && dbData.isNotEmpty) {
            final mainDb = dbData[0];
            databaseStatus = '${mainDb['name']} - ${mainDb['status']}';
          }
        }
      } catch (e) {
        // Database check failed, continue without it
        databaseStatus = null;
      }

      return EnvironmentInfo(
        backendUrl: AppConfig.backendUrl,
        authMode: authMode,
        apiHealth: apiHealth,
        databaseStatus: databaseStatus,
      );
    } catch (e) {
      // Return defaults on error
      return EnvironmentInfo(
        backendUrl: AppConfig.backendUrl,
        authMode: 'Error fetching data',
        apiHealth: 'Error',
      );
    }
  }
}
