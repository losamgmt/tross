import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:provider/provider.dart';
// Conditional import: use browser utils on web, stub on other platforms
import 'utils/browser_utils_stub.dart'
    if (dart.library.html) 'utils/browser_utils_web.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/admin/admin_dashboard.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/settings/labor_settings_screen.dart';
import 'screens/settings/pricebooks_settings_screen.dart';
import 'screens/settings/project_settings_screen.dart';
import 'screens/settings/quote_settings_screen.dart';
import 'screens/settings/mobile_settings_screen.dart';
import 'screens/settings/dispatch_settings_screen.dart';
import 'screens/settings/service_agreement_settings_screen.dart';
import 'screens/settings/job_settings_screen.dart';
import 'screens/settings/item_list_settings_screen.dart';
import 'screens/settings/forms_settings_screen.dart';
import 'screens/settings/invoice_settings_screen.dart';
import 'screens/settings/accounting_settings_screen.dart';
import 'screens/equipment/equipment_assets_screen.dart';
import 'widgets/organisms/error_display.dart';
import 'widgets/molecules/buttons/error_action_compat.dart';
import 'providers/auth_provider.dart';
import 'providers/app_provider.dart';
import 'core/routing/app_routes.dart';
import 'core/routing/route_guard.dart';
import 'config/constants.dart';
import 'config/app_theme.dart';
import 'services/error_service.dart';
import 'services/permission_service_dynamic.dart';
import 'config/validation_rules.dart';

void main() async {
  // Ensure Flutter bindings are initialized before async operations
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize data-driven permission system
  await PermissionService.initialize();

  // Initialize centralized validation rules
  await ValidationRules.load();

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
      theme: AppTheme.lightTheme,
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

// Global navigator key for accessing context from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class TrossApp extends StatelessWidget {
  const TrossApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => AppProvider()),
        ChangeNotifierProvider(create: (context) => AuthProvider()),
      ],
      child: const AuthStateListener(),
    );
  }
}

/// Global auth state listener - handles logout/auth loss across entire app
class AuthStateListener extends StatelessWidget {
  const AuthStateListener({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        // If user loses authentication, immediately navigate to login
        // This handles logout, token expiry, auth errors, etc.
        // BUT: Don't interfere with login flow or Auth0 callback processing

        // Debug logging
        ErrorService.logInfo(
          'Auth state changed',
          context: {
            'isAuthenticated': authProvider.isAuthenticated,
            'isLoading': authProvider.isLoading,
            'isRedirecting': authProvider.isRedirecting,
          },
        );

        if (!authProvider.isAuthenticated &&
            !authProvider.isLoading &&
            !authProvider.isRedirecting) {
          // Use addPostFrameCallback to avoid navigating during build
          WidgetsBinding.instance.addPostFrameCallback((_) {
            // Use global navigatorKey to access Navigator from anywhere
            final navigator = navigatorKey.currentState;
            if (navigator != null) {
              final currentRoute = ModalRoute.of(
                navigator.context,
              )?.settings.name;

              final publicRoutes = [
                AppRoutes.login,
                AppRoutes.callback,
                AppRoutes.root,
                AppRoutes.error,
                AppRoutes.unauthorized,
                AppRoutes.notFound,
              ];

              ErrorService.logInfo(
                'Checking redirect conditions',
                context: {
                  'currentRoute': currentRoute,
                  'shouldRedirect':
                      currentRoute != null &&
                      !publicRoutes.contains(currentRoute),
                },
              );

              // Don't redirect if:
              // 1. Already on login page
              // 2. Processing Auth0 callback
              // 3. On root route (handled by AuthWrapper)
              // 4. On error/status pages (404, 403, 500, etc.)
              // 5. Route is null (still initializing - let AuthWrapper handle it)

              if (currentRoute != null &&
                  !publicRoutes.contains(currentRoute)) {
                ErrorService.logWarning(
                  'Unauthenticated user on protected route - redirecting to login',
                  context: {'from': currentRoute},
                );
                navigator.pushNamedAndRemoveUntil(
                  AppRoutes.login,
                  (route) => false, // Remove all previous routes
                );
              }
            }
          });
        }

        return MaterialApp(
          title: AppConstants.appName, // 'Tross' - centralized branding
          debugShowCheckedModeBanner: false,
          navigatorKey: navigatorKey,
          theme: AppTheme.lightTheme,
          onGenerateRoute: (settings) {
            // Handle routes with query parameters properly
            final uri = Uri.parse(settings.name ?? '/');
            final path = uri.path;

            // Get authentication context for route guarding
            final context = navigatorKey.currentContext;
            if (context != null) {
              final authProvider = Provider.of<AuthProvider>(
                context,
                listen: false,
              );
              final isAuthenticated = authProvider.isAuthenticated;
              final user = authProvider.user;

              // Check access with route guard
              final guardResult = RouteGuard.checkAccess(
                route: path,
                isAuthenticated: isAuthenticated,
                user: user,
              );

              // Handle access denial
              if (!guardResult.canAccess) {
                // Redirect to appropriate page
                if (guardResult.redirectRoute == AppRoutes.login) {
                  return MaterialPageRoute(builder: (_) => const LoginScreen());
                } else if (guardResult.redirectRoute ==
                    AppRoutes.unauthorized) {
                  return MaterialPageRoute(
                    builder: (_) =>
                        ErrorDisplay.unauthorized(message: guardResult.reason),
                  );
                } else if (guardResult.redirectRoute == AppRoutes.home) {
                  return MaterialPageRoute(builder: (_) => const HomeScreen());
                }
              }
            }

            // Route to appropriate screen
            switch (path) {
              case AppRoutes.root:
                return MaterialPageRoute(builder: (_) => const AuthWrapper());

              case AppRoutes.login:
                return MaterialPageRoute(builder: (_) => const LoginScreen());

              case AppRoutes.home:
                return MaterialPageRoute(builder: (_) => const HomeScreen());

              case AppRoutes.admin:
                return MaterialPageRoute(
                  builder: (_) => const AdminDashboard(),
                );

              case AppRoutes.settings:
                return MaterialPageRoute(
                  builder: (_) => const SettingsScreen(),
                );

              case AppRoutes.laborSettings:
                return MaterialPageRoute(
                  builder: (_) => const LaborSettingsScreen(),
                );

              case AppRoutes.pricebooksSettings:
                return MaterialPageRoute(
                  builder: (_) => const PricebooksSettingsScreen(),
                );

              case AppRoutes.projectSettings:
                return MaterialPageRoute(
                  builder: (_) => const ProjectSettingsScreen(),
                );

              case AppRoutes.quoteSettings:
                return MaterialPageRoute(
                  builder: (_) => const QuoteSettingsScreen(),
                );

              case AppRoutes.mobileSettings:
                return MaterialPageRoute(
                  builder: (_) => const MobileSettingsScreen(),
                );

              case AppRoutes.dispatchSettings:
                return MaterialPageRoute(
                  builder: (_) => const DispatchSettingsScreen(),
                );

              case AppRoutes.serviceAgreementSettings:
                return MaterialPageRoute(
                  builder: (_) => const ServiceAgreementSettingsScreen(),
                );

              case AppRoutes.jobSettings:
                return MaterialPageRoute(
                  builder: (_) => const JobSettingsScreen(),
                );

              case AppRoutes.itemListSettings:
                return MaterialPageRoute(
                  builder: (_) => const ItemListSettingsScreen(),
                );

              case AppRoutes.formsSettings:
                return MaterialPageRoute(
                  builder: (_) => const FormsSettingsScreen(),
                );

              case AppRoutes.invoiceSettings:
                return MaterialPageRoute(
                  builder: (_) => const InvoiceSettingsScreen(),
                );

              case AppRoutes.accountingSettings:
                return MaterialPageRoute(
                  builder: (_) => const AccountingSettingsScreen(),
                );

              case AppRoutes.equipmentAssets:
                return MaterialPageRoute(
                  builder: (_) => const EquipmentAssetsScreen(),
                );

              case AppRoutes.callback:
                return MaterialPageRoute(
                  builder: (_) => const Auth0CallbackHandler(),
                );

              case AppRoutes.unauthorized:
                return MaterialPageRoute(
                  builder: (_) => ErrorDisplay.unauthorized(),
                );

              case AppRoutes.notFound:
                return MaterialPageRoute(
                  builder: (_) => ErrorDisplay.notFound(requestedPath: path),
                );

              case AppRoutes.error:
                return MaterialPageRoute(builder: (_) => ErrorDisplay.error());

              // 404 - Route not found
              default:
                return MaterialPageRoute(
                  builder: (_) => ErrorDisplay.notFound(requestedPath: path),
                );
            }
          },
          initialRoute: '/',
        );
      },
    );
  }
}

