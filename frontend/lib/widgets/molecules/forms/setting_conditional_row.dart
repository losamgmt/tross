/// SettingConditionalRow - Molecule for settings that control visibility of nested settings
///
/// **SOLE RESPONSIBILITY:** Compose a parent setting with conditional child settings
/// - Pure composition - ZERO business logic
/// - Shows/hides children based on parent value
/// - Consistent indentation for nested settings
///
/// GENERIC: Works for ANY conditional setting pattern (toggle enables sub-options,
/// dropdown shows different fields based on selection, etc.)
///
/// Features:
/// - Parent setting (any setting row widget)
/// - Conditional children (shown based on condition)
/// - Consistent indentation
/// - Smooth show/hide animation
///
/// Usage:
/// ```dart
/// // Toggle with conditional children
/// SettingConditionalRow(
///   parent: SettingToggleRow(
///     label: 'Enable notifications',
///     value: notificationsEnabled,
///     onChanged: (v) => setState(() => notificationsEnabled = v),
///   ),
///   showChildren: notificationsEnabled,
///   children: [
///     SettingToggleRow(
///       label: 'Email notifications',
///       value: emailEnabled,
///       onChanged: (v) => setState(() => emailEnabled = v),
///     ),
///     SettingToggleRow(
///       label: 'Push notifications',
///       value: pushEnabled,
///       onChanged: (v) => setState(() => pushEnabled = v),
///     ),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class SettingConditionalRow extends StatelessWidget {
  /// The parent setting widget that controls visibility
  final Widget parent;

  /// Whether to show the children
  final bool showChildren;

  /// The conditional child settings
  final List<Widget> children;

  /// Whether to animate the show/hide transition
  final bool animate;

  /// Animation duration
  final Duration animationDuration;

  /// Indentation multiplier for children (relative to base spacing)
  final double indentMultiplier;

  const SettingConditionalRow({
    super.key,
    required this.parent,
    required this.showChildren,
    this.children = const [],
    this.animate = true,
    this.animationDuration = const Duration(milliseconds: 200),
    this.indentMultiplier = 2.0,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final indentWidth = spacing.md * indentMultiplier;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Parent setting
        parent,

        // Conditional children
        if (animate)
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: _buildChildren(indentWidth),
            crossFadeState: showChildren
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: animationDuration,
            sizeCurve: Curves.easeInOut,
          )
        else if (showChildren)
          _buildChildren(indentWidth),
      ],
    );
  }

  Widget _buildChildren(double indentWidth) {
    if (children.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: EdgeInsets.only(left: indentWidth),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: children,
      ),
    );
  }
}
