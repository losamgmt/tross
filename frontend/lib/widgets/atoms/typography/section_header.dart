import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

/// SectionHeader - Atom for section titles in forms and settings
class SectionHeader extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Widget? action;
  final TextStyle? style;
  final Color? color;
  final EdgeInsetsGeometry? padding;

  const SectionHeader({
    super.key,
    required this.text,
    this.icon,
    this.action,
    this.style,
    this.color,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final defaultStyle = theme.textTheme.titleMedium?.copyWith(
      fontWeight: AppTypography.semiBold,
      color: color ?? theme.colorScheme.primary,
    );

    final content = Row(
      children: [
        if (icon != null) ...[
          Icon(
            icon,
            size: spacing.iconSizeLG,
            color: color ?? theme.colorScheme.primary,
          ),
          SizedBox(width: spacing.sm),
        ],
        Expanded(child: Text(text, style: style ?? defaultStyle)),
        if (action != null) action!,
      ],
    );

    if (padding != null) {
      return Padding(padding: padding!, child: content);
    }

    return content;
  }
}
