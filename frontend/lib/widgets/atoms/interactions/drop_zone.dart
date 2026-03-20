/// DropZone - Generic drop target for draggable items
///
/// SOLE RESPONSIBILITY: Accept draggable data and invoke callback
///
/// ZERO STYLING OPINIONS:
/// - Builder receives hover state; caller handles visual feedback
/// - No hardcoded colors, sizes, or decorations
/// - Styling comes from theme or app constants at usage site
///
/// USAGE:
/// ```dart
/// // Basic drop zone
/// DropZone<int>(
///   onDrop: (workOrderId) {
///     provider.updateEntity('work_order', workOrderId, {
///       'scheduled_start': slot.start.toIso8601String(),
///     });
///   },
///   builder: (context, isHovering) => Container(
///     color: isHovering ? theme.hoverColor : null,
///     child: slotContent,
///   ),
/// )
///
/// // With acceptance validation
/// DropZone<int>(
///   canAccept: (id) => id != null && !isSlotFull,
///   onDrop: (id) => assignToSlot(id),
///   builder: (context, isHovering) => SlotWidget(highlighted: isHovering),
/// )
///
/// // With detailed hover info
/// DropZone<int>.detailed(
///   onDrop: (id) => handleDrop(id),
///   builder: (context, candidateData, rejectedData) {
///     final isAccepting = candidateData.isNotEmpty;
///     final isRejecting = rejectedData.isNotEmpty;
///     return SlotWidget(
///       state: isAccepting ? SlotState.accepting
///            : isRejecting ? SlotState.rejecting
///            : SlotState.idle,
///     );
///   },
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Generic drop target - entity-agnostic, style-agnostic
///
/// Type parameter [T] must match the [DraggableItem<T>] data type.
class DropZone<T extends Object> extends StatelessWidget {
  /// Called when compatible data is dropped
  final void Function(T data) onDrop;

  /// Optional: validate before accepting (return false to reject)
  ///
  /// Rejected items show [rejectedData] in detailed builder.
  /// If null, all non-null items of type [T] are accepted.
  final bool Function(T? data)? canAccept;

  /// Builder receives hover state for visual feedback
  ///
  /// [isHovering] is true when a compatible draggable is over this zone.
  /// Caller handles all styling via theme/constants.
  final Widget Function(BuildContext context, bool isHovering)? builder;

  /// Detailed builder with full candidate/rejected info
  ///
  /// Use when you need to distinguish between:
  /// - Idle (nothing hovering)
  /// - Accepting (compatible item hovering)
  /// - Rejecting (incompatible item hovering)
  final Widget Function(
    BuildContext context,
    List<T?> candidateData,
    List<dynamic> rejectedData,
  )?
  detailedBuilder;

  /// Static child (no hover feedback needed)
  ///
  /// Use when the drop zone appearance doesn't change on hover.
  /// Mutually exclusive with [builder] - provide one or the other.
  final Widget? child;

  const DropZone({
    super.key,
    required this.onDrop,
    this.canAccept,
    this.builder,
    this.child,
  }) : detailedBuilder = null,
       assert(
         builder == null || child == null,
         'Provide either builder or child, not both',
       );

  /// Constructor with detailed candidate/rejected info
  const DropZone.detailed({
    super.key,
    required this.onDrop,
    required Widget Function(
      BuildContext context,
      List<T?> candidateData,
      List<dynamic> rejectedData,
    )
    builder,
    this.canAccept,
  }) : detailedBuilder = builder,
       builder = null,
       child = null;

  @override
  Widget build(BuildContext context) {
    return DragTarget<T>(
      onWillAcceptWithDetails: (details) =>
          canAccept?.call(details.data) ?? true,
      onAcceptWithDetails: (details) => onDrop(details.data),
      builder: (context, candidateData, rejectedData) {
        // Detailed builder gets full info
        if (detailedBuilder != null) {
          return detailedBuilder!(context, candidateData, rejectedData);
        }

        // Simple builder just gets hover state
        if (builder != null) {
          final isHovering = candidateData.isNotEmpty;
          return builder!(context, isHovering);
        }

        // Static child
        return child ?? const SizedBox.shrink();
      },
    );
  }
}
