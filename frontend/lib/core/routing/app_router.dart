/// Application Router Configuration
///
/// Uses go_router for declarative, type-safe routing with:
/// - Route guards for authentication
/// - Deep linking support
/// - Clean URL handling
/// - Redirect logic
///
/// Single Responsibility: Define all routes and navigation logic.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/login_screen.dart';
import '../../screens/home_screen.dart';
import '../../screens/admin_screen.dart';
import '../../screens/settings_screen.dart';
import '../../screens/entity_screen.dart';
import '../../screens/entity_detail_screen.dart';
import '../../widgets/organisms/feedback/error_display.dart';
import '../../widgets/organisms/feedback/under_construction_display.dart';
import '../../widgets/organisms/dashboards/db_health_dashboard.dart';
import '../../widgets/organisms/layout/tabbed_container.dart';
import '../../widgets/templates/templates.dart';
import '../../services/entity_metadata.dart';
import '../../services/auth/token_manager.dart';
import '../../services/metadata/metadata.dart';
import '../../services/audit_log_service.dart';
import '../../models/audit_log_entry.dart';
import '../../widgets/molecules/display/data_matrix.dart';
import '../../widgets/molecules/display/key_value_list.dart';
import '../../widgets/organisms/providers/async_data_provider.dart';
import '../../widgets/organisms/tables/data_table.dart';
import '../../config/config.dart';
import 'app_routes.dart';
import 'route_guard.dart';

/// Global navigator key for accessing navigation from anywhere
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// Application router configuration
class AppRouter {
  AppRouter._();

  /// Create the router with auth provider for guards
  static GoRouter createRouter(AuthProvider authProvider) {
    return GoRouter(
      navigatorKey: rootNavigatorKey,
      initialLocation: AppRoutes.root,
      debugLogDiagnostics: true,

      // Refresh when auth state changes
      refreshListenable: authProvider,

      // Global redirect logic
      redirect: (context, state) {
        final isAuthenticated = authProvider.isAuthenticated;
        final isLoading = authProvider.isLoading;
        final isRedirecting = authProvider.isRedirecting;
        final currentPath = state.matchedLocation;
        final user = authProvider.user;

        // Don't redirect while loading or during Auth0 redirect
        if (isLoading || isRedirecting) {
          return null;
        }

        // ══════════════════════════════════════════════════════════════════
        // CENTRALIZED ROUTE GUARD - Single source of truth for access control
        // Handles: public routes, auth required, admin required
        // ══════════════════════════════════════════════════════════════════
        final guardResult = RouteGuard.checkAccess(
          route: currentPath,
          isAuthenticated: isAuthenticated,
          user: user,
        );

        if (!guardResult.canAccess) {
          return guardResult.redirectRoute;
        }

        // ══════════════════════════════════════════════════════════════════
        // CONVENIENCE REDIRECTS (not security - just UX)
        // ══════════════════════════════════════════════════════════════════

        // If authenticated and on login page, redirect to home
        if (isAuthenticated && currentPath == AppRoutes.login) {
          return AppRoutes.home;
        }

        // If authenticated and on root, redirect to home
        if (isAuthenticated && currentPath == AppRoutes.root) {
          return AppRoutes.home;
        }

        // If NOT authenticated and on root, redirect to login
        // (root shows blank _AuthWrapper, so we need explicit redirect)
        if (!isAuthenticated && currentPath == AppRoutes.root) {
          return AppRoutes.login;
        }

        // No redirect needed
        return null;
      },

      // Route definitions
      routes: [
        // Root route - shows auth wrapper
        GoRoute(
          path: AppRoutes.root,
          name: 'root',
          builder: (context, state) => const _AuthWrapper(),
        ),

        // Login
        GoRoute(
          path: AppRoutes.login,
          name: 'login',
          pageBuilder: (context, state) => CustomTransitionPage(
            key: state.pageKey,
            child: const LoginScreen(),
            transitionsBuilder: _fadeTransition,
          ),
        ),

        // Auth0 callback
        GoRoute(
          path: AppRoutes.callback,
          name: 'callback',
          builder: (context, state) => const _Auth0CallbackHandler(),
        ),

        // Home/Dashboard
        GoRoute(
          path: AppRoutes.home,
          name: 'home',
          pageBuilder: (context, state) => CustomTransitionPage(
            key: state.pageKey,
            child: const HomeScreen(),
            transitionsBuilder: _slideTransition,
          ),
        ),

        // Admin - Home, Logs (under /system/ for collision-avoidance), Entity settings
        GoRoute(
          path: AppRoutes.admin,
          name: 'admin',
          pageBuilder: (context, state) => CustomTransitionPage(
            key: state.pageKey,
            child: const AdminScreen(),
            transitionsBuilder: _slideTransition,
          ),
          routes: [
            // ══════════════════════════════════════════════════════════════
            // SYSTEM ROUTES - Defined FIRST to avoid :entity catch-all
            // Uses /system/ prefix for collision-avoidance (mirrors backend)
            // ══════════════════════════════════════════════════════════════

            // System Health - Composes DbHealthDashboard organism
            GoRoute(
              path: 'system/health',
              name: 'adminHealth',
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: _AdminHealthScreen(),
                transitionsBuilder: _slideTransition,
              ),
            ),

            // System Logs - Composes TabbedPage with audit log tables
            GoRoute(
              path: 'system/logs',
              name: 'adminLogs',
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: _AdminLogsScreen(
                  activeTab: state.uri.queryParameters['tab'] ?? 'data',
                ),
                transitionsBuilder: _slideTransition,
              ),
            ),

            // System Files - File attachments viewer (placeholder)
            GoRoute(
              path: 'system/files',
              name: 'adminFiles',
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: const _AdminFilesScreen(),
                transitionsBuilder: _slideTransition,
              ),
            ),

            // ══════════════════════════════════════════════════════════════
            // ENTITY ROUTES - Catch-all LAST (entity metadata/settings)
            // ══════════════════════════════════════════════════════════════
            GoRoute(
              path: ':entity',
              name: 'adminEntity',
              pageBuilder: (context, state) {
                final entity = state.pathParameters['entity'] ?? 'unknown';
                return CustomTransitionPage(
                  key: state.pageKey,
                  child: _AdminEntityScreen(entityName: entity),
                  transitionsBuilder: _slideTransition,
                );
              },
            ),
          ],
        ),

