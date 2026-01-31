/// SettingsScreen - User Settings Page
///
/// **THIN SHELL PATTERN:** Routes to AdaptiveShell + SettingsContent
/// Matches home_screen.dart pattern (DashboardContent)
///
/// Content is 100% metadata-driven via SettingsContent organism.
/// Auth is 100% delegated to Auth0 - no password/security management.
library;

import 'package:flutter/material.dart';
import '../core/routing/app_routes.dart';
import '../widgets/organisms/settings_content.dart';
import '../widgets/templates/templates.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AdaptiveShell(
      currentRoute: AppRoutes.settings,
      pageTitle: 'Settings',
      body: SettingsContent(),
    );
  }
}
