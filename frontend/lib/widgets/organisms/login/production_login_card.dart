/// ProductionLoginCard - Organism for Auth0 production authentication
///
/// Self-contained card with:
/// - Title: "Sign In"
/// - Description: "Sign in with your organization account"
/// - LoginForm organism (Auth0 button)
///
/// Atomic Design: Organism (composes LoginForm organism)
///
/// PROP-DRIVEN: Receives isLoading and onLogin callback
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import 'login_form.dart';

class ProductionLoginCard extends StatelessWidget {
  /// Whether login is in progress
  final bool isLoading;

  /// Callback triggered when login button is pressed
  final VoidCallback? onLogin;

  const ProductionLoginCard({super.key, this.isLoading = false, this.onLogin});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Card(
      elevation: 2,
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Card Title
            Text(
              'Sign In',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            spacing.gapMD,
            Text(
              'Sign in with your organization account',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
              ),
              textAlign: TextAlign.center,
            ),
            spacing.gapXL,

            // Auth0 Login Button
            LoginForm(isLoading: isLoading, onLogin: onLogin),
          ],
        ),
      ),
    );
  }
}
