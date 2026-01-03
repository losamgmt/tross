/// CheckboxInput - Generic checkbox atom
///
/// **SOLE RESPONSIBILITY:** Render a checkbox with label
/// - Context-agnostic: NO layout assumptions
/// - Parent decides: grouping, layout, spacing
///
/// GENERIC: Works for ANY boolean selection (terms agreement, feature toggles,
/// multi-select options, etc.)
///
/// Differs from BooleanToggle:
/// - Standard checkbox UI vs icon-based toggle button
/// - Designed for forms/lists vs inline status toggles
/// - Includes label text vs standalone icon
///
/// Features:
/// - Customizable label
/// - Optional description text
/// - Enabled/disabled states
/// - Compact and standard sizes
/// - Tristate support (true/false/null)
///
/// Usage:
/// ```dart
/// // Simple checkbox
/// CheckboxInput(
///   value: acceptTerms,
///   onChanged: (value) => setState(() => acceptTerms = value),
///   label: 'I accept the terms and conditions',
/// )
///
/// // With description
/// CheckboxInput(
///   value: sendNewsletter,
///   onChanged: (value) => setState(() => sendNewsletter = value),
///   label: 'Subscribe to newsletter',
///   description: 'Receive weekly updates and promotions',
/// )
///
/// // Tristate
/// CheckboxInput(
///   value: selectAll, // null = indeterminate
///   onChanged: handleSelectAll,
///   label: 'Select All',
///   tristate: true,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_sizes.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

class CheckboxInput extends StatelessWidget {
  /// Current checked value (null = indeterminate if tristate)
  final bool? value;

  /// Callback when checkbox is toggled
  final ValueChanged<bool?> onChanged;

  /// Label text next to the checkbox
  final String label;

  /// Optional description below the label
  final String? description;

  /// Whether the checkbox is enabled
  final bool enabled;

  /// Compact mode (smaller visual)
  final bool compact;

  /// Whether to allow tristate (true/false/null)
  final bool tristate;

  const CheckboxInput({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.description,
    this.enabled = true,
    this.compact = false,
    this.tristate = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final sizes = context.sizes;
    final theme = Theme.of(context);

    final isChecked = value == true;
    final checkboxSize = compact
        ? sizes.buttonHeightSmall
        : sizes.buttonHeightMedium;
    final labelStyle = compact
        ? theme.textTheme.bodySmall
        : theme.textTheme.bodyMedium;
    final descStyle = theme.textTheme.bodySmall;

    return InkWell(
      onTap: enabled ? () => _handleTap() : null,
      borderRadius: spacing.radiusSM,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: spacing.xxs),
        child: Row(
          crossAxisAlignment: description != null
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: checkboxSize,
              height: checkboxSize,
              child: Checkbox(
                value: value,
                onChanged: enabled ? onChanged : null,
                tristate: tristate,
                materialTapTargetSize: compact
                    ? MaterialTapTargetSize.shrinkWrap
                    : MaterialTapTargetSize.padded,
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: labelStyle?.copyWith(
                      fontWeight: isChecked
                          ? AppTypography.medium
                          : AppTypography.regular,
                      color: enabled
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurface.withValues(
                              alpha: AppColors.opacityHint,
                            ),
                    ),
                  ),
                  if (description != null) ...[
                    SizedBox(height: spacing.xxs / 2),
                    Text(
                      description!,
                      style: descStyle?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: AppColors.opacitySecondary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleTap() {
    if (tristate) {
      // Tristate cycle: null -> true -> false -> null
      if (value == null) {
        onChanged(true);
      } else if (value == true) {
        onChanged(false);
      } else {
        onChanged(null);
      }
    } else {
      // Binary toggle
      onChanged(!(value ?? false));
    }
  }
}
