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
class GenericModal extends StatefulWidget {
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

  @override
  State<GenericModal> createState() => _GenericModalState();
}

class _GenericModalState extends State<GenericModal> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final screenHeight = MediaQuery.of(context).size.height;
    final effectiveMaxHeight = widget.maxHeight ?? screenHeight * 0.85;

    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: widget.width ?? 600,
          maxHeight: effectiveMaxHeight,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header: Title + Close button
            if (widget.title != null || widget.showCloseButton) ...[
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (widget.title != null)
                      Flexible(
                        child: Text(
                          widget.title!,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    if (widget.showCloseButton)
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed:
                            widget.onClose ?? () => Navigator.of(context).pop(),
                        tooltip: 'Close',
                      ),
                  ],
                ),
              ),
              const Divider(height: 1),
            ],

            // Content: Scrollable with explicit controller to avoid
            // PrimaryScrollController conflicts with nested scrollables
            Flexible(
              child: Scrollbar(
                controller: _scrollController,
                thumbVisibility: true,
                trackVisibility: true,
                thickness: StyleConstants.scrollbarThickness,
                radius: Radius.circular(StyleConstants.scrollbarRadius),
                child: SingleChildScrollView(
                  controller: _scrollController,
                  child: Padding(
                    padding: widget.padding ?? EdgeInsets.all(spacing.md),
                    child: widget.content,
                  ),
                ),
              ),
            ),

            // Actions: Right-aligned row
            if (widget.actions != null && widget.actions!.isNotEmpty) ...[
              const Divider(height: 1),
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (int i = 0; i < widget.actions!.length; i++) ...[
                      widget.actions![i],
                      if (i < widget.actions!.length - 1)
                        const SizedBox(width: 8),
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
}
