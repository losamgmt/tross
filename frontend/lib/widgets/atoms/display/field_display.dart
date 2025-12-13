import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Display type for FieldDisplay - determines formatting
enum DisplayType { text, number, boolean, date, time, select }

/// FieldDisplay - SINGLE unified read-only field display atom
///
/// **SOLE RESPONSIBILITY:** Render a value based on its type (no label, no layout)
/// - Context-agnostic: NO Column, NO Row assumptions
/// - Parent handles: Label rendering, layout, spacing
///
/// Replaces: TextFieldDisplay, NumberFieldDisplay, BooleanFieldDisplay,
///           DateFieldDisplay, SelectFieldDisplay
///
/// Usage:
/// ```dart
/// // Text
/// FieldDisplay(value: user.email, type: DisplayType.text)
///
/// // Boolean
/// FieldDisplay(
///   value: user.isActive,
///   type: DisplayType.boolean,
///   trueLabel: 'Active',
///   falseLabel: 'Inactive',
/// )
///
/// // Date
/// FieldDisplay(value: order.createdAt, type: DisplayType.date)
///
/// // Number
/// FieldDisplay(value: invoice.total, type: DisplayType.number, prefix: '\$')
/// ```
class FieldDisplay extends StatelessWidget {
  /// The value to display (can be any type - String, num, bool, DateTime, etc.)
  final dynamic value;

  /// The display type - determines formatting behavior
  final DisplayType type;

  /// Text to show when value is null or empty
  final String emptyText;

  /// Optional icon to show inline
  final IconData? icon;

  /// Custom text style
  final TextStyle? style;

  // === Boolean-specific options ===
  final String trueLabel;
  final String falseLabel;
  final Color? trueColor;
  final Color? falseColor;
  final IconData? trueIcon;
  final IconData? falseIcon;
  final bool showBooleanIcon;

  // === Number-specific options ===
  final String? prefix;
  final String? suffix;
  final int? decimalPlaces;

  // === Date/Time-specific options ===
  final String? dateFormat;
  final String? timeFormat;

  // === Select-specific options ===
  final String Function(dynamic)? displayText;

  const FieldDisplay({
    super.key,
    required this.value,
    required this.type,
    this.emptyText = '--',
    this.icon,
    this.style,
    // Boolean
    this.trueLabel = 'Yes',
    this.falseLabel = 'No',
    this.trueColor,
    this.falseColor,
    this.trueIcon = Icons.check_circle,
    this.falseIcon = Icons.cancel,
    this.showBooleanIcon = true,
    // Number
    this.prefix,
    this.suffix,
    this.decimalPlaces,
    // Date/Time
    this.dateFormat,
    this.timeFormat,
    // Select
    this.displayText,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final (displayValue, displayColor, displayIcon) = _formatValue(theme);
    final isEmptyState =
        value == null || (value is String && (value as String).isEmpty);

    final effectiveStyle =
        style ??
        theme.textTheme.bodyMedium?.copyWith(
          color:
              displayColor ??
              (isEmptyState
                  ? theme.colorScheme.onSurface.withValues(alpha: 0.5)
                  : theme.colorScheme.onSurface),
        );

    // Build the display widget
    if (icon != null || displayIcon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            displayIcon ?? icon,
            size: 16,
            color:
                displayColor ??
                theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          SizedBox(width: spacing.xs),
          Text(displayValue, style: effectiveStyle),
        ],
      );
    }

    return Text(displayValue, style: effectiveStyle);
  }

  /// Format the value based on type, return (text, color, icon)
  (String, Color?, IconData?) _formatValue(ThemeData theme) {
    if (value == null) {
      return (emptyText, null, null);
    }

    switch (type) {
      case DisplayType.text:
        final text = value.toString();
        return (text.isEmpty ? emptyText : text, null, null);

      case DisplayType.number:
        final num? numValue = value is num
            ? value
            : num.tryParse(value.toString());
        if (numValue == null) return (emptyText, null, null);

        String formatted;
        if (decimalPlaces != null) {
          formatted = numValue.toStringAsFixed(decimalPlaces!);
        } else if (numValue is int || numValue == numValue.roundToDouble()) {
          formatted = numValue.toInt().toString();
        } else {
          formatted = numValue.toString();
        }

        final prefixStr = prefix ?? '';
        final suffixStr = suffix ?? '';
        return ('$prefixStr$formatted$suffixStr', null, null);

      case DisplayType.boolean:
        if (value is! bool) return (emptyText, null, null);
        final boolValue = value as bool;
        return (
          boolValue ? trueLabel : falseLabel,
          boolValue ? trueColor : falseColor,
          showBooleanIcon ? (boolValue ? trueIcon : falseIcon) : null,
        );

      case DisplayType.date:
        if (value is! DateTime) return (emptyText, null, null);
        final date = value as DateTime;
        // Default format: MMM d, yyyy
        final formatted = dateFormat != null
            ? _formatDate(date, dateFormat!)
            : '${_monthName(date.month)} ${date.day}, ${date.year}';
        return (formatted, null, null);

      case DisplayType.time:
        if (value is TimeOfDay) {
          final time = value as TimeOfDay;
          final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
          final minute = time.minute.toString().padLeft(2, '0');
          final period = time.period == DayPeriod.am ? 'AM' : 'PM';
          return ('$hour:$minute $period', null, null);
        } else if (value is DateTime) {
          final date = value as DateTime;
          return (
            '${date.hour}:${date.minute.toString().padLeft(2, '0')}',
            null,
            null,
          );
        }
        return (emptyText, null, null);

      case DisplayType.select:
        if (displayText != null) {
          return (displayText!(value), null, null);
        }
        return (value.toString(), null, null);
    }
  }

  String _monthName(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month - 1];
  }

  String _formatDate(DateTime date, String format) {
    // Simple format support - expand as needed
    return format
        .replaceAll('yyyy', date.year.toString())
        .replaceAll('MM', date.month.toString().padLeft(2, '0'))
        .replaceAll('dd', date.day.toString().padLeft(2, '0'))
        .replaceAll('MMM', _monthName(date.month));
  }
}
