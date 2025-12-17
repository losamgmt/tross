/// Home Screen - Main Dashboard
///
/// Currently shows under construction while dashboard features are developed.
/// Dashboard content is ready but uses placeholder data - will be enabled
/// when backend data sources are connected.
library;

import 'package:flutter/material.dart';
import '../core/routing/app_routes.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AdaptiveShell(
      currentRoute: AppRoutes.home,
      pageTitle: 'Home',
      body: const UnderConstructionDisplay(
        title: 'Dashboard Coming Soon!',
        message:
            'We\'re building an amazing dashboard with analytics, charts, and insights. Stay tuned!',
        icon: Icons.dashboard,
      ),
    );
  }
}
