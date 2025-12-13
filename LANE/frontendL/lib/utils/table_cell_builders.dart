/// Table Cell Builders - Helper functions for building table cells
///
/// **SOLE RESPONSIBILITY:** Provide reusable cell builder functions
/// - Wraps common cell patterns (text, badge, editable, etc.)
/// - Reduces boilerplate in table configs
/// - Zero UI components, pure builder functions
///
/// These are NOT molecules—they're helper functions that return atoms/organisms
library;

import 'package:flutter/material.dart';
import '../config/role_config.dart';
import '../widgets/atoms/atoms.dart';
import '../widgets/organisms/fields/editable_field.dart';

/// Table cell builder helpers
class TableCellBuilders {
  /// Build a text cell with primary emphasis
  static Widget textCell(String text, {ValueEmphasis? emphasis}) {
    return DataValue(text: text, emphasis: emphasis ?? ValueEmphasis.primary);
  }

  /// Build an email cell
  static Widget emailCell(String email) {
    return DataValue.email(email);
  }

  /// Build an ID cell (numeric, centered)
  static Widget idCell(String id) {
    return DataValue.id(id);
  }

  /// Build a timestamp cell
  static Widget timestampCell(DateTime timestamp) {
    return DataValue.timestamp(timestamp);
  }

  /// Build a role badge cell using RoleConfig
  static Widget roleBadgeCell(String roleName) {
    final config = RoleConfig.getBadgeConfig(roleName);
    return StatusBadge(label: roleName, style: config.$1, icon: config.$2);
  }

  /// Build a generic status badge cell
  static Widget statusBadgeCell({
    required String label,
    required BadgeStyle style,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusBadge(
      label: label,
      style: style,
      icon: icon,
      compact: compact,
    );
  }

  /// Build a boolean badge cell (yes/no, true/false, etc.)
  static Widget booleanBadgeCell({
    required bool value,
    required String trueLabel,
    required String falseLabel,
    required BadgeStyle trueStyle,
    required BadgeStyle falseStyle,
    IconData? trueIcon,
    IconData? falseIcon,
    bool compact = false,
  }) {
    return StatusBadge(
      label: value ? trueLabel : falseLabel,
      style: value ? trueStyle : falseStyle,
      icon: value ? trueIcon : falseIcon,
      compact: compact,
    );
  }

  /// Build a nullable text cell (shows '—' for null/empty)
  static Widget nullableTextCell(String? text, {ValueEmphasis? emphasis}) {
    if (text == null || text.isEmpty) {
      return const DataValue(text: '—', emphasis: ValueEmphasis.tertiary);
    }
    return DataValue(text: text, emphasis: emphasis ?? ValueEmphasis.primary);
  }

  /// Build a nullable numeric cell (shows '—' for null)
  static Widget nullableNumericCell(num? value) {
    if (value == null) {
      return const DataValue(text: '—', emphasis: ValueEmphasis.tertiary);
    }
    return DataValue.id(value.toString());
  }

  /// Build an editable boolean field cell (active/inactive toggle)
  static Widget editableBooleanCell<T>({
    required T item,
    required bool value,
    required Future<bool> Function(bool newValue) onUpdate,
    VoidCallback? onChanged,
    required String fieldName,
    required String trueAction,
    required String falseAction,
    bool compact = true,
  }) {
    return EditableField<T, bool>(
      value: value,
      displayWidget: BooleanBadge.activeInactive(
        value: value,
        compact: compact,
      ),
      editWidget: (val, onChange) => BooleanToggle.activeInactive(
        value: val,
        onToggle: () => onChange(!val),
        compact: compact,
      ),
      onUpdate: (newValue) => onUpdate(newValue),
      onChanged: onChanged,
      confirmationConfig: ConfirmationConfig.boolean(
        fieldName: fieldName,
        trueAction: trueAction,
        falseAction: falseAction,
      ),
    );
  }
}
