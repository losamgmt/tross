import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// ActionGrid - Organism for responsive grid of action buttons
///
/// **SOLE RESPONSIBILITY:** Layout action buttons in a responsive grid
/// **GENERIC:** Works with any button widgets
///
/// Features:
/// - Responsive column count based on screen width
/// - Configurable spacing
/// - Uniform button sizing
/// - Uses Wrap for natural flow
/// - Zero business logic, pure layout
///
/// Usage:
/// ```dart
/// ActionGrid(
///   children: [
///     ElevatedButton.icon(
///       icon: Icon(Icons.add),
///       label: Text('New Work Order'),
///       onPressed: () => createWorkOrder(),
///     ),
///     ElevatedButton.icon(
///       icon: Icon(Icons.calendar_today),
///       label: Text('Schedule'),
///       onPressed: () => openSchedule(),
///     ),
///   ],
/// )
/// ```
class ActionGrid extends StatelessWidget {
  final List<Widget> children;
  final double minButtonWidth;
  final double maxButtonWidth;
  final double? spacing;
  final double? runSpacing;
  final WrapAlignment alignment;

  const ActionGrid({
    super.key,
    required this.children,
    this.minButtonWidth = 120,
    this.maxButtonWidth = 200,
    this.spacing,
    this.runSpacing,
    this.alignment = WrapAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final appSpacing = context.spacing;
    final effectiveSpacing = spacing ?? appSpacing.md;
    final effectiveRunSpacing = runSpacing ?? appSpacing.md;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate optimal button width
        final availableWidth = constraints.maxWidth;
        final columns = (availableWidth / minButtonWidth).floor().clamp(1, 6);
        final totalSpacing = effectiveSpacing * (columns - 1);
        final buttonWidth = ((availableWidth - totalSpacing) / columns).clamp(
          minButtonWidth,
          maxButtonWidth,
        );

        return Wrap(
          spacing: effectiveSpacing,
          runSpacing: effectiveRunSpacing,
          alignment: alignment,
          children: children.map((child) {
            return SizedBox(width: buttonWidth, child: child);
          }).toList(),
        );
      },
    );
  }
}
