/// DbHealthDashboard - Organism for database health monitoring
///
/// **SOLE RESPONSIBILITY:** Compose molecules/atoms for health dashboard display
///
/// Displays real-time health status for all databases using:
/// - PageHeader (title + status badge + refresh action)
/// - RefreshableDataWidget (handles refresh + async data)
/// - DatabaseHealthCard molecules in responsive grid
/// - EmptyState for no databases
///
/// **Architecture:** Pure composition pattern
/// - Uses RefreshableDataWidget for refresh + async handling
/// - Uses DatabaseHealthService for API calls
/// - NO state management (delegated to helpers)
///
/// Usage:
/// ```dart
/// DbHealthDashboard.api(
///   apiBaseUrl: 'http://localhost:3001',
///   authToken: 'your-jwt-token',
///   autoRefresh: true,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../models/database_health.dart';
import '../../../services/database_health_service.dart';
import '../../../config/constants.dart';
import '../../../utils/helpers/status_helper.dart';
import '../../molecules/dashboard_card.dart';
import '../../molecules/health_status_box.dart';
import '../../molecules/cards/database_health_card.dart';
import '../../molecules/empty_state.dart';
import '../../atoms/indicators/connection_status_badge.dart';
import '../../atoms/indicators/loading_indicator.dart';
import '../../helpers/refreshable_data_widget.dart';
import '../../molecules/error_card.dart';
import '../../molecules/buttons/button_group.dart';

/// Organism component for displaying database health dashboard
class DbHealthDashboard extends StatelessWidget {
  /// Service for fetching health data (injectable for testing)
  final DatabaseHealthService healthService;

  /// Whether to automatically refresh data
  final bool autoRefresh;

  /// How often to refresh data (only used if autoRefresh is true)
  final Duration refreshInterval;

  /// Callback when refresh is triggered
  final VoidCallback? onRefresh;

  const DbHealthDashboard({
    super.key,
    required this.healthService,
    this.autoRefresh = true,
    this.refreshInterval = const Duration(seconds: 30),
    this.onRefresh,
  });

  /// Convenience factory for production use with API.
  ///
  /// Creates dashboard with [ApiDatabaseHealthService] configured
  /// for the given API endpoint and authentication token.
  factory DbHealthDashboard.api({
    Key? key,
    required String apiBaseUrl,
    required String authToken,
    http.Client? client,
    bool autoRefresh = true,
    Duration refreshInterval = const Duration(seconds: 30),
    VoidCallback? onRefresh,
  }) {
    return DbHealthDashboard(
      key: key,
      healthService: ApiDatabaseHealthService(
        apiBaseUrl: apiBaseUrl,
        authToken: authToken,
        client: client,
      ),
      autoRefresh: autoRefresh,
      refreshInterval: refreshInterval,
      onRefresh: onRefresh,
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshableDataWidget<DatabasesHealthResponse>(
      fetchData: healthService.fetchHealth,
      autoRefresh: autoRefresh,
      refreshInterval: refreshInterval,
      onRefresh: onRefresh,
      loadingWidget: const LoadingIndicator(
        message: 'Loading database health...',
        size: LoadingSize.large,
      ),
      errorBuilder: (error, retry) => ErrorCard(
        title: 'Failed to Load Health Data',
        message: error.toString().replaceAll('Exception: ', ''),
        buttons: [
          ButtonConfig(
            label: 'Retry',
            icon: Icons.refresh,
            onPressed: retry,
            isPrimary: true,
          ),
        ],
      ),
      builder: (context, healthData, isRefreshing, onManualRefresh) {
        final overallStatus = healthData.overallStatus;
        final databases = healthData.databases;

        // Compose status box and database cards in a single responsive row/wrap
        return Wrap(
          spacing: StyleConstants.cardSpacing,
          runSpacing: StyleConstants.cardRunSpacing,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            DashboardCard(
              width: 300,
              minWidth: 220,
              maxWidth: 340,
              child: HealthStatusBox(
                onRefresh: onManualRefresh,
                subtitle:
                    '${databases.length} ${databases.length == 1 ? 'database' : 'databases'}',
                isRefreshing: isRefreshing,
                child: ConnectionStatusBadge(
                  status: overallStatus,
                  label: StatusHelper.getHealthStatusLabel(overallStatus),
                ),
              ),
            ),
            if (databases.isEmpty)
              DashboardCard(
                width: 300,
                minWidth: 220,
                maxWidth: 340,
                child: EmptyState(
                  icon: Icons.storage_outlined,
                  title: 'No Databases',
                  message: 'No database health information available',
                ),
              )
            else
              ...databases.map((db) {
                return DashboardCard(
                  width: 300,
                  minWidth: 220,
                  maxWidth: 340,
                  child: DatabaseHealthCard(
                    databaseName: db.name,
                    status: db.status,
                    responseTime: db.responseTimeDuration,
                    connectionCount: db.connectionCount,
                    lastChecked: db.lastCheckedDateTime,
                    errorMessage: db.errorMessage,
                    showDetails: true,
                  ),
                );
              }),
          ],
        );
      },
    );
  }
}
