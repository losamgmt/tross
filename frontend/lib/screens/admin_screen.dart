/// Admin Screen - Administration Landing Page
///
/// Simple landing page for the admin section.
/// Entity management is accessed via sidebar navigation to /admin/:name
///
/// Sidebar navigation uses 'admin' strategy from nav-config.json,
/// providing admin-specific menu items instead of business navigation.
///
/// Security: Requires admin role (enforced by router guard)
library;

import 'package:flutter/material.dart';
import '../core/routing/app_routes.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AdaptiveShell(
      currentRoute: AppRoutes.admin,
      pageTitle: 'Administration',
      sidebarStrategy: 'admin',
      body: const UnderConstructionDisplay(
        title: 'Administration Dashboard',
        message: 'Select an option from the sidebar to configure your system.',
      ),
    );
  }
}
