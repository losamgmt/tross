import 'package:flutter/material.dart';
import 'package:tross_app/models/entity_metadata.dart'
    show FieldGroup, FormLayout;
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/molecules/details/detail_field.dart';
import 'package:tross_app/widgets/molecules/containers/form_section.dart';

/// Generic detail panel widget that displays all fields of a model
///
/// **SOLE RESPONSIBILITY:** Render read-only detail fields ONLY
/// - Context-agnostic: NO Padding, NO title
/// - Parent handles: Container sizing, padding, title rendering
///
/// **Layout Modes:**
/// - [FormLayout.flat]: Simple vertical list of all fields (default)
/// - [FormLayout.grouped]: Fields organized into sections using fieldGroups
///
/// Renders multiple fields in read-only mode based on configuration.
///
/// Type parameter:
/// - T: The model type (e.g., User, Role)
///
/// Usage:
/// ```dart
/// // Flat layout (default)
/// DetailPanel<User>(
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
/// )
///
/// // Grouped layout
/// DetailPanel<Map<String, dynamic>>(
///   value: customerData,
///   fields: allFieldConfigs,
///   layout: FormLayout.grouped,
///   fieldGroups: metadata.sortedFieldGroups,
/// )
/// ```
class DetailPanel<T> extends StatelessWidget {
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final double spacing;

  /// Layout mode - flat or grouped
  final FormLayout layout;

  /// Field groups for grouped layout (sorted by order)
  final List<FieldGroup>? fieldGroups;

  const DetailPanel({
    super.key,
    required this.value,
    required this.fields,
    this.spacing = 16.0,
    this.layout = FormLayout.flat,
    this.fieldGroups,
  });

  @override
  Widget build(BuildContext context) {
    // Choose layout strategy
    return switch (layout) {
      FormLayout.flat => _buildFlatLayout(),
      FormLayout.grouped => _buildGroupedLayout(),
      FormLayout.tabbed => _buildFlatLayout(), // Fallback to flat for now
    };
  }

  /// Build flat layout - simple vertical list of all fields
  Widget _buildFlatLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: fields.asMap().entries.map((entry) {
        final index = entry.key;
        final field = entry.value;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DetailFieldDisplay(config: field, value: value),
            if (index < fields.length - 1) SizedBox(height: spacing),
          ],
        );
      }).toList(),
    );
  }

  /// Build grouped layout - fields organized into sections
  Widget _buildGroupedLayout() {
    final groups = fieldGroups;
    if (groups == null || groups.isEmpty) {
      // Fallback to flat if no groups defined
      return _buildFlatLayout();
    }

    // Build a map of fieldName -> field for quick lookup
    final fieldMap = <String, FieldConfig<T, dynamic>>{};
    for (final field in fields) {
      // Use explicit fieldName if available, fallback to label parsing
      final fieldName = field.fieldName ?? _labelToFieldName(field.label);
      fieldMap[fieldName] = field;
    }

    // Track all fields in groups
    final fieldsInGroups = <String>{};
    for (final group in groups) {
      fieldsInGroups.addAll(group.fields);
    }

    final sections = <Widget>[];

    for (int groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      final group = groups[groupIdx];
      final fieldWidgets = <Widget>[];
      final processedFields =
          <String>{}; // Track fields already rendered in rows

      for (int i = 0; i < group.fields.length; i++) {
        final fieldName = group.fields[i];

        // Skip if already processed as part of a row
        if (processedFields.contains(fieldName)) continue;

        final field = fieldMap[fieldName];

        if (field != null) {
          // Add spacing between fields within a group
          if (fieldWidgets.isNotEmpty) {
            fieldWidgets.add(SizedBox(height: spacing));
          }

          // Check if this field is part of a row layout
          final row = group.getRowFor(fieldName);
          if (row != null && row.length > 1) {
            // Build row of fields
            final rowWidgets = <Widget>[];
            for (int j = 0; j < row.length; j++) {
              final rowFieldName = row[j];
              final rowField = fieldMap[rowFieldName];
              if (rowField != null) {
                if (rowWidgets.isNotEmpty) {
                  rowWidgets.add(SizedBox(width: spacing));
                }
                rowWidgets.add(
                  Expanded(
                    child: DetailFieldDisplay(config: rowField, value: value),
                  ),
                );
                processedFields.add(rowFieldName);
              }
            }
            if (rowWidgets.isNotEmpty) {
              fieldWidgets.add(
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: rowWidgets,
                ),
              );
            }
          } else {
            // Single field, full width
            fieldWidgets.add(DetailFieldDisplay(config: field, value: value));
          }
        }
      }

      if (fieldWidgets.isNotEmpty) {
        sections.add(
          Padding(
            padding: EdgeInsets.only(top: groupIdx > 0 ? spacing * 1.5 : 0),
            child: FormSection(
              label: group.label,
              showDivider: groupIdx > 0,
              children: fieldWidgets,
            ),
          ),
        );
      }
    }

    // Add "Other" section for fields not in any group
    final ungroupedFields = <Widget>[];
    for (final field in fields) {
      final fieldName = field.fieldName ?? _labelToFieldName(field.label);
      if (!fieldsInGroups.contains(fieldName)) {
        if (ungroupedFields.isNotEmpty) {
          ungroupedFields.add(SizedBox(height: spacing));
        }
        ungroupedFields.add(DetailFieldDisplay(config: field, value: value));
      }
    }

    if (ungroupedFields.isNotEmpty) {
      sections.add(
        Padding(
          padding: EdgeInsets.only(
            top: sections.isNotEmpty ? spacing * 1.5 : 0,
          ),
          child: FormSection(
            label: 'Other',
            showDivider: sections.isNotEmpty,
            children: ungroupedFields,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: sections,
    );
  }

  /// Convert label back to field_name format for lookup (fallback only)
  /// "First Name" -> "first_name"
  /// NOTE: Prefer using FieldConfig.fieldName when available
  String _labelToFieldName(String label) {
    return label.toLowerCase().replaceAll(' ', '_');
  }
}
