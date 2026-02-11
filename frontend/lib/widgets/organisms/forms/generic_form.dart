import 'package:flutter/material.dart';
import 'package:tross/models/entity_metadata.dart' show FieldGroup, FormLayout;
import 'package:tross/widgets/molecules/forms/field_config.dart';
import 'package:tross/widgets/molecules/containers/form_section.dart';
import 'package:tross/widgets/organisms/forms/form_field.dart';
import 'package:tross/widgets/atoms/buttons/copy_fields_button.dart';
import 'package:tross/config/app_spacing.dart';
import 'package:tross/services/error_service.dart';

/// Generic form organism that manages multiple fields based on config
///
/// **SOLE RESPONSIBILITY:** Manage form field state and render fields ONLY
/// - Context-agnostic: NO Expanded, NO title, NO buttons
/// - Parent handles: Container sizing, title rendering, action buttons
///
/// **Layout Modes:**
/// - [FormLayout.flat]: Simple vertical list of all fields (default)
/// - [FormLayout.grouped]: Fields organized into sections using fieldGroups
///
/// Type parameter:
/// - T: The model type (e.g., User, Role)
///
/// This widget:
/// - Renders fields in a list (shrinkWrap: true)
/// - Manages field state changes
/// - Provides onChange callback for state updates
/// - Exposes currentValue and isSaving state
/// - Provides validation methods via GlobalKey
///
/// Usage:
/// ```dart
/// // Flat layout (default)
/// GenericForm<User>(
///   key: formKey,
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
///   onChange: (user) => setState(() => _user = user),
/// )
///
/// // Grouped layout
/// GenericForm<Map<String, dynamic>>(
///   key: formKey,
///   value: preferences,
///   fields: allFieldConfigs,
///   fieldGroups: metadata.sortedFieldGroups,
///   layout: FormLayout.grouped,
///   onChange: (prefs) => provider.updatePreferences(prefs),
/// )
/// ```
class GenericForm<T> extends StatefulWidget {
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final void Function(T)? onChange;
  final bool enabled;

  /// Layout strategy for rendering fields
  final FormLayout layout;

  /// Field groups for grouped layout (required when layout is [FormLayout.grouped])
  /// Should be sorted by order (use EntityMetadata.sortedFieldGroups)
  final List<FieldGroup>? fieldGroups;

  const GenericForm({
    super.key,
    required this.value,
    required this.fields,
    this.onChange,
    this.enabled = true,
    this.layout = FormLayout.flat,
    this.fieldGroups,
  });

  @override
  GenericFormState<T> createState() => GenericFormState<T>();
}

class GenericFormState<T> extends State<GenericForm<T>> {
  late T _currentValue;
  final Map<int, String?> _fieldErrors = {};

  @override
  void initState() {
    super.initState();
    _currentValue = widget.value;
  }

