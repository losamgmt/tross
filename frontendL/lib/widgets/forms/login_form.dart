/// LoginForm - Production Auth0 login organism
///
/// PRODUCTION ONLY: Contains Auth0 authentication button
/// Dev authentication buttons are in LoginScreen's dev card
library;

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/constants.dart';
import '../../services/notification_service.dart';

class LoginForm extends StatelessWidget {
  const LoginForm({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        // PRODUCTION: Auth0 Login Button ONLY
        return SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: authProvider.isLoading
                ? null
                : () => _loginWithAuth0(context),
            icon: const Icon(Icons.security),
            label: Text(AppConstants.loginButtonAuth0),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
            ),
          ),
        );
      },
    );
  }

  Future<void> _loginWithAuth0(BuildContext context) async {
    if (!context.mounted) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    try {
      final success = await authProvider.loginWithAuth0();

      if (!context.mounted) return;

      if (success) {
        // On web, Auth0 redirects the browser to Auth0 login page
        // The callback handler will navigate to home after successful login
        // So we don't navigate here to prevent flash before redirect
        if (!kIsWeb) {
          // On mobile platforms, credentials are returned immediately
          Navigator.of(context).pushReplacementNamed(AppConstants.homeRoute);
        }
        // On web, do nothing - browser is redirecting to Auth0
      } else {
        NotificationService.showError(context, AppConstants.auth0LoginFailed);
      }
    } catch (e) {
      if (context.mounted) {
        NotificationService.showError(context, 'Auth0 login failed: $e');
      }
    }
  }
}
