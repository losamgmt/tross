/// ConditionalDisplay - Generic molecule for conditional rendering
///
/// SINGLE RESPONSIBILITY: Show/hide content based on boolean prop
/// 100% GENERIC - receives condition as prop, NO permission checking logic!
///
/// Parent organism handles permission checks and passes boolean down.
///
/// Usage:
/// ```dart
/// // In organism:
/// final hasPermission = authProvider.hasPermission('users', 'edit');
///
/// // Pass to molecule:
/// ConditionalDisplay(
///   condition: hasPermission,
///   child: EditButton(),
///   fallback: Text('No permission'),
/// )
/// ```
library;

import 'package:flutter/material.dart';

class ConditionalDisplay extends StatelessWidget {
  /// Whether to show the child
  final bool condition;

  /// Widget to show when condition is true
  final Widget child;

  /// Optional widget to show when condition is false
  final Widget? fallback;

  const ConditionalDisplay({
    super.key,
    required this.condition,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    return condition ? child : (fallback ?? const SizedBox.shrink());
  }
}
