/// LoginScreen - Authentication Page
///
/// **THIN SHELL PATTERN:** Routes to CenteredLayout + LoginContent
/// Matches home_screen.dart pattern (DashboardContent)
///
/// Auth handlers remain in screen (need context for navigation).
/// Content composition delegated to LoginContent organism.
library;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/routing/app_routes.dart';
import '../services/error_service.dart';
import '../services/notification_service.dart';
import '../widgets/organisms/login_content.dart';
import '../widgets/templates/templates.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return CenteredLayout.responsive(
      child: LoginContent(
        onAuth0Login: () => _handleAuth0Login(context),
        onDevLogin: (role) => _handleDevLogin(context, role: role),
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

