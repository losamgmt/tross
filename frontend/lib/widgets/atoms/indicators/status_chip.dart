/// StatusChip - Generic status indicator chip atom
///
/// **SOLE RESPONSIBILITY:** Render a colored chip indicating status
/// - Context-agnostic: NO layout assumptions
/// - Fully parameterized: label, color, icon - all configurable
/// - Parent decides: placement, spacing, grouping
///
/// GENERIC: Works for ANY status (Active/Inactive, Published/Draft,
/// Good/Fair/Poor, Approved/Pending/Rejected, etc.)
///
/// Features:
/// - Customizable background color
/// - Optional leading icon
/// - Compact and standard sizes
/// - Semantic color support via theme
///
/// Usage:
/// ```dart
/// // Simple status
/// StatusChip(
///   label: 'Active',
///   color: Colors.green,
/// )
///
/// // With icon
/// StatusChip(
///   label: 'Pending',
///   color: Colors.orange,
///   icon: Icons.hourglass_empty,
/// )
///
/// // Compact variant
/// StatusChip(
///   label: 'Draft',
///   color: Colors.grey,
///   compact: true,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class StatusChip extends StatelessWidget {
  /// The status label text
  final String label;

  /// Background color for the chip
  final Color color;

  /// Optional leading icon
  final IconData? icon;

  /// Compact mode (smaller padding and font)
  final bool compact;

  /// Whether to use outlined style instead of filled
  final bool outlined;

  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.compact = false,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Calculate contrasting text color
    final textColor = outlined ? color : _contrastingTextColor(color);
    final iconColor = textColor;

    // Size variations
    final horizontalPadding = compact ? spacing.xs : spacing.sm;
    final verticalPadding = compact ? spacing.xxs : spacing.xs;
    final fontSize = compact ? 11.0 : 12.0;
    final iconSize = compact ? 12.0 : 14.0;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: verticalPadding,
      ),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color,
        border: outlined ? Border.all(color: color, width: 1.5) : null,
        borderRadius: spacing.radiusSM,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: iconSize, color: iconColor),
            SizedBox(width: spacing.xxs),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: textColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  /// Calculate contrasting text color (black or white) based on background
  Color _contrastingTextColor(Color background) {
    // Using relative luminance formula
    final luminance = background.computeLuminance();
    return luminance > 0.5 ? Colors.black87 : Colors.white;
  }

  // === Factory constructors for common status patterns ===

  /// Success/Active status (green)
  factory StatusChip.success({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: Colors.green,
      icon: icon,
      compact: compact,
    );
  }

  /// Warning/Pending status (orange)
  factory StatusChip.warning({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: Colors.orange,
      icon: icon,
      compact: compact,
    );
  }

  /// Error/Inactive status (red)
  factory StatusChip.error({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: Colors.red,
      icon: icon,
      compact: compact,
    );
  }

  /// Neutral/Default status (grey)
  factory StatusChip.neutral({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: Colors.grey,
      icon: icon,
      compact: compact,
    );
  }

  /// Info status (blue)
  factory StatusChip.info({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: Colors.blue,
      icon: icon,
      compact: compact,
    );
  }
}
