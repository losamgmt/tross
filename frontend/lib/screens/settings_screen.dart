/// SettingsScreen - Pure atomic composition, ZERO business logic
///
/// Composition:
/// - AdaptiveShell template (responsive navigation)
/// - TitledCard molecules (consistent card backing for all sections)
/// - EntityDetailCard organism (user data - metadata-driven)
/// - Preferences settings rows (metadata-driven from preferenceSchema)
///
/// All content wrapped in cards - NO loose page elements.
/// Auth is 100% delegated to Auth0 - no password/security management.
///
/// Preferences are 100% METADATA-DRIVEN:
/// - Schema loaded from EntityMetadataRegistry.get('preferences').preferenceSchema
/// - Each preference field rendered using existing generic molecules
/// - NO hardcoded preference fields - iterate schema and compose widgets
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

    // Get preference schema from metadata
    final preferencesMetadata = EntityMetadataRegistry.get('preferences');
    final preferenceSchema = preferencesMetadata.preferenceSchema;

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

                // Preferences card - 100% METADATA-DRIVEN
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

                      // Iterate preferenceSchema and render appropriate widgets
                      if (preferenceSchema != null)
                        ..._buildPreferenceWidgets(
                          context: context,
                          preferenceSchema: preferenceSchema,
                          prefsProvider: prefsProvider,
                          spacing: spacing,
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

  /// Build preference widgets from metadata schema
  ///
  /// Iterates the preferenceSchema sorted by order, renders the appropriate
  /// existing generic molecule for each field type. ZERO hardcoded fields.
  List<Widget> _buildPreferenceWidgets({
    required BuildContext context,
    required Map<String, PreferenceFieldDefinition> preferenceSchema,
    required PreferencesProvider prefsProvider,
    required AppSpacing spacing,
  }) {
    // Sort fields by order
    final sortedFields = preferenceSchema.values.toList()
      ..sort((a, b) => a.order.compareTo(b.order));

    final widgets = <Widget>[];

    for (int i = 0; i < sortedFields.length; i++) {
      final field = sortedFields[i];

      // Add spacing between fields (not before first)
      if (i > 0) {
        widgets.add(SizedBox(height: spacing.md));
      }

      // Build widget based on field type using existing generic molecules
      final widget = _buildPreferenceField(
        field: field,
        prefsProvider: prefsProvider,
      );

      if (widget != null) {
        widgets.add(widget);
      }
    }

    return widgets;
  }

  /// Build a single preference field widget from metadata
  ///
  /// Maps PreferenceFieldType to existing generic molecules:
  /// - boolean → SettingToggleRow
  /// - enum → SettingDropdownRow
  /// - string → SettingTextRow
  /// - integer → SettingNumberRow
  Widget? _buildPreferenceField({
    required PreferenceFieldDefinition field,
    required PreferencesProvider prefsProvider,
  }) {
    final currentValue = prefsProvider.getPreference(field.key);
    final isEnabled = !prefsProvider.isLoading;

    return switch (field.type) {
      PreferenceFieldType.boolean => SettingToggleRow(
        label: field.label,
        description: field.description ?? '',
        value: currentValue as bool? ?? field.defaultValue as bool? ?? false,
        onChanged: (value) => prefsProvider.updatePreference(field.key, value),
        enabled: isEnabled,
      ),
      PreferenceFieldType.enumType => SettingDropdownRow<String>(
        label: field.label,
        description: field.description ?? '',
        value: currentValue as String? ?? field.defaultValue as String?,
        items: field.enumValues ?? [],
        displayText: (value) => field.getDisplayText(value),
        onChanged: (value) {
          if (value != null) {
            prefsProvider.updatePreference(field.key, value);
          }
        },
        enabled: isEnabled,
      ),
      PreferenceFieldType.string => SettingTextRow(
        label: field.label,
        description: field.description ?? '',
        value: currentValue as String? ?? field.defaultValue as String? ?? '',
        onChanged: (value) => prefsProvider.updatePreference(field.key, value),
        enabled: isEnabled,
      ),
      PreferenceFieldType.integer => SettingNumberRow(
        label: field.label,
        description: field.description ?? '',
        value: currentValue as int? ?? field.defaultValue as int? ?? 0,
        onChanged: (value) => prefsProvider.updatePreference(field.key, value),
        enabled: isEnabled,
      ),
    };
  }
}
