import 'package:flutter/material.dart';
import 'package:tross_app/config/app_spacing.dart';
import 'package:tross_app/widgets/atoms/display/field_display.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';

/// Generic detail field display widget
///
/// **SOLE RESPONSIBILITY:** Compose label + display atom for read-only fields
/// - Handles label rendering + spacing
/// - Delegates value rendering to FieldDisplay atom
/// - Automatically maps FieldType to DisplayType
///
/// Type parameters:
/// - T: The model type (e.g., User, Role)
/// - V: The field value type (e.g., String, int, bool)
class DetailFieldDisplay<T, V> extends StatelessWidget {
  final FieldConfig<T, V> config;
  final T value;

  const DetailFieldDisplay({
    super.key,
    required this.config,
    required this.value,
  });

  Widget _buildDisplayAtom(V? fieldValue) {
    // Map FieldType to DisplayType
    final displayType = switch (config.fieldType) {
      FieldType.text ||
      FieldType.textArea ||
      FieldType.asyncSelect => DisplayType.text,
      FieldType.number => DisplayType.number,
      FieldType.date => DisplayType.date,
      FieldType.time => DisplayType.time,
      FieldType.boolean => DisplayType.boolean,
      FieldType.select => DisplayType.select,
    };

    return FieldDisplay(
      value: fieldValue,
      type: displayType,
      icon: config.icon,
      displayText: config.displayText != null
          ? (v) => config.displayText!(v as V)
          : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final fieldValue = config.getValue(value);

    // Molecule's job: Compose label + display atom
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label
        Text(
          config.label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        SizedBox(height: spacing.xxs),

        // Value (delegated to atom)
        _buildDisplayAtom(fieldValue),
      ],
    );
  }
}
