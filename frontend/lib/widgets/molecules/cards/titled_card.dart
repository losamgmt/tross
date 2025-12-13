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

  const TitledCard({
    super.key,
    required this.title,
    this.child,
    this.titleStyle,
    this.padding,
    this.margin,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: margin ?? StyleConstants.dbCardMargin,
      shape: RoundedRectangleBorder(
        borderRadius: StyleConstants.cardBorderRadius,
      ),
      color: color ?? StyleConstants.dbCardColor,
      child: Padding(
        padding: padding ?? StyleConstants.dbCardPadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style:
                  titleStyle ??
                  theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
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

/// Backwards compatibility alias
@Deprecated('Use TitledCard instead')
typedef DatabaseCard = TitledCard;
