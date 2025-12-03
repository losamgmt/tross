/// Role Configuration - Centralized role badge styling
///
/// **SOLE RESPONSIBILITY:** Define role badge styles and icons ONLY
/// - Maps role names to badge styles
/// - Maps role names to icons
/// - Zero logic, pure data
///
/// This replaces the StatusBadge.role() factory and scattered _roleBadgeConfig maps
library;

import 'package:flutter/material.dart';
import '../widgets/atoms/atoms.dart';

/// Role badge configuration: maps role name to (style, icon)
///
/// Usage:
/// ```dart
/// final config = RoleConfig.getBadgeConfig('admin');
/// StatusBadge(label: 'Admin', style: config.$1, icon: config.$2)
/// ```
class RoleConfig {
  /// Get badge style and icon for a role
  static (BadgeStyle, IconData) getBadgeConfig(String roleName) {
    final config = _roleBadgeMap[roleName.toLowerCase()];
    return config ?? _defaultConfig;
  }

  /// Default config for unknown roles
  static const _defaultConfig = (BadgeStyle.neutral, Icons.help_outline);

  /// Role badge configuration map
  static const _roleBadgeMap = {
    'admin': (BadgeStyle.admin, Icons.admin_panel_settings),
    'technician': (BadgeStyle.technician, Icons.build),
    'manager': (BadgeStyle.manager, Icons.supervisor_account),
    'dispatcher': (BadgeStyle.dispatcher, Icons.support_agent),
    'client': (BadgeStyle.client, Icons.person),
  };

  /// Get all valid role names
  static List<String> get allRoles => _roleBadgeMap.keys.toList();

  /// Check if a role is valid
  static bool isValidRole(String roleName) {
    return _roleBadgeMap.containsKey(roleName.toLowerCase());
  }
}
