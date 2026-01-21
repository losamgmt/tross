import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

// Conditional import: use browser utils on web, stub on other platforms
import 'utils/browser_utils_stub.dart'
    if (dart.library.html) 'utils/browser_utils_web.dart';

import 'widgets/organisms/feedback/error_display.dart';
import 'providers/auth_provider.dart';
import 'providers/app_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/preferences_provider.dart';
import 'core/routing/app_routes.dart';
import 'core/routing/app_router.dart';
import 'config/constants.dart';
import 'config/app_theme_flex.dart';
import 'services/error_service.dart';
import 'services/permission_service_dynamic.dart';
import 'services/entity_metadata.dart';
import 'services/nav_config_loader.dart';
import 'services/api/api.dart';
import 'services/generic_entity_service.dart';
import 'services/preferences_service.dart';
import 'services/stats_service.dart';
import 'services/export_service.dart';
import 'services/file_service.dart';
import 'services/audit_log_service.dart';
import 'services/saved_view_service.dart';

void main() async {
  // Ensure Flutter bindings are initialized before async operations
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize data-driven permission system
  await PermissionService.initialize();

  // Initialize navigation config (loads from nav-config.json)
  await NavConfigService.initialize();

  // Initialize entity metadata registry (loads from entity-metadata.json)
  // This is the SSOT for all entity definitions, fields, and validation rules
  await EntityMetadataRegistry.instance.initialize();

  // ============================================================================
  // FLUTTER GLOBAL ERROR HANDLING
  // ============================================================================

  // Set up custom ErrorWidget for uncaught widget build errors
  // This is THE Flutter way - not "error boundaries" (that's React)
  ErrorWidget.builder = (FlutterErrorDetails details) {
    // In debug mode, show Flutter's default red error screen for debugging
    if (kDebugMode) {
      return ErrorWidget(details.exception);
    }

    // In production, show our custom error display with recovery actions
    return MaterialApp(
      theme: AppThemeConfig.lightTheme,
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: ErrorDisplay(
          errorCode: 'WIDGET_BUILD_ERROR',
          title: 'Something Went Wrong',
          description:
              'A component encountered an error. This has been logged and our team will investigate.',
          icon: Icons.bug_report_rounded,
          actionsBuilder: (_) => [
            ErrorAction(
              label: 'Restart App',
              icon: Icons.refresh_rounded,
              isPrimary: true,
              onPressed: (context) async {
                // For web: reload the page
                if (kIsWeb) {
                  BrowserUtils.reloadPage();
                } else {
                  // For native: navigate to login (closest to restart)
                  Navigator.of(
                    context,
                  ).pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
                }
              },
            ),
          ],
        ),
      ),
    );
  };

  // Catch all uncaught framework errors (async errors, etc.)
  FlutterError.onError = (FlutterErrorDetails details) {
    // Log to console in debug mode
    if (kDebugMode) {
      FlutterError.presentError(details);
    }

    // In production, you could send to error tracking service here
    // Example: Sentry.captureException(details.exception, stackTrace: details.stack);
  };

  // Catch async errors that escape the Flutter framework
  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorService.logError(
      'Uncaught async error',
      error: error,
      stackTrace: stack,
    );

    // In production, send to error tracking
    return true; // Mark as handled
  };

  // ============================================================================
  // APP INITIALIZATION
  // ============================================================================

  // Use path-based URLs instead of hash-based (#) for web routing
  // This allows Auth0 callback to work properly with /callback route
  usePathUrlStrategy();

  // Setup browser protections (web only)
  if (kIsWeb) {
    BrowserUtils.setupNavigationGuard(); // Prevent browser back/forward from breaking SPA
    // Optional: Uncomment to disable right-click in production
    // BrowserUtils.disableContextMenu();
  }

  runApp(const TrossApp());
}

/// Main application widget
///
/// Sets up providers and delegates routing to go_router.
/// Auth state changes trigger router refresh via [AuthProvider] as a Listenable.
class TrossApp extends StatelessWidget {
  const TrossApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Core services - ApiClient first, others depend on it
        Provider<ApiClient>(create: (_) => HttpApiClient()),
        ProxyProvider<ApiClient, GenericEntityService>(
          update: (_, apiClient, previous) => GenericEntityService(apiClient),
        ),
        ProxyProvider<ApiClient, PreferencesService>(
          update: (_, apiClient, previous) => PreferencesService(apiClient),
        ),
        ProxyProvider<ApiClient, StatsService>(
          update: (_, apiClient, previous) => StatsService(apiClient),
        ),
        ProxyProvider<ApiClient, ExportService>(
          update: (_, apiClient, previous) => ExportService(apiClient),
        ),
        ProxyProvider<ApiClient, FileService>(
          update: (_, apiClient, previous) => FileService(apiClient),
        ),
        ProxyProvider<ApiClient, AuditLogService>(
          update: (_, apiClient, previous) => AuditLogService(apiClient),
        ),
        // SavedViewService depends on GenericEntityService
        ProxyProvider<GenericEntityService, SavedViewService>(
          update: (_, entityService, previous) =>
              SavedViewService(entityService),
        ),
        // App state providers - AuthProvider needs ApiClient
        ChangeNotifierProvider(create: (context) => AppProvider()),
        ChangeNotifierProxyProvider<ApiClient, AuthProvider>(
          create: (context) => AuthProvider(context.read<ApiClient>()),
          update: (_, apiClient, authProvider) => authProvider!,
        ),
        ChangeNotifierProvider(create: (context) => PreferencesProvider()),
        ChangeNotifierProvider(create: (context) => DashboardProvider()),
      ],
      child: const _AppWithRouter(),
    );
  }
}

/// App with go_router configuration
///
/// Consumes auth and preferences providers to configure routing and theming.
/// go_router's redirect callback handles all auth-based navigation.
class _AppWithRouter extends StatefulWidget {
  const _AppWithRouter();

  @override
  State<_AppWithRouter> createState() => _AppWithRouterState();
}

class _AppWithRouterState extends State<_AppWithRouter> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    // Create router ONCE with auth provider
    // Router listens to auth changes via refreshListenable
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    _router = AppRouter.createRouter(authProvider);

    // Initialize providers after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeProviders();
    });
  }

  Future<void> _initializeProviders() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final appProvider = Provider.of<AppProvider>(context, listen: false);
    final preferencesProvider = Provider.of<PreferencesProvider>(
      context,
      listen: false,
    );
    final dashboardProvider = Provider.of<DashboardProvider>(
      context,
      listen: false,
    );
    final statsService = Provider.of<StatsService>(context, listen: false);
    final preferencesService = Provider.of<PreferencesService>(
      context,
      listen: false,
    );

    // Connect services to providers
    dashboardProvider.setStatsService(statsService);
    preferencesProvider.setPreferencesService(preferencesService);

    // Connect providers to auth - will auto-load on login and clear on logout
    preferencesProvider.connectToAuth(authProvider);
    dashboardProvider.connectToAuth(authProvider);

    // Initialize auth state (checks for stored session)
    // If session exists, this triggers auth state change → preferences load
    await authProvider.initialize();

    // Initialize app state (checks backend health)
    await appProvider.initialize();
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final preferencesProvider = Provider.of<PreferencesProvider>(context);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      routerConfig: _router,
      theme: AppThemeConfig.lightTheme,
      darkTheme: AppThemeConfig.darkTheme,
      themeMode: AppThemeConfig.getThemeMode(preferencesProvider.theme),
    );
  }
}
