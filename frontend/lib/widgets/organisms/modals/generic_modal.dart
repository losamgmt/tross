import 'package:flutter/material.dart';
import 'package:tross/config/app_spacing.dart';
import 'package:tross/config/constants.dart';
import 'package:tross/config/platform_utilities.dart';
import '../../atoms/atoms.dart';

/// GenericModal - Organism for modal dialogs via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose widgets into modal layout structure
/// **PURE:** No service dependencies - uses standard Navigator.pop()
/// **ADAPTIVE:** Full-screen on compact screens, dialog on expanded
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

  /// Whether to use full-screen on compact screens (phones)
  /// Default: true - modals become full-screen on narrow screens
  final bool adaptiveFullScreen;

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
    this.adaptiveFullScreen = true,
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
    bool adaptiveFullScreen = true,
  }) {
    final size = MediaQuery.of(context).size;
    final useFullScreen =
        adaptiveFullScreen &&
        PlatformUtilities.shouldUseFullScreenModal(size.width);

    if (useFullScreen) {
      // Full-screen modal for compact screens
      return Navigator.of(context).push<T>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (context) => _FullScreenModal(
            title: title,
            content: content,
            actions: actions,
            showCloseButton: showCloseButton,
            onClose: onClose,
            padding: padding,
          ),
        ),
      );
    }

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
        adaptiveFullScreen: false, // Already decided to use dialog
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
                      TouchTarget.icon(
                        icon: Icons.close,
                        onTap:
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

/// Full-screen modal for compact screens (phones)
///
/// Provides a better UX on small screens by using the full viewport
/// with proper AppBar and SafeArea handling.
class _FullScreenModal extends StatelessWidget {
  final String? title;
  final Widget content;
  final List<Widget>? actions;
  final bool showCloseButton;
  final VoidCallback? onClose;
  final EdgeInsets? padding;

  const _FullScreenModal({
    this.title,
    required this.content,
    this.actions,
    this.showCloseButton = true,
    this.onClose,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: AppBar(
        title: title != null ? Text(title!) : null,
        leading: showCloseButton
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: onClose ?? () => Navigator.of(context).pop(),
              )
            : null,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Scrollable content
            Expanded(
              child: AdaptiveScroll(
                padding: padding ?? EdgeInsets.all(spacing.md),
                child: content,
              ),
            ),
            // Actions at bottom (if any)
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
}
