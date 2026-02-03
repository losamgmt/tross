/// SwipeAction - Platform-aware swipe-to-action wrapper
///
/// Provides swipe gestures for list items on touch devices:
/// - Leading actions (swipe right → actions appear on left)
/// - Trailing actions (swipe left → actions appear on right)
/// - Confirm dismiss with threshold
/// - Haptic feedback at threshold
///
/// Platform-aware:
/// - Touch devices: Full swipe functionality
/// - Pointer devices: Disabled (uses hover actions instead)
///
/// Usage:
/// ```dart
/// SwipeAction(
///   onDismiss: () => deleteItem(),
///   confirmDismiss: () async => await showConfirmDialog(),
///   background: SwipeActionBackground.delete(),
///   child: ListTile(title: Text('Item')),
/// )
///
/// // With custom actions
/// SwipeAction.actions(
///   leadingActions: [
///     SwipeActionItem(
///       icon: Icons.archive,
///       color: Colors.blue,
///       onTap: () => archiveItem(),
///     ),
///   ],
///   trailingActions: [
///     SwipeActionItem(
///       icon: Icons.delete,
///       color: Colors.red,
///       onTap: () => deleteItem(),
///     ),
///   ],
///   child: ListTile(title: Text('Item')),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/platform_utilities.dart';

/// Individual action item for swipe actions
class SwipeActionItem {
  final IconData icon;
  final Color color;
  final Color? iconColor;
  final String? label;
  final VoidCallback onTap;

  const SwipeActionItem({
    required this.icon,
    required this.color,
    this.iconColor,
    this.label,
    required this.onTap,
  });
}

/// Background widget for simple dismiss swipe
class SwipeActionBackground extends StatelessWidget {
  final Color color;
  final IconData icon;
  final Color iconColor;
  final Alignment alignment;
  final String? label;

  const SwipeActionBackground({
    super.key,
    required this.color,
    required this.icon,
    this.iconColor = Colors.white,
    this.alignment = Alignment.centerRight,
    this.label,
  });

  /// Delete action background (red, trash icon, right-aligned)
  factory SwipeActionBackground.delete({String? label}) {
    return SwipeActionBackground(
      color: Colors.red,
      icon: Icons.delete,
      alignment: Alignment.centerRight,
      label: label ?? 'Delete',
    );
  }

  /// Archive action background (blue, archive icon, left-aligned)
  factory SwipeActionBackground.archive({String? label}) {
    return SwipeActionBackground(
      color: Colors.blue,
      icon: Icons.archive,
      alignment: Alignment.centerLeft,
      label: label ?? 'Archive',
    );
  }

