/// SettingsScreen - Pure atomic composition, ZERO business logic
///
/// Composition:
/// - AdaptiveShell template (responsive navigation)
/// - TitledCard molecules (consistent card backing for all sections)
/// - EntityDetailCard organism (user data - metadata-driven)
/// - GenericForm organism (preferences - 100% metadata-driven)
///
/// All content wrapped in cards - NO loose page elements.
/// Auth is 100% delegated to Auth0 - no password/security management.
///
/// Preferences are 100% METADATA-DRIVEN:
/// - Fields generated from MetadataFieldConfigFactory.forEntity('preferences')
/// - Field groups from EntityMetadata.sortedFieldGroups
/// - Uses same GenericForm as all other entity forms
/// - NO hardcoded preference fields or custom widgets
///
/// Preferences loading is handled by PreferencesProvider listening to auth state.
/// This screen only DISPLAYS and UPDATES preferences - no loading logic here.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_spacing.dart';
import '../core/routing/app_routes.dart';
import '../providers/auth_provider.dart';
import '../providers/preferences_provider.dart';
import '../services/entity_metadata.dart';
import '../services/metadata_field_config_factory.dart';
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

    // Get preferences metadata for field groups
    final preferencesMetadata = EntityMetadataRegistry.get('preferences');

    // Generate field configs from metadata - generic pattern, no special handling
    // Context is null because preferences has no FK fields needing async loading
    final fieldConfigs = MetadataFieldConfigFactory.forEntity(
      null, // No context needed - preferences has no FK fields
      'preferences',
    );

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

                // Preferences card - 100% METADATA-DRIVEN via GenericForm
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

                      // GenericForm with grouped layout - same pattern as all entities
                      if (fieldConfigs.isNotEmpty)
                        GenericForm<Map<String, dynamic>>(
                          value: prefsProvider.preferencesMap,
                          fields: fieldConfigs,
                          layout: preferencesMetadata.hasFieldGroups
                              ? FormLayout.grouped
                              : FormLayout.flat,
                          fieldGroups: preferencesMetadata.hasFieldGroups
                              ? preferencesMetadata.sortedFieldGroups
                              : null,
                          enabled: !prefsProvider.isLoading,
                          onChange: prefsProvider.updatePreferences,
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
