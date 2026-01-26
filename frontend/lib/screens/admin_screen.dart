/// Admin Screen - System Operations Dashboard
///
/// Composes generic templates to create operations center.
/// Displays: Platform Health, Active Sessions, Maintenance Mode
///
/// **ZERO SPECIFICITY**: No admin-specific widgets.
/// All specificity lives here in route composition.
///
/// Sidebar navigation uses 'admin' strategy from nav-config.json.
/// Security: Requires admin role (enforced by router guard)
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/config.dart';
import '../core/routing/app_routes.dart';
import '../services/api/api_client.dart';
import '../services/auth/token_manager.dart';
import '../widgets/atoms/indicators/loading_indicator.dart';
import '../widgets/molecules/cards/error_card.dart';
import '../widgets/molecules/cards/titled_card.dart';
import '../widgets/molecules/display/key_value_list.dart';
import '../widgets/organisms/providers/async_data_provider.dart';
import '../widgets/organisms/tables/data_table.dart';
import '../widgets/templates/templates.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  // Keys to force refresh
  // ignore: prefer_final_fields - kept for future refresh capability
  final Key _healthKey = UniqueKey();
  Key _sessionsKey = UniqueKey();
  Key _maintenanceKey = UniqueKey();

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final apiClient = context.read<ApiClient>();

    return AdaptiveShell(
      currentRoute: AppRoutes.admin,
      pageTitle: 'System Administration',
      sidebarStrategy: 'admin',
      body: SingleChildScrollView(
        padding: EdgeInsets.all(spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Health + Sessions (responsive wrap)
            Wrap(
              spacing: spacing.md,
              runSpacing: spacing.md,
              children: [
                // ══════════════════════════════════════════════════════════════
                // PANEL 1: Platform Health (KeyValueList for simple display)
                // ══════════════════════════════════════════════════════════════
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    minWidth: 280,
                    maxWidth: 340,
                  ),
                  child: TitledCard(
                    title: 'Platform Health',
                    child: FutureBuilder<String?>(
                      key: _healthKey,
                      future: TokenManager.getStoredToken(),
                      builder: (context, tokenSnap) {
                        if (!tokenSnap.hasData || tokenSnap.data == null) {
                          return const LoadingIndicator.inline();
                        }
                        return AsyncDataProvider<Map<String, dynamic>>(
                          future: apiClient.get(
                            '/health/databases',
                            token: tokenSnap.data,
                          ),
                          builder: (context, data) {
                            final databases =
                                data['data']?['databases'] as List? ?? [];
                            if (databases.isEmpty) {
                              return const Text('No database info available');
                            }
                            final db = databases[0] as Map<String, dynamic>;
                            return KeyValueList(
                              items: [
                                KeyValueItem(
                                  label: 'Status',
                                  value: _HealthBadge(
                                    status: db['status'] ?? 'unknown',
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
                        );
                      },
                    ),
                  ),
                ),

                // ══════════════════════════════════════════════════════════════
                // PANEL 2: Active Sessions (AppDataTable)
                // ══════════════════════════════════════════════════════════════
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    minWidth: 400,
                    maxWidth: 600,
                  ),
                  child: TitledCard(
                    title: 'Active Sessions',
                    trailing: IconButton(
                      icon: const Icon(Icons.refresh, size: 20),
                      tooltip: 'Refresh Sessions',
                      onPressed: () =>
                          setState(() => _sessionsKey = UniqueKey()),
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
                          showCustomizationMenu: false, // Title in TitledCard
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
                                _formatLastActive(
                                  // Prefer lastUsedAt, fallback to loginTime
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
                                onPressed: () =>
                                    _confirmForceLogout(context, s),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),

            spacing.gapLG,

            // ══════════════════════════════════════════════════════════════
            // PANEL 3: Maintenance Mode (at bottom)
            // ══════════════════════════════════════════════════════════════
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 280, maxWidth: 400),
              child: TitledCard(
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
            ),
          ],
        ),
      ),
    );
  }

  String _formatLastActive(dynamic timestamp) {
    if (timestamp == null) return 'Unknown';
    try {
      final dt = DateTime.parse(timestamp.toString());
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Unknown';
    }
  }

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

/// Health status badge with color coding
class _HealthBadge extends StatelessWidget {
  final String status;

  const _HealthBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status.toLowerCase()) {
      'healthy' => Colors.green,
      'degraded' => Colors.orange,
      'critical' => Colors.red,
      _ => Colors.grey,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
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
