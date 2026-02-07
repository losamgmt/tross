/// AdminHomeContent - System Operations Panels
///
/// Composes generic organisms to display admin operations panels.
/// Displays: Platform Health, Active Sessions, Maintenance Mode
///
/// **PATTERN:** Matches DashboardContent - dedicated content organism
/// **ZERO SPECIFICITY:** Uses only generic widgets (TitledCard, KeyValueList, etc.)
/// **SCREEN-AGNOSTIC:** Can be embedded in AdaptiveShell or any other container
///
/// All action handlers use callbacks passed from parent for refresh coordination.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/config.dart';
import '../../models/database_health.dart';
import '../../services/api/api_client.dart';
import '../../utils/helpers/date_time_helpers.dart';
import '../atoms/indicators/app_badge.dart';
import '../molecules/cards/error_card.dart';
import '../molecules/cards/titled_card.dart';
import '../molecules/containers/scrollable_content.dart';
import '../molecules/display/key_value_list.dart';
import 'providers/async_data_provider.dart';
import 'tables/data_table.dart';

/// Admin home content displaying system operations panels
class AdminHomeContent extends StatefulWidget {
  const AdminHomeContent({super.key});

  @override
  State<AdminHomeContent> createState() => _AdminHomeContentState();
}

class _AdminHomeContentState extends State<AdminHomeContent> {
  // Keys to force refresh
  final Key _healthKey = UniqueKey();
  Key _sessionsKey = UniqueKey();
  Key _maintenanceKey = UniqueKey();

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final apiClient = context.read<ApiClient>();

    return ScrollableContent(
      padding: EdgeInsets.all(spacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ════════════════════════════════════════════════════════════════
          // PANEL 1: Platform Health
          // ════════════════════════════════════════════════════════════════
          TitledCard(
            title: 'Platform Health',
            child: AsyncDataProvider<Map<String, dynamic>>(
              key: _healthKey,
              future: apiClient.get(ApiEndpoints.healthDatabases),
              builder: (context, data) {
                final databases = data['data']?['databases'] as List? ?? [];
                if (databases.isEmpty) {
                  return const Text('No database info available');
                }
                final db = databases[0] as Map<String, dynamic>;
                final status = HealthStatus.values.firstWhere(
                  (s) => s.name == (db['status'] as String?)?.toLowerCase(),
                  orElse: () => HealthStatus.unknown,
                );
                return KeyValueList(
                  items: [
                    KeyValueItem(
                      label: 'Status',
                      value: AppBadge(
                        label: status.label,
                        style: status.badgeStyle,
                        compact: true,
                      ),
                    ),
                    KeyValueItem(
                      label: 'Database',
                      value: Text(db['name'] ?? 'PostgreSQL'),
                    ),
                    KeyValueItem(
                      label: 'Response Time',
                      value: Text('${db['responseTime'] ?? '?'}ms'),
                    ),
                    KeyValueItem(
                      label: 'Pool Usage',
                      value: Text(db['poolUsage'] ?? '?'),
                    ),
                  ],
                );
              },
              errorBuilder: (error, retry) => ErrorCard(
                title: 'Health Check Failed',
                message: error.toString(),
              ),
            ),
          ),

          SizedBox(height: spacing.lg),

          // ════════════════════════════════════════════════════════════════
          // PANEL 2: Active Sessions
          // ════════════════════════════════════════════════════════════════
          TitledCard(
            title: 'Active Sessions',
            trailing: IconButton(
              icon: const Icon(Icons.refresh, size: 20),
              tooltip: 'Refresh Sessions',
              onPressed: () => setState(() => _sessionsKey = UniqueKey()),
            ),
            child: AsyncDataProvider<Map<String, dynamic>>(
              key: _sessionsKey,
              future: apiClient.get(ApiEndpoints.adminSessions),
              builder: (context, data) {
                final sessions = List<Map<String, dynamic>>.from(
                  data['data'] ?? [],
                );
                return AppDataTable<Map<String, dynamic>>(
                  data: sessions,
                  emptyMessage: 'No active sessions',
                  showCustomizationMenu: false,
                  autoSizeColumns: true,
                  pinnedColumns: 0, // Disable pinning for this small table
                  columns: [
                    TableColumn<Map<String, dynamic>>(
                      id: 'user',
                      label: 'User',
                      cellBuilder: (s) =>
                          Text(s['user']?['email'] ?? 'Unknown'),
                    ),
                    TableColumn<Map<String, dynamic>>(
                      id: 'role',
                      label: 'Role',
                      cellBuilder: (s) => Text(
                        (s['user']?['role'] ?? 'unknown')
                            .toString()
                            .toUpperCase(),
                      ),
                    ),
                    TableColumn<Map<String, dynamic>>(
                      id: 'lastActive',
                      label: 'Last Active',
                      cellBuilder: (s) => Text(
                        DateTimeHelpers.tryFormatRelativeTime(
                          s['lastUsedAt'] ?? s['loginTime'],
                        ),
                      ),
                    ),
                    TableColumn<Map<String, dynamic>>(
                      id: 'actions',
                      label: '',
                      cellBuilder: (s) => IconButton(
                        icon: const Icon(Icons.logout, size: 18),
                        tooltip: 'Force Logout',
                        onPressed: () => _confirmForceLogout(context, s),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          SizedBox(height: spacing.lg),

          // ════════════════════════════════════════════════════════════════
          // PANEL 3: Maintenance Mode
          // ════════════════════════════════════════════════════════════════
          TitledCard(
            title: 'Maintenance Mode',
            child: AsyncDataProvider<Map<String, dynamic>>(
              key: _maintenanceKey,
              future: apiClient.get(ApiEndpoints.adminMaintenance),
              builder: (context, data) => _MaintenancePanel(
                enabled: data['data']?['enabled'] ?? false,
                message: data['data']?['message'],
                onToggle: (enabled) async {
                  await apiClient.put(
                    ApiEndpoints.adminMaintenance,
                    body: {'enabled': enabled},
                  );
                  setState(() => _maintenanceKey = UniqueKey());
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Confirm and execute force logout
  Future<void> _confirmForceLogout(
    BuildContext context,
    Map<String, dynamic> session,
  ) async {
    final email = session['user']?['email'] ?? session['email'] ?? 'this user';
    final userId = session['userId'] ?? session['user_id'];

    if (userId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Force Logout'),
        content: Text(
          'This will suspend $email and terminate all their sessions. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            child: const Text('Force Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      try {
        final apiClient = context.read<ApiClient>();
        await apiClient.post(
          ApiEndpoints.adminForceLogout(userId as int),
          body: {},
        );
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$email has been logged out')));
          setState(() => _sessionsKey = UniqueKey());
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Failed to logout user: $e')));
        }
      }
    }
  }
}

/// Maintenance mode panel - uses standard Switch with labels
class _MaintenancePanel extends StatelessWidget {
  final bool enabled;
  final String? message;
  final Future<void> Function(bool) onToggle;

  const _MaintenancePanel({
    required this.enabled,
    this.message,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          title: const Text('Enable Maintenance Mode'),
          subtitle: const Text('Blocks all non-admin access to the system'),
          value: enabled,
          onChanged: onToggle,
          activeTrackColor: theme.colorScheme.error.withValues(alpha: 0.5),
          activeThumbColor: theme.colorScheme.error,
          contentPadding: EdgeInsets.zero,
        ),
        if (enabled && message != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Message: $message',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }
}