        // Settings
        GoRoute(
          path: AppRoutes.settings,
          name: 'settings',
          pageBuilder: (context, state) => CustomTransitionPage(
            key: state.pageKey,
            child: const SettingsScreen(),
            transitionsBuilder: _slideTransition,
          ),
        ),

        // ════════════════════════════════════════════════════════════════════
        // GENERIC ENTITY ROUTES - ONE route handles ALL entities
        // Entities sit directly under root, matching backend /api/:entity
        // MUST be defined AFTER specific routes (/home, /settings, /admin)
        // GoRouter matches in definition order, so specific routes win
        // ════════════════════════════════════════════════════════════════════

        // Entity list: /:entityName (e.g., /customers, /work_orders, /users)
        GoRoute(
          path: '/:entityName',
          name: 'entityList',
          pageBuilder: (context, state) {
            final entityName = state.pathParameters['entityName'] ?? 'user';
            return CustomTransitionPage(
              key: state.pageKey,
              child: EntityScreen(entityName: entityName),
              transitionsBuilder: _slideTransition,
            );
          },
          routes: [
            // Entity detail: /:entityName/:id (e.g., /customers/42)
            GoRoute(
              path: ':id',
              name: 'entityDetail',
              pageBuilder: (context, state) {
                final entityName = state.pathParameters['entityName'] ?? 'user';
                final idString = state.pathParameters['id'] ?? '0';
                final id = int.tryParse(idString) ?? 0;
                return CustomTransitionPage(
                  key: state.pageKey,
                  child: EntityDetailScreen(
                    entityName: entityName,
                    entityId: id,
                  ),
                  transitionsBuilder: _slideTransition,
                );
              },
            ),
          ],
        ),

