import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../atoms/typography/section_header.dart';

/// SettingsSection - Organism for grouped settings with header
///
/// **SOLE RESPONSIBILITY:** Compose section header + list of setting rows
/// **GENERIC:** Works with any setting row widgets
///
/// Features:
/// - Section header with optional icon and action
/// - List of setting rows (SettingToggleRow, SettingDropdownRow, etc.)
/// - Consistent spacing
/// - Optional divider between sections
/// - Zero business logic, pure composition
///
/// Usage:
/// ```dart
/// SettingsSection(
///   title: 'Display Options',
///   icon: Icons.display_settings,
///   children: [
///     SettingToggleRow(
///       label: 'Dark Mode',
///       value: settings['darkMode'],
///       onChanged: (v) => updateSetting('darkMode', v),
///     ),
///     SettingDropdownRow<String>(
///       label: 'Language',
///       value: settings['language'],
///       items: ['English', 'Spanish', 'French'],
///       onChanged: (v) => updateSetting('language', v),
///       displayText: (lang) => lang,
///     ),
///   ],
/// )
/// ```
class SettingsSection extends StatelessWidget {
  final String title;
  final IconData? icon;
  final Widget? action;
  final List<Widget> children;
  final bool showDivider;
  final EdgeInsetsGeometry? padding;

  const SettingsSection({
    super.key,
    required this.title,
    this.icon,
    this.action,
    required this.children,
    this.showDivider = false,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Padding(
      padding: padding ?? EdgeInsets.only(bottom: spacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          SectionHeader(text: title, icon: icon, action: action),
          SizedBox(height: spacing.lg),
          // Setting rows
          ...children,
          // Optional divider
          if (showDivider) ...[SizedBox(height: spacing.md), Divider()],
        ],
      ),
    );
  }
}
