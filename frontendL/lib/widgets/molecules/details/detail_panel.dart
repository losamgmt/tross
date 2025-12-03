import 'package:flutter/material.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/molecules/details/detail_field.dart';

/// Generic detail panel widget that displays all fields of a model
///
/// **SOLE RESPONSIBILITY:** Render read-only detail fields ONLY
/// - Context-agnostic: NO Padding, NO title
/// - Parent handles: Container sizing, padding, title rendering
///
/// Renders multiple fields in read-only mode based on configuration.
///
/// Type parameter:
/// - T: The model type (e.g., User, Role)
///
/// Usage:
/// ```dart
/// DetailPanel<User>(
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
/// )
/// ```
class DetailPanel<T> extends StatelessWidget {
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final double spacing;

  const DetailPanel({
    super.key,
    required this.value,
    required this.fields,
    this.spacing = 16.0,
  });

  @override
  Widget build(BuildContext context) {
    // Context-agnostic: Just render fields, NO container/padding assumptions
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
}
