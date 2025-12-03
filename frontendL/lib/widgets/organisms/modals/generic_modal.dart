import 'package:flutter/material.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import 'package:tross_app/config/app_spacing.dart';
import 'package:tross_app/services/navigation_coordinator.dart';

/// GenericModal - Organism for modal dialogs via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose atoms into modal layout structure
///
/// Architecture:
/// - NO implementation, ONLY composition
/// - Reuses: ScrollableContainer, SectionDivider, ActionRow atoms
/// - Tests composition, NOT implementation details
///
/// Usage:
/// ```dart
/// GenericModal(
///   title: 'User Details',
///   content: DetailPanel<User>(...),
///   actions: [
///     TextButton(onPressed: () => Navigator.pop(context), child: Text('Close')),
///   ],
/// )
/// ```
class GenericModal extends StatelessWidget {
  final String? title;
  final Widget content;
  final List<Widget>? actions;
  final bool showCloseButton;
  final VoidCallback? onClose;
  final double? width;
  final double? maxHeight;
  final EdgeInsets? padding;
  final bool dismissible;

  const GenericModal({
    super.key,
    this.title,
    required this.content,
    this.actions,
    this.showCloseButton = true,
    this.onClose,
    this.width,
    this.maxHeight,
    this.padding,
    this.dismissible = true,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final screenHeight = MediaQuery.of(context).size.height;
    final effectiveMaxHeight = maxHeight ?? screenHeight * 0.85;

    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: width ?? 600,
          maxHeight: effectiveMaxHeight,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header: Title + Close button
            if (title != null || showCloseButton) ...[
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (title != null)
                      Flexible(
                        child: Text(
                          title!,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    if (showCloseButton)
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed:
                            onClose ?? () => NavigationCoordinator.pop(context),
                        tooltip: 'Close',
                      ),
                  ],
                ),
              ),
              const SectionDivider(),
            ],

            // Content: Scrollable container (atom composition)
            Flexible(
              child: ScrollableContainer.vertical(
                child: Padding(
                  padding: padding ?? EdgeInsets.all(spacing.md),
                  child: content,
                ),
              ),
            ),

            // Actions: Right-aligned row (atom composition)
            if (actions != null && actions!.isNotEmpty) ...[
              const SectionDivider(),
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: ActionRow(actions: actions!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Helper method to show the modal
  static Future<T?> show<T>({
    required BuildContext context,
    String? title,
    required Widget content,
    List<Widget>? actions,
    bool showCloseButton = true,
    VoidCallback? onClose,
    double? width,
    double? maxHeight,
    EdgeInsets? padding,
    bool dismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: dismissible,
      builder: (context) => GenericModal(
        title: title,
        content: content,
        actions: actions,
        showCloseButton: showCloseButton,
        onClose: onClose,
        width: width,
        maxHeight: maxHeight,
        padding: padding,
        dismissible: dismissible,
      ),
    );
  }
}
