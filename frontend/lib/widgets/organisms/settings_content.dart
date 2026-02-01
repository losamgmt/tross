/// SettingsContent - User Profile & Preferences Panels
///
/// Composes generic organisms to display user settings.
/// Displays: User Profile (metadata-driven), Preferences (metadata-driven form)
///
/// **PATTERN:** Matches DashboardContent - dedicated content organism
/// **METADATA-DRIVEN:** Uses EntityDetailCard and GenericForm
/// **SCREEN-AGNOSTIC:** Can be embedded in AdaptiveShell or any other container
///
/// Preferences are 100% METADATA-DRIVEN:
/// - Fields generated from MetadataFieldConfigFactory.forEntity('preferences')
/// - Field groups from EntityMetadata.sortedFieldGroups
/// - Uses same GenericForm as all other entity forms
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_spacing.dart';
import '../../providers/auth_provider.dart';
import '../../providers/preferences_provider.dart';
import '../../services/entity_metadata.dart';
import '../../services/metadata_field_config_factory.dart';
import '../molecules/cards/titled_card.dart';
import '../molecules/containers/scrollable_content.dart';
import 'cards/entity_detail_card.dart';
import 'forms/generic_form.dart';

/// Settings content displaying user profile and preferences
class SettingsContent extends StatelessWidget {
  const SettingsContent({super.key});

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

    return ScrollableContent(
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 800),
          padding: spacing.paddingXL,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ════════════════════════════════════════════════════════════
              // PANEL 1: User Profile (metadata-driven)
              // ════════════════════════════════════════════════════════════
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

              // ════════════════════════════════════════════════════════════
              // PANEL 2: Preferences (100% metadata-driven via GenericForm)
              // ════════════════════════════════════════════════════════════
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
    );
  }
}
