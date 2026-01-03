import 'package:flutter/material.dart';
import '../../../config/constants.dart';

/// TitledCard - Generic molecule for cards with a title header
///
/// **SOLE RESPONSIBILITY:** Display a card with title and child content
/// **GENERIC:** No domain-specific styling - title and content passed as props
///
/// Usage:
/// ```dart
/// TitledCard(
///   title: 'Primary Database',
///   actions: [IconButton(...)],  // Optional: inline with title
///   child: DatabaseHealthMetrics(...),
/// )
/// ```
class TitledCard extends StatelessWidget {
  final String title;
  final Widget? child;
  final TextStyle? titleStyle;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;

  /// Optional action widgets displayed inline with the title (right side).
  /// For a single action, use [trailing] instead.
  final List<Widget>? actions;

  /// Optional single trailing widget (right side of title).
  /// For multiple actions, use [actions] instead.
  final Widget? trailing;

  const TitledCard({
    super.key,
    required this.title,
    this.child,
    this.titleStyle,
    this.padding,
    this.margin,
    this.color,
    this.actions,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Build the title widget
    final titleText = Text(
      title,
      style:
          titleStyle ??
          theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
    );

    // Build header: Row if actions/trailing present, otherwise just Text
    final bool hasActions =
        (actions != null && actions!.isNotEmpty) || trailing != null;

    final Widget header = hasActions
        ? Row(
            children: [
              Expanded(child: titleText),
              if (actions != null)
                ...actions!.map(
                  (action) => Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: action,
                  ),
                ),
              if (trailing != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: trailing,
                ),
            ],
          )
        : titleText;

    return Card(
      margin: margin ?? StyleConstants.dbCardMargin,
      shape: RoundedRectangleBorder(
        borderRadius: StyleConstants.cardBorderRadius,
      ),
      // Use theme's surface color by default (null lets Card use theme)
      color: color,
      child: Padding(
        padding: padding ?? StyleConstants.dbCardPadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            header,
            if (child != null) ...[
              SizedBox(height: StyleConstants.dbCardSpacing),
              child!,
            ],
          ],
        ),
      ),
    );
  }
}
