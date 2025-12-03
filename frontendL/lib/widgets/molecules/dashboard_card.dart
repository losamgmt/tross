import 'package:flutter/material.dart';
import '../../config/constants.dart';

/// DashboardCard - Universal molecule for dashboard cards
///
/// Handles all card container logic: padding, border, elevation, sizing.
/// Content is injected as a child widget.
class DashboardCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double elevation;
  final Color? color;
  final double? width;
  final double? minWidth;
  final double? maxWidth;
  final EdgeInsetsGeometry? margin;

  const DashboardCard({
    super.key,
    required this.child,
    this.padding,
    this.elevation = 2,
    this.color,
    this.width,
    this.minWidth,
    this.maxWidth,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    Widget card = Card(
      elevation: elevation,
      color: color ?? StyleConstants.dbCardColor,
      margin: margin ?? StyleConstants.dbCardMargin,
      clipBehavior: Clip.antiAlias, // Clip children to rounded corners
      shape: RoundedRectangleBorder(
        borderRadius: StyleConstants.cardBorderRadius,
      ),
      child: Padding(
        padding: padding ?? StyleConstants.dbCardPadding,
        child: child,
      ),
    );

    if (width != null || minWidth != null || maxWidth != null) {
      card = SizedBox(
        width: width,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: minWidth ?? 0,
            maxWidth: maxWidth ?? double.infinity,
          ),
          child: card,
        ),
      );
    }

    return card;
  }
}
