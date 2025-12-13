import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// CardGrid - Organism for responsive grid layout of cards
///
/// **SOLE RESPONSIBILITY:** Layout cards in a responsive grid
/// **GENERIC:** Works with any widget children (StatCard, TitledCard, etc.)
///
/// Features:
/// - Responsive column count based on screen width
/// - Configurable spacing
/// - Configurable min/max card width
/// - Uses Wrap for natural flow
/// - Zero business logic, pure layout
///
/// Usage:
/// ```dart
/// CardGrid(
///   children: [
///     StatCard(label: 'Total', value: '42'),
///     StatCard(label: 'Active', value: '38'),
///     StatCard(label: 'Pending', value: '4'),
///   ],
/// )
///
/// // With custom sizing
/// CardGrid(
///   minCardWidth: 200,
///   maxCardWidth: 300,
///   spacing: 24,
///   children: [...],
/// )
/// ```
class CardGrid extends StatelessWidget {
  final List<Widget> children;
  final double minCardWidth;
  final double maxCardWidth;
  final double? spacing;
  final double? runSpacing;
  final WrapAlignment alignment;
  final WrapAlignment runAlignment;

  const CardGrid({
    super.key,
    required this.children,
    this.minCardWidth = 150,
    this.maxCardWidth = 300,
    this.spacing,
    this.runSpacing,
    this.alignment = WrapAlignment.start,
    this.runAlignment = WrapAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final appSpacing = context.spacing;
    final effectiveSpacing = spacing ?? appSpacing.md;
    final effectiveRunSpacing = runSpacing ?? appSpacing.md;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate optimal card width based on available space
        final availableWidth = constraints.maxWidth;
        final columns = (availableWidth / minCardWidth).floor().clamp(1, 6);
        final totalSpacing = effectiveSpacing * (columns - 1);
        final cardWidth = ((availableWidth - totalSpacing) / columns).clamp(
          minCardWidth,
          maxCardWidth,
        );

        return Wrap(
          spacing: effectiveSpacing,
          runSpacing: effectiveRunSpacing,
          alignment: alignment,
          runAlignment: runAlignment,
          children: children.map((child) {
            return SizedBox(width: cardWidth, child: child);
          }).toList(),
        );
      },
    );
  }
}
