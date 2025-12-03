import 'package:flutter/material.dart';
import 'package:tross_app/config/app_spacing.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

/// Generic detail field display widget
///
/// **SOLE RESPONSIBILITY:** Compose label + display atom for read-only fields
/// - Handles label rendering + spacing
/// - Delegates value rendering to appropriate display atom
/// - Automatically selects correct atom based on field type
///
/// Type parameters:
/// - T: The model type (e.g., User, Role)
/// - V: The field value type (e.g., String, int, bool)
///
/// Usage:
/// ```dart
/// DetailFieldDisplay<User, String>(
///   config: FieldConfig<User, String>(
///     fieldType: FieldType.text,
///     label: 'Email',
///     getValue: (user) => user.email,
///     setValue: (user, value) => user.copyWith(email: value as String?),
///   ),
///   value: currentUser,
/// )
/// ```
class DetailFieldDisplay<T, V> extends StatelessWidget {
  final FieldConfig<T, V> config;
  final T value;

  const DetailFieldDisplay({
    super.key,
    required this.config,
    required this.value,
  });

  Widget _buildDisplayAtom(V? fieldValue) {
    switch (config.fieldType) {
      case FieldType.text:
      case FieldType.textArea:
        return TextFieldDisplay(
          value: fieldValue as String?,
          icon: config.icon,
        );

      case FieldType.number:
        return NumberFieldDisplay(value: fieldValue as num?, icon: config.icon);

      case FieldType.date:
        return DateFieldDisplay(
          value: fieldValue as DateTime?,
          icon: config.icon,
        );

      case FieldType.boolean:
        return BooleanFieldDisplay(value: fieldValue as bool?);

      case FieldType.select:
        return SelectFieldDisplay<V>(
          value: fieldValue,
          displayText: config.displayText ?? (v) => v.toString(),
          icon: config.icon,
        );
    }
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
