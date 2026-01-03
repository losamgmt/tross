/// LoginForm - Production Auth0 login organism
///
/// PRODUCTION ONLY: Contains Auth0 authentication button
/// Dev authentication buttons are in LoginScreen's dev card
///
/// PROP-DRIVEN: Receives isLoading and onLogin callback
library;

import 'package:flutter/material.dart';
import '../../../config/constants.dart';

class LoginForm extends StatelessWidget {
  /// Whether the login action is in progress
  final bool isLoading;

  /// Callback triggered when login button is pressed
  final VoidCallback? onLogin;

  const LoginForm({super.key, this.isLoading = false, this.onLogin});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onLogin,
        icon: const Icon(Icons.security),
        label: Text(
          AppConstants.loginButtonAuth0,
          overflow: TextOverflow.ellipsis,
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
        ),
      ),
    );
  }
}