  @override
  void didUpdateWidget(GenericForm<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      _currentValue = widget.value;
      _fieldErrors.clear(); // Clear errors when value changes
    }
  }

  void _handleFieldChange(T newValue) {
    setState(() => _currentValue = newValue);
    widget.onChange?.call(newValue);
  }

  void _handleFieldError(int fieldIndex, String? error) {
    setState(() => _fieldErrors[fieldIndex] = error);
  }

  /// Validate all fields and return true if all pass
  bool validateAll() {
    bool allValid = true;
    for (int i = 0; i < widget.fields.length; i++) {
      final field = widget.fields[i];
      if (field.validator != null) {
        final value = field.getValue(_currentValue);
        final error = field.validator!(value);
        ErrorService.logInfo(
          '[VALIDATION] Field validated',
          context: {
            'index': i,
            'label': field.label,
            'value': value?.toString() ?? 'null',
            'error': error,
          },
        );
        _fieldErrors[i] = error;
        if (error != null) allValid = false;
      }
    }
    setState(() {}); // Trigger rebuild to show errors
    ErrorService.logInfo(
      '[VALIDATION] Validation complete',
      context: {'allValid': allValid},
    );
    return allValid;
  }

  /// Get current form value
  T get currentValue => _currentValue;

  /// Check if form is valid (all fields pass validation)
  bool get isValid {
    for (int i = 0; i < widget.fields.length; i++) {
      final field = widget.fields[i];
      if (field.validator != null) {
        final value = field.getValue(_currentValue);
        final error = field.validator!(value);
        if (error != null) return false;
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // Choose layout strategy
    return switch (widget.layout) {
      FormLayout.flat => _buildFlatLayout(spacing),
      FormLayout.grouped => _buildGroupedLayout(spacing),
      FormLayout.tabbed => _buildFlatLayout(
        spacing,
      ), // Fallback to flat for now
    };
  }

  /// Build flat layout - simple vertical list of all fields
  Widget _buildFlatLayout(AppSpacing spacing) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: widget.fields.length,
      separatorBuilder: (context, index) => SizedBox(height: spacing.md),
      itemBuilder: (context, index) => _buildField(index),
    );
  }

  /// Build grouped layout - fields organized into sections
  Widget _buildGroupedLayout(AppSpacing spacing) {
    final groups = widget.fieldGroups;
    if (groups == null || groups.isEmpty) {
      // Fallback to flat if no groups defined
      return _buildFlatLayout(spacing);
    }

    // Build a map of fieldName -> field index for quick lookup
    final fieldIndexMap = <String, int>{};
    for (int i = 0; i < widget.fields.length; i++) {
      // Use explicit fieldName if available, fallback to label parsing
      final field = widget.fields[i];
      final fieldName = field.fieldName ?? _labelToFieldName(field.label);
      fieldIndexMap[fieldName] = i;
    }

    // Build a map of group name (derived from label) to group for copyFrom lookup
    // We need to find source groups by their identifier
    final groupMap = <String, FieldGroup>{};
    for (final group in groups) {
      // Use lowercase underscore version of label as key
      final key = _labelToFieldName(group.label);
      groupMap[key] = group;
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

        final fieldIndex = fieldIndexMap[fieldName];

        if (fieldIndex != null) {
          // Add spacing between fields within a group
          if (fieldWidgets.isNotEmpty) {
            fieldWidgets.add(SizedBox(height: spacing.md));
          }

          // Check if this field is part of a row layout
          final row = group.getRowFor(fieldName);
          if (row != null && row.length > 1) {
            // Build row of fields
            final rowWidgets = <Widget>[];
            for (int j = 0; j < row.length; j++) {
              final rowFieldName = row[j];
              final rowFieldIndex = fieldIndexMap[rowFieldName];
              if (rowFieldIndex != null) {
                if (rowWidgets.isNotEmpty) {
                  rowWidgets.add(SizedBox(width: spacing.md));
                }
                rowWidgets.add(Expanded(child: _buildField(rowFieldIndex)));
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
            fieldWidgets.add(_buildField(fieldIndex));
          }
        }
      }

      if (fieldWidgets.isNotEmpty) {
        // Build copy button if this group has copyFrom defined
        Widget? copyButton;
        if (group.copyFrom != null && widget.enabled) {
          final sourceGroup = groupMap[group.copyFrom];
          if (sourceGroup != null) {
            final copyLabel =
                group.copyFromLabel ?? 'Same as ${sourceGroup.label}';
            copyButton = CopyFieldsButton(
              label: copyLabel,
              onPressed: () => _copyFieldsFromGroup(
                sourceGroup: sourceGroup,
                targetGroup: group,
                fieldIndexMap: fieldIndexMap,
              ),
            );
          }
        }

        sections.add(
          Padding(
            padding: EdgeInsets.only(top: groupIdx > 0 ? spacing.lg : 0),
            child: FormSection(
              label: group.label,
              showDivider: groupIdx > 0,
              trailing: copyButton,
              children: fieldWidgets,
            ),
          ),
        );
      }
    }

    // Add "Other" section for fields not in any group
    final ungroupedWidgets = <Widget>[];
    for (int i = 0; i < widget.fields.length; i++) {
      final field = widget.fields[i];
      final fieldName = field.fieldName ?? _labelToFieldName(field.label);
      if (!fieldsInGroups.contains(fieldName)) {
        if (ungroupedWidgets.isNotEmpty) {
          ungroupedWidgets.add(SizedBox(height: spacing.md));
        }
        ungroupedWidgets.add(_buildField(i));
      }
    }

    if (ungroupedWidgets.isNotEmpty) {
      sections.add(
        Padding(
          padding: EdgeInsets.only(top: sections.isNotEmpty ? spacing.lg : 0),
          child: FormSection(
            label: 'Other',
            showDivider: sections.isNotEmpty,
            children: ungroupedWidgets,
          ),
        ),
      );
    }

    return ListView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: sections,
    );
  }

  /// Copy field values from source group to target group
  /// Matches fields by suffix (e.g., billing_city -> service_city)
  void _copyFieldsFromGroup({
    required FieldGroup sourceGroup,
    required FieldGroup targetGroup,
    required Map<String, int> fieldIndexMap,
  }) {
    // Extract prefix from source fields (e.g., "billing" from "billing_city")
    String? sourcePrefix;
    if (sourceGroup.fields.isNotEmpty) {
      final firstField = sourceGroup.fields.first;
      final underscoreIdx = firstField.indexOf('_');
      if (underscoreIdx > 0) {
        sourcePrefix = firstField.substring(0, underscoreIdx);
      }
    }

    // Extract prefix from target fields (e.g., "service" from "service_city")
    String? targetPrefix;
    if (targetGroup.fields.isNotEmpty) {
      final firstField = targetGroup.fields.first;
      final underscoreIdx = firstField.indexOf('_');
      if (underscoreIdx > 0) {
        targetPrefix = firstField.substring(0, underscoreIdx);
      }
    }

    if (sourcePrefix == null || targetPrefix == null) return;

    // Build new value with copied fields
    var newValue = _currentValue;
    if (newValue is Map<String, dynamic>) {
      final updatedMap = Map<String, dynamic>.from(newValue);

      for (final sourceField in sourceGroup.fields) {
        // Get suffix after prefix (e.g., "_city" from "billing_city")
        if (!sourceField.startsWith('${sourcePrefix}_')) continue;
        final suffix = sourceField.substring(sourcePrefix.length);

        // Build target field name (e.g., "service_city")
        final targetField = '$targetPrefix$suffix';

        // Copy value if target field exists
        if (targetGroup.fields.contains(targetField)) {
          updatedMap[targetField] = updatedMap[sourceField];
        }
      }

      newValue = updatedMap as T;
    }

    _handleFieldChange(newValue);
  }

  /// Build a single field widget
  Widget _buildField(int index) {
    final field = widget.fields[index];
    return GenericFormField(
      config: field,
      value: _currentValue,
      onChanged: _handleFieldChange,
      onError: (error) => _handleFieldError(index, error),
      externalError: _fieldErrors[index],
      enabled: widget.enabled,
    );
  }

  /// Convert label back to field_name format for lookup (fallback only)
  /// "First Name" -> "first_name"
  /// NOTE: Prefer using FieldConfig.fieldName when available
  String _labelToFieldName(String label) {
    return label.toLowerCase().replaceAll(' ', '_');
  }
}
