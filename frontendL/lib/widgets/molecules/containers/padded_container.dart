/// PaddedContainer - Molecular Wrapper for Padding
///
/// Pure single-atom molecule that provides semantic padding.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Padding with semantic parameters.
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Semantic padding wrapper
///
/// Single-atom molecule: Wraps Padding with semantic API.
/// Zero logic, pure composition.
class PaddedContainer extends StatelessWidget {
  /// Child widget to be padded
  final Widget child;

  /// Padding to apply
  final EdgeInsetsGeometry padding;

  const PaddedContainer({
    super.key,
    required this.child,
    required this.padding,
  });

  /// All-sides equal padding variant
  PaddedContainer.all({super.key, required this.child, required double value})
    : padding = EdgeInsets.all(value);

  /// Symmetric padding variant (vertical and horizontal)
  PaddedContainer.symmetric({
    super.key,
    required this.child,
    double vertical = 0.0,
    double horizontal = 0.0,
  }) : padding = EdgeInsets.symmetric(
         vertical: vertical,
         horizontal: horizontal,
       );

  /// Individual sides padding variant
  PaddedContainer.only({
    super.key,
    required this.child,
    double left = 0.0,
    double top = 0.0,
    double right = 0.0,
    double bottom = 0.0,
  }) : padding = EdgeInsets.only(
         left: left,
         top: top,
         right: right,
         bottom: bottom,
       );

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Padding(padding: padding, child: child);
  }
}

/// Extension to create padded containers from spacing context
extension PaddedContainerExtensions on BuildContext {
  /// Create padded container with small padding
  Widget paddedSm(Widget child) =>
      PaddedContainer(padding: EdgeInsets.all(spacing.sm), child: child);

  /// Create padded container with medium padding
  Widget paddedMd(Widget child) =>
      PaddedContainer(padding: EdgeInsets.all(spacing.md), child: child);

  /// Create padded container with large padding
  Widget paddedLg(Widget child) =>
      PaddedContainer(padding: EdgeInsets.all(spacing.lg), child: child);

  /// Create padded container with extra large padding
  Widget paddedXl(Widget child) =>
      PaddedContainer(padding: EdgeInsets.all(spacing.xl), child: child);
}
