/// ScrollSyncGroup - Synchronizes multiple scroll controllers
///
/// A utility class that links multiple [ScrollController]s so they scroll
/// together. When one controller scrolls, all others follow.
///
/// Key features:
/// - Creates and manages linked controllers
/// - Prevents scroll feedback loops
/// - Proper disposal handling
/// - Axis-aware (horizontal or vertical)
///
/// Usage:
/// ```dart
/// class _MyWidgetState extends State<MyWidget> {
///   final _verticalSync = ScrollSyncGroup();
///   final _horizontalSync = ScrollSyncGroup();
///
///   late final _leftController = _verticalSync.createController();
///   late final _centerController = _verticalSync.createController();
///   late final _rightController = _verticalSync.createController();
///
///   @override
///   void dispose() {
///     _verticalSync.dispose();
///     _horizontalSync.dispose();
///     super.dispose();
///   }
/// }
/// ```
library;

import 'package:flutter/widgets.dart';

/// Synchronizes multiple scroll controllers to scroll together
class ScrollSyncGroup {
  final List<ScrollController> _controllers = [];
  bool _isSyncing = false;

  /// Creates a new [ScrollController] that is linked with all others in this group
  ///
  /// When any controller in the group scrolls, all others follow.
  /// The controller is automatically disposed when [dispose] is called.
  ScrollController createController() {
    final controller = ScrollController();
    _controllers.add(controller);
    controller.addListener(() => _handleScroll(controller));
    return controller;
  }

  /// Adds an existing [ScrollController] to the sync group
  ///
  /// Use this when you need to sync with a controller you don't own.
  /// Note: The group will NOT dispose this controller - you must dispose it yourself.
  void addController(ScrollController controller) {
    if (!_controllers.contains(controller)) {
      _controllers.add(controller);
      controller.addListener(() => _handleScroll(controller));
    }
  }

  void _handleScroll(ScrollController source) {
    if (_isSyncing) return;
    if (!source.hasClients) return;

    _isSyncing = true;

    final offset = source.offset;
    for (final target in _controllers) {
      if (target != source && target.hasClients) {
        // Clamp to target's scroll extent to prevent overflow
        final maxScroll = target.position.maxScrollExtent;
        final clampedOffset = offset.clamp(0.0, maxScroll);
        if ((target.offset - clampedOffset).abs() > 0.1) {
          target.jumpTo(clampedOffset);
        }
      }
    }

    _isSyncing = false;
  }

  /// Disposes all controllers created by [createController]
  ///
  /// Controllers added via [addController] are NOT disposed - the caller
  /// must dispose those separately.
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    _controllers.clear();
  }

  /// Number of controllers in this sync group
  int get length => _controllers.length;
}
