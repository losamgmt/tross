/// TouchTarget - Platform-aware tappable area wrapper
///
/// Ensures minimum touch/pointer target sizes per Material Design.
/// Mobile: 48dp minimum with haptic feedback.
/// Web/Desktop: 24dp minimum, pointer-friendly.
///
/// Usage:
/// ```dart
/// // Basic wrapper
/// TouchTarget(onTap: _handleTap, child: MyWidget())
///
/// // Icon button replacement
/// TouchTarget.icon(icon: Icons.refresh, onTap: _refresh, tooltip: 'Refresh')
/// ```
///
/// **Note:** Do NOT use TouchTarget.icon for TextField suffixIcon on web.
/// Use standard IconButton instead - TouchTarget causes layout issues.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/platform_utilities.dart';
import '../../../config/app_spacing.dart';

/// Platform-aware tappable area wrapper
class TouchTarget extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final String? semanticLabel;
  final String? tooltip;
  final bool enabled;
  final bool hapticFeedback;

  const TouchTarget({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.semanticLabel,
    this.tooltip,
    this.enabled = true,
    this.hapticFeedback = true,
  });

  /// Convenience factory for icon buttons
  factory TouchTarget.icon({
    Key? key,
    required IconData icon,
    VoidCallback? onTap,
    String? tooltip,
    bool enabled = true,
    double? size,
    Color? color,
  }) {
    return TouchTarget(
      key: key,
      onTap: onTap,
      tooltip: tooltip,
      semanticLabel: tooltip,
      enabled: enabled,
      child: Icon(icon, size: size ?? 24, color: color),
    );
  }

  /// Convenience factory for input suffix icons (InputDecoration.suffixIcon)
  ///
  /// Returns Widget? to match InputDecoration.suffixIcon signature.
  /// Uses constrained sizing appropriate for text field suffix.
  static Widget? suffix({
    required IconData icon,
    VoidCallback? onTap,
    String? tooltip,
    bool enabled = true,
    double? size,
    Color? color,
  }) {
    if (onTap == null) return null;
    return TouchTarget.icon(
      icon: icon,
      onTap: onTap,
      tooltip: tooltip,
      enabled: enabled,
      size: size,
      color: color,
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final minSize = PlatformUtilities.minInteractiveSize;

    // Core content with minimum size constraint
    Widget content = ConstrainedBox(
      constraints: BoxConstraints(minWidth: minSize, minHeight: minSize),
      child: Center(child: child),
    );

    // Disabled state - early return with opacity only
    if (!enabled) {
      return Opacity(opacity: 0.5, child: content);
    }

    // Interactive with ink effect (only if callbacks present)
    if (onTap != null || onLongPress != null) {
      content = Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: _handleTap,
          onLongPress: onLongPress != null ? _handleLongPress : null,
          borderRadius: spacing.radiusSM,
          child: content,
        ),
      );
    }

    // Accessibility (always add if provided)
    if (semanticLabel != null) {
      content = Semantics(
        button: onTap != null || onLongPress != null,
        enabled: true,
        label: semanticLabel,
        child: content,
      );
    }

    // Tooltip (always add if provided)
    if (tooltip != null) {
      content = Tooltip(
        message: tooltip!,
        waitDuration: const Duration(milliseconds: 500),
        child: content,
      );
    }

    return content;
  }

  void _handleTap() {
    if (hapticFeedback && PlatformUtilities.isTouchDevice) {
      HapticFeedback.lightImpact();
    }
    onTap?.call();
  }

  void _handleLongPress() {
    if (hapticFeedback && PlatformUtilities.isTouchDevice) {
      HapticFeedback.mediumImpact();
    }
    onLongPress?.call();
  }
}