/// Auth0 Callback Handler - Processes OAuth redirect on web
class Auth0CallbackHandler extends StatefulWidget {
  const Auth0CallbackHandler({super.key});

  @override
  State<Auth0CallbackHandler> createState() => _Auth0CallbackHandlerState();
}

class _Auth0CallbackHandlerState extends State<Auth0CallbackHandler> {
  @override
  void initState() {
    super.initState();
    // Use addPostFrameCallback to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleCallback();
    });
  }

  Future<void> _handleCallback() async {
    ErrorService.logInfo('Starting Auth0 callback handling');

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.handleAuth0Callback();

    ErrorService.logInfo(
      'Auth0 callback completed',
      context: {'success': success, 'mounted': mounted},
    );

    if (success) {
      if (mounted) {
        ErrorService.logInfo('Callback success - redirecting to home');
        // Clean URL before navigation (remove OAuth query parameters)
        if (kIsWeb) {
          BrowserUtils.replaceHistoryState(AppRoutes.home);
        }
        Navigator.of(context).pushReplacementNamed(AppRoutes.home);
      }
    } else {
      if (mounted) {
        ErrorService.logWarning('Callback failed - redirecting to login');
        // Clean URL before redirecting to login
        if (kIsWeb) {
          BrowserUtils.replaceHistoryState(AppRoutes.login);
        }
        Navigator.of(context).pushReplacementNamed(AppRoutes.login);
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
            Text('Completing Auth0 login...'),
          ],
        ),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    // Initialize providers when app starts
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      await appProvider.initialize();
      await authProvider.initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AppProvider, AuthProvider>(
      builder: (context, appProvider, authProvider, child) {
        // Show loading while initializing OR redirecting to Auth0
        if (!appProvider.isInitialized ||
            authProvider.isLoading ||
            authProvider.isRedirecting) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Initializing ${AppConstants.appName}...'),
                ],
              ),
            ),
          );
        }

        // Check if user is authenticated
        if (authProvider.isAuthenticated) {
          return const HomeScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