        // Error routes
        GoRoute(
          path: AppRoutes.unauthorized,
          name: 'unauthorized',
          builder: (context, state) => ErrorDisplay.unauthorized(),
        ),

        GoRoute(
          path: AppRoutes.notFound,
          name: 'notFound',
          builder: (context, state) => ErrorDisplay.notFound(
            requestedPath: state.extra as String? ?? state.matchedLocation,
          ),
        ),

        GoRoute(
          path: AppRoutes.error,
          name: 'error',
          builder: (context, state) => ErrorDisplay.error(),
        ),
      ],

      // 404 handler
      errorBuilder: (context, state) =>
          ErrorDisplay.notFound(requestedPath: state.matchedLocation),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSITION BUILDERS
  // ══════════════════════════════════════════════════════════════════════════

  /// Fade transition for auth-related routes
  static Widget _fadeTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(opacity: animation, child: child);
  }

  /// Slide transition for main app routes
  static Widget _slideTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    const begin = Offset(0.02, 0.0);
    const end = Offset.zero;
    final tween = Tween(
      begin: begin,
      end: end,
    ).chain(CurveTween(curve: Curves.easeOutCubic));

    return SlideTransition(
      position: animation.drive(tween),
      child: FadeTransition(opacity: animation, child: child),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRIVATE ROUTE WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

/// Auth wrapper - shows loading while checking auth state
class _AuthWrapper extends StatefulWidget {
  const _AuthWrapper();

  @override
  State<_AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<_AuthWrapper> {
  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoading || authProvider.isRedirecting) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Initializing...'),
                ],
              ),
            ),
          );
        }

        // Router redirect will handle navigation
        return const SizedBox.shrink();
      },
    );
  }
}

/// Auth0 callback handler
class _Auth0CallbackHandler extends StatefulWidget {
  const _Auth0CallbackHandler();

  @override
  State<_Auth0CallbackHandler> createState() => _Auth0CallbackHandlerState();
}

