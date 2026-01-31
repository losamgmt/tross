/// Admin Screen - System Operations Dashboard
///
/// **THIN SHELL PATTERN:** Routes to AdaptiveShell + AdminHomeContent
/// Matches home_screen.dart pattern (DashboardContent)
///
/// Sidebar navigation uses 'admin' strategy from nav-config.json.
/// Security: Requires admin role (enforced by router guard)
library;

import 'package:flutter/material.dart';
import '../core/routing/app_routes.dart';
import '../widgets/organisms/admin_home_content.dart';
import '../widgets/templates/templates.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AdaptiveShell(
      currentRoute: AppRoutes.admin,
      pageTitle: 'System Administration',
      sidebarStrategy: 'admin',
      body: AdminHomeContent(),
    );
  }
}
