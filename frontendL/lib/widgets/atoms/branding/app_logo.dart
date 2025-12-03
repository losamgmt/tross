/// AppLogo - Atom for application logo display
///
/// Single-purpose: Display app logo with bronze theme
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class AppLogo extends StatelessWidget {
  final double? size;

  const AppLogo({super.key, this.size});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final logoSize = size ?? spacing.xxxl * 2.5;

    return Container(
      width: logoSize,
      height: logoSize,
      decoration: BoxDecoration(
        color: AppColors.withOpacity(AppColors.brandPrimary, 0.1),
        borderRadius: BorderRadius.circular(logoSize / 2),
      ),
      child: Icon(
        Icons.build_circle,
        size: logoSize * 0.533, // 64/120 ratio
        color: AppColors.brandPrimary,
      ),
    );
  }
}
