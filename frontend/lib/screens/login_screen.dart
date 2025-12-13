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

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../providers/auth_provider.dart';
import '../config/app_config.dart';
import '../config/constants.dart';
import '../config/app_spacing.dart';
import '../core/routing/app_routes.dart';
import '../services/error_service.dart';
import '../services/notification_service.dart';
import '../widgets/molecules/login_header.dart';
import '../widgets/organisms/login/production_login_card.dart';
import '../widgets/organisms/login/dev_login_card.dart';
import '../widgets/atoms/atoms.dart';

/// Dev roles for login screen - matches backend test-users.js
const _devRoleNames = [
  'admin',
  'manager',
  'dispatcher',
  'technician',
  'client',
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
                final isWideScreen = constraints.maxWidth > 800;

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
                          const ProductionLoginCard(),

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
                            label: appProvider.isBackendHealthy
                                ? 'Connected'
                                : 'Disconnected',
                            style: appProvider.isBackendHealthy
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
        Navigator.of(context).pushReplacementNamed(AppRoutes.home);
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
