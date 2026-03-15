/// CollapseController - Atomic collapse state manager
///
/// Pure behavior atom that manages expanded/collapsed state with optional animation.
/// Zero visual styling - delegates ALL rendering to the builder function.
///
/// This enables composable collapsibility: ANY widget can become collapsible
/// by wrapping with CollapseController and using the builder's state.
///
/// **Builder parameters:**
/// - `isExpanded`: Current expand state
/// - `toggle`: Callback to toggle state
/// - `animation`: 0.0→1.0 animation for smooth transitions (use with SizeTransition, etc.)
///
/// Usage:
/// ```dart
/// // With TitledCard
/// CollapseController(
///   builder: (context, isExpanded, toggle, animation) => TitledCard(
///     title: 'Filters',
///     trailing: CollapseToggleIcon(isExpanded: isExpanded, onTap: toggle),
///     child: isExpanded ? FilterPanel() : null,
///   ),
/// )
///
/// // With animation
/// CollapseController(
///   builder: (context, isExpanded, toggle, animation) => Column(
///     children: [
///       GestureDetector(onTap: toggle, child: Text('Header')),
///       SizeTransition(sizeFactor: animation, child: Content()),
///     ],
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Builder function signature for CollapseController
///
/// - `context`: Build context
/// - `isExpanded`: Whether content is currently expanded
/// - `toggle`: Callback to toggle expanded state
/// - `animation`: Animation value (0.0 = collapsed, 1.0 = expanded)
typedef CollapseBuilder =
    Widget Function(
      BuildContext context,
      bool isExpanded,
      VoidCallback toggle,
      Animation<double> animation,
    );

/// Atomic collapse state manager with zero styling
///
/// Manages expand/collapse state and animation, delegating all visuals to builder.
class CollapseController extends StatefulWidget {
  /// Builder that receives collapse state and renders the widget
  final CollapseBuilder builder;

  /// Initial expanded state (defaults to true = expanded)
  final bool initiallyExpanded;

  /// Animation duration for expand/collapse transition
  final Duration duration;

  /// Animation curve for expand transition
  final Curve expandCurve;

  /// Animation curve for collapse transition
  final Curve collapseCurve;

  /// Callback when expanded state changes
  final ValueChanged<bool>? onExpansionChanged;

  const CollapseController({
    super.key,
    required this.builder,
    this.initiallyExpanded = true,
    this.duration = const Duration(milliseconds: 200),
    this.expandCurve = Curves.easeOut,
    this.collapseCurve = Curves.easeIn,
    this.onExpansionChanged,
  });

  @override
  State<CollapseController> createState() => CollapseControllerState();
}

/// Exposed state for programmatic control via `GlobalKey<CollapseControllerState>`
class CollapseControllerState extends State<CollapseController>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
    _controller = AnimationController(
      duration: widget.duration,
      vsync: this,
      value: _isExpanded ? 1.0 : 0.0,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: widget.expandCurve,
      reverseCurve: widget.collapseCurve,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Current expanded state
  bool get isExpanded => _isExpanded;

  /// Toggle expanded state
  void toggle() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
    widget.onExpansionChanged?.call(_isExpanded);
  }

  /// Programmatically expand
  void expand() {
    if (!_isExpanded) toggle();
  }

  /// Programmatically collapse
  void collapse() {
    if (_isExpanded) toggle();
  }

  /// Set expanded state directly
  void setExpanded(bool expanded) {
    if (expanded != _isExpanded) toggle();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, _) =>
          widget.builder(context, _isExpanded, toggle, _animation),
    );
  }
}
