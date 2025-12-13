import 'package:flutter/material.dart';

/// SectionHeader - Atom for section titles in forms and settings
///
/// **SOLE RESPONSIBILITY:** Render a styled section title text
///
/// Features:
/// - Consistent section title styling across app
/// - Optional icon prefix
/// - Optional action widget suffix
/// - Configurable text style
/// - Zero logic, pure presentation
///
/// Usage:
/// ```dart
/// SectionHeader(text: 'General Settings')
///
/// SectionHeader(
///   text: 'Labor Rate Groups',
///   icon: Icons.group,
///   action: TextButton(onPressed: _add, child: Text('ADD')),
/// )
/// ```
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
    final defaultStyle = theme.textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
      color: color ?? theme.colorScheme.primary,
    );

    final content = Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 20, color: color ?? theme.colorScheme.primary),
          const SizedBox(width: 8),
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