class _Auth0CallbackHandlerState extends State<_Auth0CallbackHandler> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleCallback();
    });
  }

  Future<void> _handleCallback() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.handleAuth0Callback();

    if (mounted) {
      if (success) {
        context.go(AppRoutes.home);
      } else {
        context.go(AppRoutes.login);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Completing login...'),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTE COMPOSITIONS - Pure composition of generic components
// ══════════════════════════════════════════════════════════════════════════════

/// Admin Health Screen - Composes DbHealthDashboard organism
///
/// ZERO SPECIFICITY: Uses generic DbHealthDashboard organism.
/// Specificity is injecting the service configuration.
class _AdminHealthScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AdaptiveShell(
      currentRoute: '/admin/system/health',
      pageTitle: 'System Health',
      sidebarStrategy: 'admin',
      body: FutureBuilder<String?>(
        future: TokenManager.getStoredToken(),
        builder: (context, snapshot) {
          if (!snapshot.hasData || snapshot.data == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return DbHealthDashboard.api(
            apiBaseUrl: AppConfig.backendUrl,
            authToken: snapshot.data!,
            autoRefresh: true,
          );
        },
      ),
    );
  }
}

/// Admin Logs Screen - Composes TabbedPage with audit data
///
/// ZERO SPECIFICITY: Uses generic TabbedPage template.
/// Tab content uses generic table + async provider.
class _AdminLogsScreen extends StatelessWidget {
  final String activeTab;

  const _AdminLogsScreen({required this.activeTab});

  @override
  Widget build(BuildContext context) {
    return AdaptiveShell(
      currentRoute: '/admin/system/logs',
      pageTitle: 'System Logs',
      sidebarStrategy: 'admin',
      body: TabbedPage(
        currentTabId: activeTab,
        baseRoute: '/admin/system/logs',
        tabs: const [
          TabDefinition(
            id: 'data',
            label: 'Data Changes',
            icon: Icons.storage_outlined,
          ),
          TabDefinition(
            id: 'auth',
            label: 'Auth Events',
            icon: Icons.security_outlined,
          ),
        ],
        contentBuilder: (tabId) {
          final auditLogService = context.read<AuditLogService>();
          return AsyncDataProvider<AuditLogResult>(
            future: auditLogService.getAllLogs(filter: tabId),
            builder: (context, result) => AppDataTable<AuditLogEntry>(
              data: result.logs,
              columns: [
                TableColumn<AuditLogEntry>(
                  id: 'timestamp',
                  label: 'Time',
                  cellBuilder: (log) => Text(
                    _formatTimestamp(log.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                TableColumn<AuditLogEntry>(
                  id: 'user',
                  label: 'User',
                  cellBuilder: (log) => Text(log.userDisplayName),
                ),
                TableColumn<AuditLogEntry>(
                  id: 'action',
                  label: 'Action',
                  cellBuilder: (log) => _ActionChip(action: log.action),
                ),
                TableColumn<AuditLogEntry>(
                  id: 'resource',
                  label: 'Resource',
                  cellBuilder: (log) => Text(
                    '${log.resourceType}/${log.resourceId}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                TableColumn<AuditLogEntry>(
                  id: 'result',
                  label: 'Result',
                  cellBuilder: (log) => _ResultBadge(result: log.result),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Format timestamp for audit log display
String _formatTimestamp(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  return '${dt.month}/${dt.day} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
}

/// Action chip with color coding based on action type
class _ActionChip extends StatelessWidget {
  final String action;

  const _ActionChip({required this.action});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (action.toLowerCase()) {
      'create' => (Colors.green, Icons.add_circle_outline),
      'update' => (Colors.blue, Icons.edit_outlined),
      'delete' => (Colors.red, Icons.remove_circle_outline),
      'login' => (Colors.teal, Icons.login),
      'logout' => (Colors.orange, Icons.logout),
      _ => (Colors.grey, Icons.info_outline),
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          action,
          style: TextStyle(color: color, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

/// Result badge showing success/failure based on result string
class _ResultBadge extends StatelessWidget {
  final String? result;

  const _ResultBadge({required this.result});

  @override
  Widget build(BuildContext context) {
    final isSuccess = result == 'success' || result == null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isSuccess
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        isSuccess ? 'OK' : 'FAIL',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isSuccess ? Colors.green : Colors.red,
        ),
      ),
    );
  }
}

/// Admin Files Screen - Tabbed interface for file attachments & R2 storage
///
/// Four tabs for comprehensive file management:
/// - Files: Entity CRUD operations (daily use)
/// - Storage: R2 statistics and usage monitoring (weekly review)
/// - Maintenance: Orphan detection, cleanup utilities (admin tasks)
/// - Settings: R2 configuration (setup/rare changes)
class _AdminFilesScreen extends StatelessWidget {
  const _AdminFilesScreen();

  @override
  Widget build(BuildContext context) {
    return AdaptiveShell(
      currentRoute: '/admin/system/files',
      pageTitle: 'File Attachments',
      sidebarStrategy: 'admin',
      body: TabbedContainer(
        tabs: [
          TabConfig(
            label: 'Files',
            icon: Icons.description_outlined,
            tabKey: const Key('files-tab'),
            content: const UnderConstructionDisplay(
              title: 'File Browser',
              message:
                  'Browse, search, and manage file attachments. '
                  'View file metadata, download files, and manage associations.',
              icon: Icons.folder_open_outlined,
            ),
          ),
          TabConfig(
            label: 'Storage',
            icon: Icons.cloud_outlined,
            tabKey: const Key('storage-tab'),
            content: const UnderConstructionDisplay(
              title: 'R2 Storage Statistics',
              message:
                  'Monitor Cloudflare R2 storage usage, bandwidth, and costs. '
                  'View storage trends and capacity planning metrics.',
              icon: Icons.analytics_outlined,
            ),
          ),
          TabConfig(
            label: 'Maintenance',
            icon: Icons.build_outlined,
            tabKey: const Key('maintenance-tab'),
            content: const UnderConstructionDisplay(
              title: 'File Maintenance',
              message:
                  'Detect orphaned files, run cleanup utilities, and verify '
                  'file integrity. Schedule automated maintenance tasks.',
              icon: Icons.cleaning_services_outlined,
            ),
          ),
          TabConfig(
            label: 'Settings',
            icon: Icons.settings_outlined,
            tabKey: const Key('settings-tab'),
            content: const UnderConstructionDisplay(
              title: 'R2 Configuration',
              message:
                  'Configure Cloudflare R2 connection settings, access keys, '
                  'bucket policies, and lifecycle rules.',
              icon: Icons.tune_outlined,
            ),
          ),
        ],
      ),
    );
  }
}

/// Admin Entity Screen - Shows entity configuration
///
/// ZERO SPECIFICITY: Uses generic components for any entity.
/// Displays permissions, validation rules, metadata using DataMatrix/KeyValueList.
class _AdminEntityScreen extends StatelessWidget {
  final String entityName;

  const _AdminEntityScreen({required this.entityName});

  @override
  Widget build(BuildContext context) {
    final displayName = EntityMetadata.toDisplayName(entityName);

    return AdaptiveShell(
      currentRoute: '/admin/$entityName',
      pageTitle: '$displayName Settings',
      sidebarStrategy: 'admin',
      body: TabbedContainer(
        tabs: [
          TabConfig(
            label: 'Permissions',
            icon: Icons.lock,
            content: _PermissionsTab(entityName: entityName),
          ),
          TabConfig(
            label: 'Validation',
            icon: Icons.rule,
            content: _ValidationTab(entityName: entityName),
          ),
        ],
      ),
    );
  }
}

/// Permissions tab content - displays role × operation matrix
class _PermissionsTab extends StatelessWidget {
  final String entityName;
  static final _provider = JsonMetadataProvider();

  const _PermissionsTab({required this.entityName});

  @override
  Widget build(BuildContext context) {
    // Get the permission resource name from entity metadata
    // Entity metadata uses singular names (user, work_order)
    // Permissions.json uses rlsResource names (users, work_orders)
    final metadata = EntityMetadataRegistry.tryGet(entityName);
    final permissionResource =
        metadata?.rlsResource.toBackendString() ?? entityName;

    return AsyncDataProvider<PermissionMatrix?>(
      future: _provider.getPermissionMatrix(permissionResource),
      builder: (context, matrix) {
        if (matrix == null) {
          return Center(
            child: Text('No permissions configured for $entityName'),
          );
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: DataMatrix(
            columnHeaders: matrix.operations.map(_formatHeader).toList(),
            rows: matrix.roles.map((role) {
              return DataMatrixRow(
                header: _formatHeader(role),
                cells: matrix.operations
                    .map((op) => matrix.hasPermission(role, op))
                    .toList(),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  static String _formatHeader(String raw) {
    return raw
        .split('_')
        .map(
          (w) => w.isNotEmpty
              ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
              : '',
        )
        .join(' ');
  }
}

/// Validation tab content - displays field validation rules
class _ValidationTab extends StatelessWidget {
  final String entityName;
  static final _provider = JsonMetadataProvider();

  const _ValidationTab({required this.entityName});

  @override
  Widget build(BuildContext context) {
    return AsyncDataProvider<EntityValidationRules?>(
      future: _provider.getEntityValidationRules(entityName),
      builder: (context, rules) {
        if (rules == null || rules.fields.isEmpty) {
          return Center(
            child: Text('No validation rules configured for $entityName'),
          );
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: KeyValueList(
            items: rules.fields.entries.map((entry) {
              final field = entry.value;
              return KeyValueItem.text(
                label: _formatHeader(entry.key),
                value: _formatValidationSummary(field),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  static String _formatHeader(String raw) {
    return raw
        .split('_')
        .map(
          (w) => w.isNotEmpty
              ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
              : '',
        )
        .join(' ');
  }

  static String _formatValidationSummary(FieldValidation field) {
    final parts = <String>[];
    parts.add(field.type);
    if (field.required) parts.add('required');
    if (field.minLength != null) parts.add('min: ${field.minLength}');
    if (field.maxLength != null) parts.add('max: ${field.maxLength}');
    if (field.pattern != null) parts.add('pattern');
    return parts.join(' • ');
  }
}
