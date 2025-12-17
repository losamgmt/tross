/// SettingsScreen - Pure atomic composition, ZERO business logic
///
/// Composition:
/// - AdaptiveShell template (responsive navigation)
/// - TitledCard molecules (consistent card backing for all sections)
/// - EntityDetailCard organism (user data - metadata-driven)
/// - Preferences settings rows
///
/// All content wrapped in cards - NO loose page elements.
/// Auth is 100% delegated to Auth0 - no password/security management.
///
/// Preferences loading is handled by PreferencesProvider listening to auth state.
/// This screen only DISPLAYS and UPDATES preferences - no loading logic here.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_spacing.dart';
import '../config/preference_keys.dart';
import '../core/routing/app_routes.dart';
import '../providers/auth_provider.dart';
import '../providers/preferences_provider.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';
import '../widgets/molecules/molecules.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final prefsProvider = Provider.of<PreferencesProvider>(context);
    final spacing = context.spacing;

    return AdaptiveShell(
      currentRoute: AppRoutes.settings,
      pageTitle: 'Settings',
      body: SingleChildScrollView(
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            padding: spacing.paddingXL,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // User profile card - metadata-driven
                EntityDetailCard(
                  entityName: 'user',
                  entity: authProvider.user,
                  title: 'My Profile',
                  icon: Icons.person,
                  error: authProvider.error,
                  // Exclude fields that aren't relevant for user self-view
                  excludeFields: const ['auth0_id', 'role_id'],
                ),

                SizedBox(height: spacing.xl),

                // Preferences card - wrapped in TitledCard for consistency
                TitledCard(
                  title: 'Preferences',
                  child: Column(
                    children: [
                      // Loading indicator
                      if (prefsProvider.isLoading)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 16),
                          child: LinearProgressIndicator(),
                        ),

                      // Theme preference dropdown
                      SettingDropdownRow<ThemePreference>(
                        label: 'Theme',
                        description: 'Choose your preferred color theme',
                        value: prefsProvider.theme,
                        items: ThemePreference.values,
                        displayText: (theme) {
                          switch (theme) {
                            case ThemePreference.system:
                              return 'System Default';
                            case ThemePreference.light:
                              return 'Light';
                            case ThemePreference.dark:
                              return 'Dark';
                          }
                        },
                        onChanged: (value) {
                          if (value != null) {
                            prefsProvider.updateTheme(value);
                          }
                        },
                        enabled: !prefsProvider.isLoading,
                      ),

                      SizedBox(height: spacing.md),

                      // Notifications toggle
                      SettingToggleRow(
                        label: 'Notifications',
                        description: 'Receive notifications about updates',
                        value: prefsProvider.notificationsEnabled,
                        onChanged: (value) {
                          prefsProvider.updateNotificationsEnabled(value);
                        },
                        enabled: !prefsProvider.isLoading,
                      ),

                      // Error display
                      if (prefsProvider.error != null) ...[
                        SizedBox(height: spacing.sm),
                        Text(
                          prefsProvider.error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // NO Security section - Auth is 100% delegated to Auth0
              ],
            ),
          ),
        ),
      ),
    );
  }
}
