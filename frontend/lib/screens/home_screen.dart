/// Home Screen - Main Dashboard
///
/// Displays the main dashboard with real-time statistics from the backend.
/// Uses DashboardProvider for data and DashboardContent for display.
///
/// STATS DISPLAYED:
/// - Work Orders: total, pending, in_progress, completed
/// - Financial: revenue, outstanding, active contracts
/// - Resources: customers, technicians, low stock, active users
library;

import 'package:flutter/material.dart';
import '../core/routing/app_routes.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AdaptiveShell(
      currentRoute: AppRoutes.home,
      pageTitle: 'Dashboard',
      body: DashboardContent(),
    );
  }
}