  /// Edit action background (orange, edit icon)
  factory SwipeActionBackground.edit({
    String? label,
    Alignment alignment = Alignment.centerRight,
  }) {
    return SwipeActionBackground(
      color: Colors.orange,
      icon: Icons.edit,
      alignment: alignment,
      label: label ?? 'Edit',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isRight = alignment == Alignment.centerRight;
    return Container(
      color: color,
      alignment: alignment,
      padding: EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!isRight && label != null) ...[
            Text(
              label!,
              style: TextStyle(color: iconColor, fontWeight: FontWeight.w600),
            ),
            const SizedBox(width: 8),
          ],
          Icon(icon, color: iconColor),
          if (isRight && label != null) ...[
            const SizedBox(width: 8),
            Text(
              label!,
              style: TextStyle(color: iconColor, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}

/// Platform-aware swipe action wrapper
///
/// On touch devices: Enables swipe gestures
/// On pointer devices: Renders child directly (use hover actions)
class SwipeAction extends StatelessWidget {
  final Widget child;
  final VoidCallback? onDismiss;
  final Future<bool> Function()? confirmDismiss;
  final Widget? background;
  final Widget? secondaryBackground;
  final DismissDirection direction;
  final Duration resizeDuration;
  final double dismissThreshold;
  final bool hapticFeedbackOnThreshold;

  const SwipeAction({
    super.key,
    required this.child,
    this.onDismiss,
    this.confirmDismiss,
    this.background,
    this.secondaryBackground,
    this.direction = DismissDirection.horizontal,
    this.resizeDuration = const Duration(milliseconds: 300),
    this.dismissThreshold = 0.4,
    this.hapticFeedbackOnThreshold = true,
  });

  /// Convenience constructor for delete swipe
  factory SwipeAction.delete({
    Key? key,
    required Widget child,
    required VoidCallback onDelete,
    Future<bool> Function()? confirmDelete,
    String? label,
  }) {
    return SwipeAction(
      key: key,
      onDismiss: onDelete,
      confirmDismiss: confirmDelete,
      direction: DismissDirection.endToStart,
      background: SwipeActionBackground.delete(label: label),
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    // On pointer devices, just render the child directly
    // Hover actions should be used instead of swipe
    if (PlatformUtilities.isPointerDevice) {
      return child;
    }

    return Dismissible(
      key: key ?? UniqueKey(),
      direction: direction,
      onDismissed: onDismiss != null ? (_) => onDismiss!() : null,
      confirmDismiss: confirmDismiss != null
          ? (_) async {
              if (hapticFeedbackOnThreshold) {
                HapticFeedback.mediumImpact();
              }
              return await confirmDismiss!();
            }
          : null,
      background: background,
      secondaryBackground: secondaryBackground ?? background,
      resizeDuration: resizeDuration,
      dismissThresholds: {direction: dismissThreshold},
      child: child,
    );
  }
}

/// Multi-action swipe container using Dismissible with action reveal
///
/// For more complex swipe actions (multiple buttons), consider using
/// a package like flutter_slidable. This provides basic functionality.
class SwipeActionContainer extends StatefulWidget {
  final Widget child;
  final List<SwipeActionItem> leadingActions;
  final List<SwipeActionItem> trailingActions;
  final double actionWidth;

  const SwipeActionContainer({
    super.key,
    required this.child,
    this.leadingActions = const [],
    this.trailingActions = const [],
    this.actionWidth = 72,
  });

  @override
  State<SwipeActionContainer> createState() => _SwipeActionContainerState();
}

class _SwipeActionContainerState extends State<SwipeActionContainer> {
  double _dragExtent = 0;

  @override
  Widget build(BuildContext context) {
    // On pointer devices, just render the child
    if (PlatformUtilities.isPointerDevice) {
      return widget.child;
    }

    return GestureDetector(
      onHorizontalDragUpdate: (details) {
        setState(() {
          _dragExtent += details.primaryDelta ?? 0;
          // Limit drag extent
          final maxLeading = widget.leadingActions.length * widget.actionWidth;
          final maxTrailing =
              widget.trailingActions.length * widget.actionWidth;
          _dragExtent = _dragExtent.clamp(-maxTrailing, maxLeading);
        });
      },
      onHorizontalDragEnd: (details) {
        // Snap to action position or back to zero
        final threshold = widget.actionWidth * 0.5;
        setState(() {
          if (_dragExtent.abs() < threshold) {
            _dragExtent = 0;
          } else if (_dragExtent > 0) {
            _dragExtent = widget.leadingActions.length * widget.actionWidth;
          } else {
            _dragExtent = -widget.trailingActions.length * widget.actionWidth;
          }
        });
        if (_dragExtent.abs() > threshold) {
          HapticFeedback.selectionClick();
        }
      },
      child: Stack(
        children: [
          // Background actions
          Positioned.fill(
            child: Row(
              children: [
                // Leading actions
                ...widget.leadingActions.map(
                  (action) => SizedBox(
                    width: widget.actionWidth,
                    child: Material(
                      color: action.color,
                      child: InkWell(
                        onTap: () {
                          action.onTap();
                          setState(() => _dragExtent = 0);
                        },
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                action.icon,
                                color: action.iconColor ?? Colors.white,
                              ),
                              if (action.label != null)
                                Text(
                                  action.label!,
                                  style: TextStyle(
                                    color: action.iconColor ?? Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                // Trailing actions
                ...widget.trailingActions.map(
                  (action) => SizedBox(
                    width: widget.actionWidth,
                    child: Material(
                      color: action.color,
                      child: InkWell(
                        onTap: () {
                          action.onTap();
                          setState(() => _dragExtent = 0);
                        },
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                action.icon,
                                color: action.iconColor ?? Colors.white,
                              ),
                              if (action.label != null)
                                Text(
                                  action.label!,
                                  style: TextStyle(
                                    color: action.iconColor ?? Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Foreground content
          AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            transform: Matrix4.translationValues(_dragExtent, 0, 0),
            child: widget.child,
          ),
        ],
      ),
    );
  }
}
