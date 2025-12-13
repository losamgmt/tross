/// LayerStack - Molecular Wrapper for Stack
///
/// Pure single-atom molecule that provides semantic layered layout.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Stack with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic layered layout wrapper (Stack)
///
/// Single-atom molecule: Wraps Stack with semantic API.
/// Zero logic, pure composition.
class LayerStack extends StatelessWidget {
  /// Children widgets to layer (painted in order)
  final List<Widget> children;

  /// How to align non-positioned children
  final AlignmentGeometry alignment;

  /// Text direction for alignment
  final TextDirection? textDirection;

  /// How to size the stack
  final StackFit fit;

  /// Overflow behavior
  final Clip clipBehavior;

  const LayerStack({
    super.key,
    required this.children,
    this.alignment = AlignmentDirectional.topStart,
    this.textDirection,
    this.fit = StackFit.loose,
    this.clipBehavior = Clip.hardEdge,
  });

  /// Centered variant - children centered in stack
  const LayerStack.centered({
    super.key,
    required this.children,
    this.textDirection,
    this.fit = StackFit.loose,
    this.clipBehavior = Clip.hardEdge,
  }) : alignment = Alignment.center;

  /// Fill variant - children expanded to fill stack
  const LayerStack.fill({
    super.key,
    required this.children,
    this.alignment = AlignmentDirectional.topStart,
    this.textDirection,
    this.clipBehavior = Clip.hardEdge,
  }) : fit = StackFit.expand;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Stack(
      alignment: alignment,
      textDirection: textDirection,
      fit: fit,
      clipBehavior: clipBehavior,
      children: children,
    );
  }
}
