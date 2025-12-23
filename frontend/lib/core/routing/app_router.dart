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
import '../../widgets/molecules/molecules.dart';
import '../../widgets/templates/templates.dart';
import '../../config/app_spacing.dart';
import '../../services/entity_metadata.dart';
import '../../services/entity_settings_service.dart' as settings_svc;
import '../../services/auth/auth_profile_service.dart';
import 'app_routes.dart';

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

        // Use metadata-driven public route check
        final isPublicRoute = AppRoutes.isPublicPath(currentPath);

        // If not authenticated and trying to access protected route
        if (!isAuthenticated && !isPublicRoute) {
          return AppRoutes.login;
        }

        // If authenticated and on login page, redirect to home
        if (isAuthenticated && currentPath == AppRoutes.login) {
          return AppRoutes.home;
        }

        // If authenticated and on root, redirect to home
        if (isAuthenticated && currentPath == AppRoutes.root) {
          return AppRoutes.home;
        }

        // If NOT authenticated and on root, redirect to login
        if (!isAuthenticated && currentPath == AppRoutes.root) {
          return AppRoutes.login;
        }

        // Admin route guard
        if (currentPath == AppRoutes.admin) {
          if (!AuthProfileService.isAdmin(user)) {
            return AppRoutes.unauthorized;
          }
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

        // Admin - with entity settings and catch-all for unimplemented sections
        GoRoute(
          path: AppRoutes.admin,
          name: 'admin',
          pageBuilder: (context, state) => CustomTransitionPage(
            key: state.pageKey,
            child: const AdminScreen(),
            transitionsBuilder: _slideTransition,
          ),
          routes: [
            // Admin entity settings: /admin/entity/:entityName
            // Shows entity-specific settings driven by metadata
            GoRoute(
              path: 'entity/:entityName',
              name: 'adminEntitySettings',
              pageBuilder: (context, state) {
                final entityName = state.pathParameters['entityName'] ?? 'user';
                return CustomTransitionPage(
                  key: state.pageKey,
                  child: _AdminEntitySettingsScreen(entityName: entityName),
                  transitionsBuilder: _slideTransition,
                );
              },
            ),
            // Catch-all for admin sub-routes (security, platform, system, etc.)
            // Shows "Under Construction" for any unimplemented admin feature
            GoRoute(
              path: ':section',
              name: 'adminSection',
              pageBuilder: (context, state) {
                final section = state.pathParameters['section'] ?? 'unknown';
                return CustomTransitionPage(
                  key: state.pageKey,
                  child: _AdminSectionScreen(section: section),
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
        // ════════════════════════════════════════════════════════════════════

        // Entity list: /entity/:entityName (e.g., /entity/users, /entity/customers)
        GoRoute(
          path: '/entity/:entityName',
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
            // Entity detail: /entity/:entityName/:id (e.g., /entity/users/42)
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
// ADMIN SECTION PLACEHOLDER
// ══════════════════════════════════════════════════════════════════════════════

/// Placeholder for unimplemented admin sections
///
/// This is NOT a special "under construction screen" - it's just a normal
/// page that composes AdaptiveShell with UnderConstructionDisplay as body.
/// When we implement the actual feature, we replace the body widget.
///
/// Pure composition: AdaptiveShell + UnderConstructionDisplay
class _AdminSectionScreen extends StatelessWidget {
  final String section;

  const _AdminSectionScreen({required this.section});

  @override
  Widget build(BuildContext context) {
    final sectionTitle = EntityMetadata.toDisplayName(section);

    return AdaptiveShell(
      currentRoute: '/admin/$section',
      pageTitle: sectionTitle,
      sidebarStrategy: 'admin',
      body: UnderConstructionDisplay(
        title: '$sectionTitle Settings',
        message: '$sectionTitle configuration is coming soon!',
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ENTITY SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

/// Admin entity settings view
///
/// Displays entity-specific SETTINGS (configuration), NOT data.
/// This is distinct from EntityScreen which shows entity DATA (records).
///
/// - `/entity/customer` → EntityScreen (list of customer records)
/// - `/admin/entity/customer` → This screen (customer entity configuration)
///
/// Settings are metadata-driven using generic SettingRow molecules.
/// Composes: TitledCard, SettingDropdownRow, SettingNumberRow
class _AdminEntitySettingsScreen extends StatefulWidget {
  final String entityName;

  const _AdminEntitySettingsScreen({required this.entityName});

  @override
  State<_AdminEntitySettingsScreen> createState() =>
      _AdminEntitySettingsScreenState();
}

class _AdminEntitySettingsScreenState
    extends State<_AdminEntitySettingsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  bool _hasChanges = false;

  // Editable state
  String? _sortField;
  String _sortDirection = 'asc';
  List<String> _selectedColumns = [];
  String _density = 'standard';
  int _pageSize = 25;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void didUpdateWidget(_AdminEntitySettingsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entityName != widget.entityName) {
      _loadSettings();
    }
  }

  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final settings = await settings_svc.EntitySettingsService.getForEntity(
        widget.entityName,
      );
      final metadata = EntityMetadataRegistry.tryGet(widget.entityName);

      setState(() {
        _sortField = settings.defaultSort?.field ?? metadata?.defaultSort.field;
        _sortDirection =
            settings.defaultSort?.direction ??
            metadata?.defaultSort.order.toLowerCase() ??
            'asc';
        _selectedColumns =
            settings.defaultColumns ?? metadata?.filterableFields ?? [];
        _density = settings.defaultDensity ?? 'standard';
        _pageSize = settings.defaultPageSize ?? 25;
        _isLoading = false;
        _hasChanges = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load settings: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final newSettings = settings_svc.EntitySettingsConfig(
        defaultSort: _sortField != null
            ? settings_svc.SortConfig(
                field: _sortField!,
                direction: _sortDirection,
              )
            : null,
        defaultColumns: _selectedColumns.isNotEmpty ? _selectedColumns : null,
        defaultDensity: _density,
        defaultPageSize: _pageSize,
      );

      await settings_svc.EntitySettingsService.save(
        entityName: widget.entityName,
        settings: newSettings,
      );

      setState(() {
        _isSaving = false;
        _hasChanges = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to save settings: $e';
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final metadata = EntityMetadataRegistry.tryGet(widget.entityName);
    final displayName =
        metadata?.displayName ??
        EntityMetadata.toDisplayName(widget.entityName);
    final spacing = context.spacing;

    // Get available fields from metadata
    final availableFields = metadata?.sortableFields ?? [];
    final allFields = metadata?.filterableFields ?? [];

    return AdaptiveShell(
      currentRoute: '/admin/entity/${widget.entityName}',
      pageTitle: '$displayName Settings',
      sidebarStrategy: 'admin',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: spacing.paddingXL,
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Error display
                      if (_error != null)
                        Padding(
                          padding: EdgeInsets.only(bottom: spacing.lg),
                          child: ErrorMessage(
                            title: 'Error',
                            description: _error!,
                          ),
                        ),

                      // Display Settings Card
                      TitledCard(
                        title: 'Display Settings',
                        child: Column(
                          children: [
                            // Default Sort Field
                            SettingDropdownRow<String?>(
                              label: 'Default Sort Field',
                              description:
                                  'Column used for initial table sorting',
                              value: _sortField,
                              items: [null, ...availableFields],
                              displayText: (field) => field == null
                                  ? '(None)'
                                  : _fieldDisplayName(field),
                              onChanged: (value) {
                                setState(() {
                                  _sortField = value;
                                  _hasChanges = true;
                                });
                              },
                              enabled: !_isSaving,
                            ),

                            SizedBox(height: spacing.md),

                            // Sort Direction
                            SettingDropdownRow<String>(
                              label: 'Sort Direction',
                              description: 'Ascending or descending order',
                              value: _sortDirection,
                              items: const ['asc', 'desc'],
                              displayText: (dir) =>
                                  dir == 'asc' ? 'Ascending' : 'Descending',
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _sortDirection = value;
                                    _hasChanges = true;
                                  });
                                }
                              },
                              enabled: !_isSaving,
                            ),

                            SizedBox(height: spacing.md),

                            // Table Density
                            SettingDropdownRow<String>(
                              label: 'Table Density',
                              description: 'Row spacing in data tables',
                              value: _density,
                              items: const [
                                'compact',
                                'standard',
                                'comfortable',
                              ],
                              displayText: (d) =>
                                  d[0].toUpperCase() + d.substring(1),
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _density = value;
                                    _hasChanges = true;
                                  });
                                }
                              },
                              enabled: !_isSaving,
                            ),

                            SizedBox(height: spacing.md),

                            // Page Size
                            SettingDropdownRow<int>(
                              label: 'Default Page Size',
                              description: 'Number of records per page',
                              value: _pageSize,
                              items: const [10, 25, 50, 100],
                              displayText: (size) => '$size records',
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _pageSize = value;
                                    _hasChanges = true;
                                  });
                                }
                              },
                              enabled: !_isSaving,
                            ),
                          ],
                        ),
                      ),

                      SizedBox(height: spacing.xl),

                      // Visible Columns Card
                      TitledCard(
                        title: 'Default Columns',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Select which columns are visible by default',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            SizedBox(height: spacing.md),
                            Wrap(
                              spacing: spacing.sm,
                              runSpacing: spacing.sm,
                              children: allFields.map((field) {
                                final isSelected = _selectedColumns.contains(
                                  field,
                                );
                                return FilterChip(
                                  label: Text(_fieldDisplayName(field)),
                                  selected: isSelected,
                                  onSelected: _isSaving
                                      ? null
                                      : (selected) {
                                          setState(() {
                                            if (selected) {
                                              _selectedColumns.add(field);
                                            } else {
                                              _selectedColumns.remove(field);
                                            }
                                            _hasChanges = true;
                                          });
                                        },
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),

                      SizedBox(height: spacing.xl),

                      // Save Button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton(
                            onPressed: _hasChanges && !_isSaving
                                ? _loadSettings
                                : null,
                            child: const Text('Reset'),
                          ),
                          SizedBox(width: spacing.md),
                          FilledButton(
                            onPressed: _hasChanges && !_isSaving
                                ? _saveSettings
                                : null,
                            child: _isSaving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Save Settings'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  /// Convert field_name to "Field Name"
  String _fieldDisplayName(String field) {
    return field
        .split('_')
        .map(
          (word) =>
              word.isEmpty ? '' : word[0].toUpperCase() + word.substring(1),
        )
        .join(' ');
  }
}
