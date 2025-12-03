import 'package:flutter/material.dart';

/// ActionRow - Atom for right-aligned action buttons
///
/// **SOLE RESPONSIBILITY:** Layout action buttons in a right-aligned row
///
/// Features:
/// - Right-aligned button layout
/// - Consistent spacing between buttons
/// - Zero logic, pure layout
///
/// Usage:
/// ```dart
/// ActionRow(
///   actions: [
///     TextButton(onPressed: onCancel, child: Text('Cancel')),
///     FilledButton(onPressed: onSave, child: Text('Save')),
///   ],
/// )
/// ```
class ActionRow extends StatelessWidget {
  final List<Widget> actions;
  final double spacing;

  const ActionRow({super.key, required this.actions, this.spacing = 8.0});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        for (int i = 0; i < actions.length; i++) ...[
          actions[i],
          if (i < actions.length - 1) SizedBox(width: spacing),
        ],
      ],
    );
  }
}
