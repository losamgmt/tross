/// Entity Icon Resolver - Single source of truth for entity icons
///
/// SINGLE RESPONSIBILITY: Map entity names and icon strings to IconData
///
/// This utility provides consistent icon mapping for entities across the app.
/// Used by NavMenuBuilder and any component needing entity icons.
///
/// Supports:
/// - Entity name → icon mapping
/// - Static item ID → icon mapping
/// - Icon string name → IconData mapping (for config-driven icons)
library;

import 'package:flutter/material.dart';

/// Resolve icons for entities and navigation items
class EntityIconResolver {
  EntityIconResolver._();

  // ============================================================================
  // ICON STRING TO ICONDATA MAPPING
  // ============================================================================

  /// Map icon string names to IconData
  ///
  /// Used by nav-config.json and entity-metadata.json to specify icons.
  /// Supports both 'icon_name' and 'icon_name_outlined' formats.
  static const Map<String, IconData> _iconMap = {
    // Dashboard/Home
    'dashboard': Icons.dashboard,
    'dashboard_outlined': Icons.dashboard_outlined,
    'home': Icons.home,
    'home_outlined': Icons.home_outlined,

    // Admin/Settings
    'admin_panel_settings': Icons.admin_panel_settings,
    'admin_panel_settings_outlined': Icons.admin_panel_settings_outlined,
    'settings': Icons.settings,
    'settings_outlined': Icons.settings_outlined,
    'tune': Icons.tune,
    'tune_outlined': Icons.tune_outlined,
    'security': Icons.security,
    'security_outlined': Icons.security_outlined,

    // People/Users
    'people': Icons.people,
    'people_outlined': Icons.people_outlined,
    'person': Icons.person,
    'person_outlined': Icons.person_outlined,
    'engineering': Icons.engineering,
    'engineering_outlined': Icons.engineering_outlined,

    // Business
    'business': Icons.business,
    'business_outlined': Icons.business_outlined,
    'work': Icons.work,
    'work_outlined': Icons.work_outlined,

    // Documents
    'description': Icons.description,
    'description_outlined': Icons.description_outlined,
    'assignment': Icons.assignment,
    'assignment_outlined': Icons.assignment_outlined,
    'receipt_long': Icons.receipt_long,
    'receipt_long_outlined': Icons.receipt_long_outlined,
    'article': Icons.article,
    'article_outlined': Icons.article_outlined,

    // Inventory
    'inventory': Icons.inventory,
    'inventory_outlined': Icons.inventory_outlined,
    'inventory_2': Icons.inventory_2,
    'inventory_2_outlined': Icons.inventory_2_outlined,
    'shopping_bag': Icons.shopping_bag,
    'shopping_bag_outlined': Icons.shopping_bag_outlined,

    // Generic
    'folder': Icons.folder,
    'folder_outlined': Icons.folder_outlined,
    'star': Icons.star,
    'star_outlined': Icons.star_outlined,
    'info': Icons.info,
    'info_outlined': Icons.info_outlined,
  };

  /// Parse an icon string name to IconData
  ///
  /// Returns null if the icon name is not recognized.
  /// Example: 'dashboard_outlined' → Icons.dashboard_outlined
  static IconData? fromString(String? iconName) {
    if (iconName == null || iconName.isEmpty) return null;
    return _iconMap[iconName];
  }

  // ============================================================================
  // ENTITY ICONS
  // ============================================================================

  /// Get icon for an entity by name
  ///
  /// Priority:
  /// 1. [metadataIcon] - Icon name from entity-metadata.json (preferred)
  /// 2. Pattern-based fallback for unknown/new entities
  ///
  /// All known entities should have icons defined in entity-metadata.json.
  /// Pattern matching handles unknown entities gracefully.
  static IconData getIcon(String entityName, {String? metadataIcon}) {
    // Priority 1: Use metadata icon if provided
    if (metadataIcon != null) {
      final resolved = fromString(metadataIcon);
      if (resolved != null) return resolved;
    }

    // Priority 2: Pattern-based fallback for unknown entities
    return _getPatternIcon(entityName);
  }

  // ============================================================================
  // STATIC ITEM ICONS (FALLBACK)
  // ============================================================================

  /// Static item ID to icon mapping (fallback when config doesn't specify)
  static const Map<String, IconData> _staticIconsFallback = {
    'dashboard': Icons.dashboard_outlined,
    'admin_panel': Icons.admin_panel_settings_outlined,
    'settings': Icons.settings_outlined,
  };

  /// Get icon for a static nav item by ID (fallback only)
  ///
  /// Prefer using fromString() with the icon name from config.
  static IconData getStaticIcon(String itemId) {
    return _staticIconsFallback[itemId] ?? Icons.folder_outlined;
  }

  // ============================================================================
  // PATTERN MATCHING
  // ============================================================================

  /// Pattern-based icon matching for unknown entities
  static IconData _getPatternIcon(String entityName) {
    final lower = entityName.toLowerCase();

    if (lower.contains('user') || lower.contains('person')) {
      return Icons.person_outlined;
    }
    if (lower.contains('role') || lower.contains('permission')) {
      return Icons.security_outlined;
    }
    if (lower.contains('customer') || lower.contains('client')) {
      return Icons.business_outlined;
    }
    if (lower.contains('technician') || lower.contains('worker')) {
      return Icons.engineering_outlined;
    }
    if (lower.contains('work') ||
        lower.contains('order') ||
        lower.contains('job')) {
      return Icons.assignment_outlined;
    }
    if (lower.contains('contract') || lower.contains('agreement')) {
      return Icons.description_outlined;
    }
    if (lower.contains('invoice') || lower.contains('bill')) {
      return Icons.receipt_long_outlined;
    }
    if (lower.contains('inventory') || lower.contains('stock')) {
      return Icons.inventory_2_outlined;
    }
    if (lower.contains('product') || lower.contains('item')) {
      return Icons.shopping_bag_outlined;
    }
    if (lower.contains('setting') || lower.contains('config')) {
      return Icons.settings_outlined;
    }

    return Icons.folder_outlined;
  }
}
