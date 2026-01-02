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
import '../../widgets/templates/templates.dart';
import '../../services/entity_metadata.dart';
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
            GoRoute(
              path: 'system/logs',
              name: 'adminLogs',
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: _AdminSectionScreen(section: 'logs'),
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
                  child: _AdminSectionScreen(section: entity),
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
