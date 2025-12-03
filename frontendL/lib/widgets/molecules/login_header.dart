/// LoginHeader - Molecule for login page header
///
/// Composes: AppLogo + AppTitle atoms
library;

import 'package:flutter/material.dart';
import '../atoms/atoms.dart';
import '../../config/app_spacing.dart';

class LoginHeader extends StatelessWidget {
  final String title;
  final String subtitle;

  const LoginHeader({super.key, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Column(
      children: [
        AppLogo(size: spacing.xxxl * 2),
        SizedBox(height: spacing.xl),
        AppTitle(title: title, subtitle: subtitle),
      ],
    );
  }
}
