/// LogoButton - Atom for home/branding button
///
/// Bronze colored TrossApp logo that navigates home
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class LogoButton extends StatelessWidget {
  final VoidCallback? onPressed;

  const LogoButton({super.key, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(
        Icons.home_rounded,
        color: Colors.white,
        size: spacing.iconSizeLG,
      ),
      label: Text(
        'Tross',
        style: theme.textTheme.titleMedium?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
        overflow: TextOverflow.clip,
        maxLines: 1,
        softWrap: false,
      ),
      style: TextButton.styleFrom(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.lg,
          vertical: spacing.md,
        ),
      ),
    );
  }
}
