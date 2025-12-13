import 'package:flutter/material.dart';
import 'package:tross_app/config/app_spacing.dart';
import 'package:tross_app/config/constants.dart';

/// GenericModal - Organism for modal dialogs via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose widgets into modal layout structure
/// **PURE:** No service dependencies - uses standard Navigator.pop()
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
                        onPressed: onClose ?? () => Navigator.of(context).pop(),
                        tooltip: 'Close',
                      ),
                  ],
                ),
              ),
              const Divider(height: 1),
            ],

            // Content: Scrollable
            Flexible(
              child: Scrollbar(
                thumbVisibility: true,
                trackVisibility: true,
                thickness: StyleConstants.scrollbarThickness,
                radius: Radius.circular(StyleConstants.scrollbarRadius),
                child: SingleChildScrollView(
                  child: Padding(
                    padding: padding ?? EdgeInsets.all(spacing.md),
                    child: content,
                  ),
                ),
              ),
            ),

            // Actions: Right-aligned row
            if (actions != null && actions!.isNotEmpty) ...[
              const Divider(height: 1),
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (int i = 0; i < actions!.length; i++) ...[
                      actions![i],
                      if (i < actions!.length - 1) const SizedBox(width: 8),
                    ],
                  ],
                ),
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
