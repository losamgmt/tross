import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class RefreshIconButton extends StatelessWidget {
  final VoidCallback onPressed;
  const RefreshIconButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    return IconButton(
      icon: Icon(Icons.refresh, size: spacing.iconSizeSM),
      tooltip: 'Refresh',
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
    );
  }
}
