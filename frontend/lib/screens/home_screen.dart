/// Home Screen - Main Dashboard
///
/// Displays the main dashboard with role-based entity charts.
/// Uses DashboardProvider for data and DashboardContent for display.
///
/// DASHBOARD FEATURES:
/// - Config-driven entity charts (from dashboard-config.json)
/// - Role-based visibility (minRole per entity)
/// - Distribution pie charts grouped by status
/// - Colors from entity-metadata.json (SSOT)
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/routing/app_routes.dart';
import '../providers/auth_provider.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return AdaptiveShell(
      currentRoute: AppRoutes.home,
      pageTitle: 'Dashboard',
      body: DashboardContent(userName: authProvider.userName),
    );
  }
}
