/// LoginScreen - Pure atomic composition, ZERO business logic
///
/// Composition:
/// - LoginHeader molecule (branding)
/// - ProductionLoginCard molecule (Auth0)
/// - DevLoginCard organism (dev auth with role state, conditional)
/// - Badge atom (backend health)
/// - AppFooter organism (copyright)
///
/// Business logic: Handled via callbacks to AuthProvider
library;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../providers/auth_provider.dart';
import '../config/app_config.dart';
import '../config/constants.dart';
import '../config/app_spacing.dart';
import '../core/routing/app_routes.dart';
import '../services/error_service.dart';
import '../services/notification_service.dart';
import '../widgets/molecules/layout/login_header.dart';
import '../widgets/organisms/login/production_login_card.dart';
import '../widgets/organisms/login/dev_login_card.dart';
import '../widgets/atoms/atoms.dart';

/// Dev roles for login screen
/// Source of truth: config/permissions.json roles
/// Must match backend: validRoles in routes/dev-auth.js
const _devRoleNames = [
  'admin',
  'manager',
  'dispatcher',
  'technician',
  'customer',
];

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      body: Consumer<AppProvider>(
        builder: (context, appProvider, child) {
          return SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWideScreen = AppBreakpoints.isDesktop(
                  constraints.maxWidth,
                );

                return Center(
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: isWideScreen ? 500 : constraints.maxWidth * 0.9,
                    ),
                    child: SingleChildScrollView(
                      padding: spacing.paddingXL,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Branding
                          const LoginHeader(
                            title: AppConstants.appName,
                            subtitle: AppConstants.appTagline,
                          ),

                          spacing.gapXXXL,

                          // Production Auth0 login
                          Consumer<AuthProvider>(
                            builder: (context, authProvider, child) {
                              return ProductionLoginCard(
                                isLoading: authProvider.isLoading,
                                onLogin: () => _handleAuth0Login(context),
                              );
                            },
                          ),

                          // Dev authentication (conditional)
                          if (AppConfig.devAuthEnabled) ...[
                            spacing.gapXL,
                            // Use hardcoded dev roles (no auth required)
                            // Matches backend test-users.js roles
                            DevLoginCard(
                              availableRoles: _devRoleNames,
                              onDevLogin: (role) =>
                                  _handleDevLogin(context, role: role),
                            ),
                          ],

                          spacing.gapXXXL,

                          // Backend health status
                          AppBadge(
                            label: !appProvider.isInitialized
                                ? 'Checking...'
                                : appProvider.isBackendHealthy
                                ? 'Connected'
                                : 'Disconnected',
                            style: !appProvider.isInitialized
                                ? BadgeStyle.secondary
                                : appProvider.isBackendHealthy
                                ? BadgeStyle.success
                                : BadgeStyle.error,
                          ),

                          spacing.gapXL,

                          // Simple footer (inline - login screen is constrained)
                          Column(
                            children: [
                              Text(
                                AppConstants.appDescription,
                                style: Theme.of(context).textTheme.bodySmall,
                                textAlign: TextAlign.center,
                              ),
                              SizedBox(height: spacing.sm),
                              Text(
                                AppConstants.appCopyright,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.6),
                                    ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  /// Handle Auth0 authentication
  Future<void> _handleAuth0Login(BuildContext context) async {
    if (!context.mounted) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    try {
      final success = await authProvider.loginWithAuth0();

      if (!context.mounted) return;

      if (success) {
        // On web, Auth0 redirects the browser to Auth0 login page
        // The callback handler will navigate to home after successful login
        if (!kIsWeb) {
          // On mobile platforms, credentials are returned immediately
          context.go(AppRoutes.home);
        }
        // On web, do nothing - browser is redirecting to Auth0
      } else {
        NotificationService.showError(context, 'Auth0 login failed');
      }
    } catch (e) {
      if (context.mounted) {
        NotificationService.showError(context, 'Auth0 login failed: $e');
      }
    }
  }

  /// Handle dev authentication (any role)
  Future<void> _handleDevLogin(
    BuildContext context, {
    required String role,
  }) async {
    if (!context.mounted) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    ErrorService.logInfo('Starting dev login', context: {'role': role});

    try {
      final success = await authProvider.loginWithTestToken(role: role);

      ErrorService.logInfo(
        'Dev login result',
        context: {
          'success': success,
          'isAuthenticated': authProvider.isAuthenticated,
          'role': role,
        },
      );

      if (!context.mounted) return;

      if (success) {
        ErrorService.logInfo(
          'Login successful - navigating to home',
          context: {'route': AppRoutes.home},
        );
        context.go(AppRoutes.home);
      } else {
        ErrorService.logWarning(
          '[Expected in tests] Login failed - showing error to user',
          context: {'role': role},
        );
        NotificationService.showError(
          context,
          'Dev login failed for role: $role',
        );
      }
    } catch (e) {
      ErrorService.logError(
        'Login exception',
        error: e,
        context: {'role': role},
      );
      if (context.mounted) {
        NotificationService.showError(context, 'Dev login failed: $e');
      }
    }
  }
}
