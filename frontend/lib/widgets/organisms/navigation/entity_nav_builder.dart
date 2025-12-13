/// EntityNavBuilder - Generate navigation items from entity metadata
///
/// SINGLE RESPONSIBILITY: Build NavMenuItem list from registered entities
///
/// Uses EntityMetadataRegistry to create navigation structure dynamically.
/// Eliminates need for hardcoded menu definitions.
///
/// Usage:
/// ```dart
/// final navItems = EntityNavBuilder.buildEntityMenu();
/// // Returns NavMenuItems for: Users, Roles, Customers, etc.
///
/// final sidebar = AppSidebar(items: navItems);
/// ```
library;

import 'package:flutter/material.dart';
import '../../../services/entity_metadata.dart';
import 'nav_menu_item.dart';

/// Entity navigation configuration
class EntityNavConfig {
  /// Group name for organizing entities
  final String? group;

  /// Custom icon (overrides default)
  final IconData? icon;

  /// Route pattern (default: '/entities/{entityName}')
  final String? routePattern;

  /// Visibility function
  final bool Function(Map<String, dynamic>? user)? visibleWhen;

  /// Sort order within group
  final int sortOrder;

  const EntityNavConfig({
    this.group,
    this.icon,
    this.routePattern,
    this.visibleWhen,
    this.sortOrder = 0,
  });
}

/// Default entity configurations
const Map<String, EntityNavConfig> _defaultEntityConfigs = {
  'user': EntityNavConfig(
    group: 'Administration',
    icon: Icons.people,
    sortOrder: 1,
  ),
  'role': EntityNavConfig(
    group: 'Administration',
    icon: Icons.admin_panel_settings,
    sortOrder: 2,
  ),
  'customer': EntityNavConfig(group: 'CRM', icon: Icons.business, sortOrder: 1),
  'technician': EntityNavConfig(
    group: 'Operations',
    icon: Icons.engineering,
    sortOrder: 1,
  ),
  'work_order': EntityNavConfig(
    group: 'Operations',
    icon: Icons.assignment,
    sortOrder: 2,
  ),
  'contract': EntityNavConfig(
    group: 'CRM',
    icon: Icons.description,
    sortOrder: 2,
  ),
  'invoice': EntityNavConfig(
    group: 'Finance',
    icon: Icons.receipt_long,
    sortOrder: 1,
  ),
  'inventory': EntityNavConfig(
    group: 'Operations',
    icon: Icons.inventory_2,
    sortOrder: 3,
  ),
};

/// Default icons by entity type pattern
IconData _getDefaultIcon(String entityName) {
  // Pattern-based icon selection
  if (entityName.contains('user')) return Icons.person;
  if (entityName.contains('role')) return Icons.security;
  if (entityName.contains('customer')) return Icons.business;
  if (entityName.contains('technician')) return Icons.engineering;
  if (entityName.contains('work') || entityName.contains('order')) {
    return Icons.assignment;
  }
  if (entityName.contains('contract')) return Icons.description;
  if (entityName.contains('invoice')) return Icons.receipt_long;
  if (entityName.contains('inventory')) return Icons.inventory_2;
  if (entityName.contains('product')) return Icons.shopping_bag;
  if (entityName.contains('setting')) return Icons.settings;

  // Default fallback
  return Icons.folder;
}

/// Builder for entity-based navigation
class EntityNavBuilder {
  EntityNavBuilder._();

  /// Build navigation menu items for all registered entities
  ///
  /// [entityConfigs] - Optional custom configs per entity
  /// [includeGroups] - Whether to add section headers for groups
  /// [routePrefix] - Prefix for entity routes (default: '/entities')
  /// [filter] - Optional filter to include/exclude entities
  static List<NavMenuItem> buildEntityMenu({
    Map<String, EntityNavConfig>? entityConfigs,
    bool includeGroups = true,
    String routePrefix = '/entities',
    bool Function(String entityName)? filter,
  }) {
    final configs = {..._defaultEntityConfigs, ...?entityConfigs};
    final entities = EntityMetadataRegistry.entityNames;

    // Filter entities
    final filteredEntities = filter != null
        ? entities.where(filter).toList()
        : entities.toList();

    // Get metadata for each entity
    final entityItems = <_EntityMenuItem>[];
    for (final entityName in filteredEntities) {
      final metadata = EntityMetadataRegistry.get(entityName);
      final config = configs[entityName] ?? const EntityNavConfig();

      entityItems.add(
        _EntityMenuItem(
          entityName: entityName,
          displayName: metadata.displayNamePlural,
          group: config.group ?? 'Other',
          icon: config.icon ?? _getDefaultIcon(entityName),
          route: config.routePattern ?? '$routePrefix/$entityName',
          sortOrder: config.sortOrder,
          visibleWhen: config.visibleWhen,
        ),
      );
    }

    if (!includeGroups) {
      // Flat list, sorted alphabetically
      final sorted = entityItems.toList()
        ..sort((a, b) => a.displayName.compareTo(b.displayName));
      return sorted.map(_toNavMenuItem).toList();
    }

    // Group by category
    final grouped = <String, List<_EntityMenuItem>>{};
    for (final item in entityItems) {
      grouped.putIfAbsent(item.group, () => []).add(item);
    }

    // Sort groups and items within groups
    final sortedGroups = grouped.keys.toList()..sort();

    final result = <NavMenuItem>[];
    for (final group in sortedGroups) {
      // Add section header
      result.add(
        NavMenuItem.section(
          id: 'section_${group.toLowerCase().replaceAll(' ', '_')}',
          label: group,
        ),
      );

      // Sort items by sortOrder then displayName
      final items = grouped[group]!
        ..sort((a, b) {
          final orderCmp = a.sortOrder.compareTo(b.sortOrder);
          if (orderCmp != 0) return orderCmp;
          return a.displayName.compareTo(b.displayName);
        });

      // Add menu items
      for (final item in items) {
        result.add(_toNavMenuItem(item));
      }
    }

    return result;
  }

  /// Build a single entity menu item
  static NavMenuItem buildEntityItem(
    String entityName, {
    EntityNavConfig? config,
    String routePrefix = '/entities',
  }) {
    final metadata = EntityMetadataRegistry.get(entityName);
    final cfg =
        config ?? _defaultEntityConfigs[entityName] ?? const EntityNavConfig();

    return NavMenuItem(
      id: 'entity_$entityName',
      label: metadata.displayNamePlural,
      icon: cfg.icon ?? _getDefaultIcon(entityName),
      route: cfg.routePattern ?? '$routePrefix/$entityName',
      visibleWhen: cfg.visibleWhen,
    );
  }

  static NavMenuItem _toNavMenuItem(_EntityMenuItem item) {
    return NavMenuItem(
      id: 'entity_${item.entityName}',
      label: item.displayName,
      icon: item.icon,
      route: item.route,
      visibleWhen: item.visibleWhen,
    );
  }
}

/// Internal entity menu item data
class _EntityMenuItem {
  final String entityName;
  final String displayName;
  final String group;
  final IconData icon;
  final String route;
  final int sortOrder;
  final bool Function(Map<String, dynamic>? user)? visibleWhen;

  const _EntityMenuItem({
    required this.entityName,
    required this.displayName,
    required this.group,
    required this.icon,
    required this.route,
    required this.sortOrder,
    this.visibleWhen,
  });
}
