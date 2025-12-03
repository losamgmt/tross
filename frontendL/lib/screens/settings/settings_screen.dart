/// SettingsScreen - Pure atomic composition, ZERO business logic
///
/// Composition:
/// - AppHeader organism (navigation)
/// - PageHeader molecule (title + subtitle)
/// - UserProfileCard organism (user data)
/// - PlaceholderCard molecules (coming soon features)
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_spacing.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/organisms/organisms.dart';
import '../../widgets/molecules/cards/page_header.dart';
import '../../widgets/molecules/cards/placeholder_card.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Settings'),
      body: SingleChildScrollView(
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            padding: spacing.paddingXL,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Page header
                const PageHeader(
                  title: 'Profile & Settings',
                  subtitle: 'Manage your account and preferences',
                ),

                SizedBox(height: spacing.xxl),

                // User profile card
                UserProfileCard(
                  userProfile: authProvider.user,
                  error: authProvider.error,
                ),

                SizedBox(height: spacing.xl),

                // Preferences placeholder
                const PlaceholderCard(
                  icon: Icons.tune,
                  title: 'Preferences',
                  message:
                      'Notification, theme, and language preferences coming soon!',
                ),

                SizedBox(height: spacing.xl),

                // Security placeholder
                const PlaceholderCard(
                  icon: Icons.security,
                  title: 'Security',
                  message:
                      'Password management, 2FA, and session controls coming soon!',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
