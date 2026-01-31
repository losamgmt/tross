/// LoginContent - Authentication UI Components
///
/// Composes login organisms for authentication flow.
/// Displays: Branding, Auth0 Login, Dev Login (conditional), Health Status
///
/// **PATTERN:** Matches DashboardContent - dedicated content organism
/// **CALLBACK-DRIVEN:** All auth actions via onAuth0Login/onDevLogin callbacks
/// **SCREEN-AGNOSTIC:** Can be embedded in CenteredLayout or any container
///
/// Dev authentication only shown when AppConfig.devAuthEnabled is true.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_spacing.dart';
import '../../config/app_config.dart';
import '../../config/constants.dart';
import '../../providers/app_provider.dart';
import '../../providers/auth_provider.dart';
import '../atoms/indicators/app_badge.dart';
import '../molecules/layout/login_header.dart';
import 'login/production_login_card.dart';
import 'login/dev_login_card.dart';

/// Dev roles for login - matches backend test-users.js
const _devRoleNames = [
  'admin',
  'manager',
  'dispatcher',
  'technician',
  'customer',
];

/// Login content displaying authentication options
class LoginContent extends StatelessWidget {
  /// Callback when Auth0 login is requested
  final VoidCallback onAuth0Login;

  /// Callback when dev login is requested with selected role
  final void Function(String role) onDevLogin;

  const LoginContent({
    super.key,
    required this.onAuth0Login,
    required this.onDevLogin,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final appProvider = context.watch<AppProvider>();
    final authProvider = context.watch<AuthProvider>();

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ════════════════════════════════════════════════════════════════
        // Branding Header
        // ════════════════════════════════════════════════════════════════
        const LoginHeader(
          title: AppConstants.appName,
          subtitle: AppConstants.appTagline,
        ),

        spacing.gapXXXL,

        // ════════════════════════════════════════════════════════════════
        // Production Auth0 Login
        // ════════════════════════════════════════════════════════════════
        ProductionLoginCard(
          isLoading: authProvider.isLoading,
          onLogin: onAuth0Login,
        ),

        // ════════════════════════════════════════════════════════════════
        // Dev Authentication (conditional)
        // ════════════════════════════════════════════════════════════════
        if (AppConfig.devAuthEnabled) ...[
          spacing.gapXL,
          DevLoginCard(availableRoles: _devRoleNames, onDevLogin: onDevLogin),
        ],

        spacing.gapXXXL,

        // ════════════════════════════════════════════════════════════════
        // Backend Health Status
        // ════════════════════════════════════════════════════════════════
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

        // ════════════════════════════════════════════════════════════════
        // Footer
        // ════════════════════════════════════════════════════════════════
        _LoginFooter(),
      ],
    );
  }
}

/// Simple footer for login screen
class _LoginFooter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      children: [
        Text(
          AppConstants.appDescription,
          style: theme.textTheme.bodySmall,
          textAlign: TextAlign.center,
        ),
        SizedBox(height: spacing.sm),
        Text(
          AppConstants.appCopyright,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
