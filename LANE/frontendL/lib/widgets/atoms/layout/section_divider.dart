import 'package:flutter/material.dart';

/// SectionDivider - Atom for visual section separation
///
/// **SOLE RESPONSIBILITY:** Render a horizontal divider line
///
/// Features:
/// - Consistent divider styling across app
/// - Uses theme divider color
/// - Zero logic, pure presentation
///
/// Usage:
/// ```dart
/// Column(
///   children: [
///     HeaderSection(),
///     SectionDivider(),
///     ContentSection(),
///   ],
/// )
/// ```
class SectionDivider extends StatelessWidget {
  final double? height;
  final Color? color;

  const SectionDivider({super.key, this.height, this.color});

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: height ?? 1,
      thickness: 1,
      color: color ?? Theme.of(context).dividerColor,
    );
  }
}
