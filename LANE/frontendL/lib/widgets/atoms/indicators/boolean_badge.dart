/// BooleanBadge - Generic badge for displaying boolean values
///
/// SINGLE RESPONSIBILITY: Display boolean value as a labeled badge
///
/// GENERIC: Works for ANY boolean field (isActive, isPublished, isEnabled, etc.)
/// NOT specific to activation or any particular domain
///
/// Visual Design:
/// - True: Configurable label + style (default: "Yes" with success style)
/// - False: Configurable label + style (default: "No" with neutral style)
///
/// TESTABLE: Widget test verifies label, style, compact mode
///
/// Usage:
/// ```dart
/// // For isActive field
/// BooleanBadge(
///   value: user.isActive,
///   trueLabel: 'Active',
///   falseLabel: 'Inactive',
///   trueStyle: BadgeStyle.success,
///   falseStyle: BadgeStyle.neutral,
/// )
///
/// // For isPublished field
/// BooleanBadge(
///   value: post.isPublished,
///   trueLabel: 'Published',
///   falseLabel: 'Draft',
///   trueStyle: BadgeStyle.primary,
///   falseStyle: BadgeStyle.warning,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'status_badge.dart';

class BooleanBadge extends StatelessWidget {
  /// Current boolean value
  final bool value;

  /// Label to show when value is true
  final String trueLabel;

  /// Label to show when value is false
  final String falseLabel;

  /// Badge style to use when value is true
  final BadgeStyle trueStyle;

  /// Badge style to use when value is false
  final BadgeStyle falseStyle;

  /// Optional icon to show when value is true
  final IconData? trueIcon;

  /// Optional icon to show when value is false
  final IconData? falseIcon;

  /// Compact mode (smaller badge)
  final bool compact;

  const BooleanBadge({
    super.key,
    required this.value,
    this.trueLabel = 'Yes',
    this.falseLabel = 'No',
    this.trueStyle = BadgeStyle.success,
    this.falseStyle = BadgeStyle.neutral,
    this.trueIcon,
    this.falseIcon,
    this.compact = false,
  });

  /// Factory for active/inactive pattern (common use case)
  factory BooleanBadge.activeInactive({
    required bool value,
    bool compact = false,
  }) {
    return BooleanBadge(
      value: value,
      trueLabel: 'Active',
      falseLabel: 'Inactive',
      trueStyle: BadgeStyle.success,
      falseStyle: BadgeStyle.neutral,
      compact: compact,
    );
  }

  /// Factory for published/draft pattern
  factory BooleanBadge.publishedDraft({
    required bool value,
    bool compact = false,
  }) {
    return BooleanBadge(
      value: value,
      trueLabel: 'Published',
      falseLabel: 'Draft',
      trueStyle: BadgeStyle.info,
      falseStyle: BadgeStyle.warning,
      compact: compact,
    );
  }

  /// Factory for enabled/disabled pattern
  factory BooleanBadge.enabledDisabled({
    required bool value,
    bool compact = false,
  }) {
    return BooleanBadge(
      value: value,
      trueLabel: 'Enabled',
      falseLabel: 'Disabled',
      trueStyle: BadgeStyle.success,
      falseStyle: BadgeStyle.neutral,
      compact: compact,
    );
  }

  /// Factory for yes/no pattern
  factory BooleanBadge.yesNo({required bool value, bool compact = false}) {
    return BooleanBadge(
      value: value,
      trueLabel: 'Yes',
      falseLabel: 'No',
      trueStyle: BadgeStyle.success,
      falseStyle: BadgeStyle.neutral,
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    return StatusBadge(
      label: value ? trueLabel : falseLabel,
      style: value ? trueStyle : falseStyle,
      icon: value ? trueIcon : falseIcon,
      compact: compact,
    );
  }
}
