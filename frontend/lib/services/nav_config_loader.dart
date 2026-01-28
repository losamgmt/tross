/// Navigation Configuration Loader
///
/// Dynamically loads navigation config from assets/config/nav-config.json
/// Provides metadata-driven navigation structure for the app.
///
/// BENEFITS:
/// - Change nav structure without rebuilding app
/// - Entity placements separate from entity metadata
/// - Permission-based visibility via rlsResource
/// - Type-safe access with Dart models
library;

import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'error_service.dart';

// ============================================================================
// MODELS
// ============================================================================

/// Public route configuration (no auth required)
class PublicRoute {
  final String id;
  final String path;

  const PublicRoute({required this.id, required this.path});

  factory PublicRoute.fromJson(Map<String, dynamic> json) {
    return PublicRoute(id: json['id'] as String, path: json['path'] as String);
  }
}

/// Navigation group for organizing menu items
class NavGroup {
  final String id;
  final String label;
  final int order;

  const NavGroup({required this.id, required this.label, required this.order});

  factory NavGroup.fromJson(Map<String, dynamic> json) {
    return NavGroup(
      id: json['id'] as String,
      label: json['label'] as String,
      order: json['order'] as int,
    );
  }
}

/// Menu type for static items
enum NavMenuType {
  sidebar, // Main navigation (entities, dashboard)
  userMenu, // Account menu (settings, admin, logout)
}

/// Static navigation item (non-entity)
///
/// Note: `permissionResource` controls NAV VISIBILITY (can user see this menu?).
/// This is distinct from entity-metadata.json `rlsResource` which controls
/// ROW-LEVEL DATA ACCESS (which records can user see?).
/// If `permissionResource` is null, item is visible to all authenticated users.
class StaticNavItem {
  final String id;
  final String label;
  final String? icon; // Icon name string (e.g., 'dashboard_outlined')
  final String route;
  final String group;
  final int order;

  /// Permission resource for nav visibility check.
  /// Maps to permissions.json resource name.
  /// If null, item is visible to all authenticated users.
  final String? permissionResource;

  final NavMenuType menuType;

  const StaticNavItem({
    required this.id,
    required this.label,
    this.icon,
    required this.route,
    required this.group,
    required this.order,
    this.permissionResource,
    this.menuType = NavMenuType.sidebar,
  });

  factory StaticNavItem.fromJson(Map<String, dynamic> json) {
    return StaticNavItem(
      id: json['id'] as String,
      label: json['label'] as String,
      icon: json['icon'] as String?,
      route: json['route'] as String,
      group: json['group'] as String,
      order: json['order'] as int,
      permissionResource: json['permissionResource'] as String?,
      menuType: json['menuType'] == 'userMenu'
          ? NavMenuType.userMenu
          : NavMenuType.sidebar,
    );
  }
}

/// Entity placement in navigation
class EntityPlacement {
  final String entityName;
  final String group;
  final int order;

  const EntityPlacement({
    required this.entityName,
    required this.group,
    required this.order,
  });

  factory EntityPlacement.fromJson(
    String entityName,
    Map<String, dynamic> json,
  ) {
    return EntityPlacement(
      entityName: entityName,
      group: json['group'] as String,
      order: json['order'] as int,
    );
  }
}

// ============================================================================
// SIDEBAR STRATEGY MODELS
// ============================================================================

/// Section within a sidebar strategy (e.g., "Home", "Entities", "Logs")
/// Can be a clickable item (has route) or a grouper (has children)
class SidebarSection {
  final String id;
  final String label;
  final String? icon;
  final int order;
  final String? route; // If set, section is clickable
  final bool isGrouper; // If true, section is a collapsible grouper
  final List<SidebarSectionChild> children; // Static children (for logs, etc.)
  /// Permission resource for nav visibility check.
  /// Maps to permissions.json resource name.
  /// If null, item is visible to all authenticated users.
  final String? permissionResource;

  const SidebarSection({
    required this.id,
    required this.label,
    this.icon,
    required this.order,
    this.route,
    this.isGrouper = false,
    this.children = const [],
    this.permissionResource,
  });

  /// Check if this section has a direct route (clickable)
  bool get hasRoute => route != null;

  /// Check if this section has static children
  bool get hasChildren => children.isNotEmpty;

  factory SidebarSection.fromJson(Map<String, dynamic> json) {
    final childrenJson = json['children'] as List<dynamic>? ?? [];
    return SidebarSection(
      id: json['id'] as String,
      label: json['label'] as String,
      icon: json['icon'] as String?,
      order: json['order'] as int? ?? 0,
      route: json['route'] as String?,
      isGrouper: json['isGrouper'] as bool? ?? false,
      children: childrenJson
          .map((e) => SidebarSectionChild.fromJson(e as Map<String, dynamic>))
          .toList(),
      permissionResource: json['permissionResource'] as String?,
    );
  }
}

/// Child item within a sidebar section (e.g., "Data" and "Auth" under "Logs")
class SidebarSectionChild {
  final String id;
  final String label;
  final String? icon;
  final String route;

  /// Permission resource for nav visibility check.
  /// Maps to permissions.json resource name.
  /// If null, inherits from parent section or visible to all authenticated users.
  final String? permissionResource;

  const SidebarSectionChild({
    required this.id,
    required this.label,
    this.icon,
    required this.route,
    this.permissionResource,
  });

  factory SidebarSectionChild.fromJson(Map<String, dynamic> json) {
    return SidebarSectionChild(
      id: json['id'] as String,
      label: json['label'] as String,
      icon: json['icon'] as String?,
      route: json['route'] as String,
      permissionResource: json['permissionResource'] as String?,
    );
  }
}

/// Sidebar strategy - defines what content appears in the sidebar
/// for a given route context (e.g., "app" vs "admin")
class SidebarStrategy {
  final String id;
  final String label;
  final List<String> groups;
  final bool includeEntities;
  final bool showDashboard;
  final bool showHome;
  final List<SidebarSection> sections;

  const SidebarStrategy({
    required this.id,
    required this.label,
    required this.groups,
    this.includeEntities = true,
    this.showDashboard = false,
    this.showHome = false,
    this.sections = const [],
  });

  factory SidebarStrategy.fromJson(String id, Map<String, dynamic> json) {
    final sectionsJson = json['sections'] as List<dynamic>? ?? [];
    return SidebarStrategy(
      id: id,
      label: json['label'] as String? ?? id,
      groups:
          (json['groups'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      includeEntities: json['includeEntities'] as bool? ?? true,
      showDashboard: json['showDashboard'] as bool? ?? false,
      showHome: json['showHome'] as bool? ?? false,
      sections: sectionsJson
          .map(
            (e) => SidebarSection.fromJson(Map<String, dynamic>.from(e as Map)),
          )
          .toList(),
    );
  }

  /// Check if this strategy has custom sections
  bool get hasSections => sections.isNotEmpty;
}

/// Complete navigation configuration
class NavConfig {
  final String version;
  final List<PublicRoute> publicRoutes;
  final List<NavGroup> groups;
  final List<StaticNavItem> staticItems;
  final Map<String, EntityPlacement> entityPlacements;
  final Map<String, SidebarStrategy> sidebarStrategies;
  final Map<String, String> routeStrategies;

  const NavConfig({
    required this.version,
    required this.publicRoutes,
    required this.groups,
    required this.staticItems,
    required this.entityPlacements,
    this.sidebarStrategies = const {},
    this.routeStrategies = const {},
  });

  factory NavConfig.fromJson(Map<String, dynamic> json) {
    // Parse public routes
    final publicRoutes =
        (json['publicRoutes'] as List<dynamic>?)
            ?.map(
              (e) => PublicRoute.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList() ??
        [];

    // Parse groups
    final groups =
        (json['groups'] as List<dynamic>?)
            ?.map((e) => NavGroup.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList() ??
        [];

    // Parse static items
    final staticItems =
        (json['staticItems'] as List<dynamic>?)
            ?.map(
              (e) =>
                  StaticNavItem.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList() ??
        [];

    // Parse entity placements
    final entityPlacements = <String, EntityPlacement>{};
    final placementsJson = json['entityPlacements'] as Map?;
    if (placementsJson != null) {
      for (final entry in placementsJson.entries) {
        entityPlacements[entry.key as String] = EntityPlacement.fromJson(
          entry.key as String,
          Map<String, dynamic>.from(entry.value as Map),
        );
      }
    }

    // Parse sidebar strategies
    final sidebarStrategies = <String, SidebarStrategy>{};
    final strategiesJson = json['sidebarStrategies'] as Map?;
    if (strategiesJson != null) {
      for (final entry in strategiesJson.entries) {
        sidebarStrategies[entry.key as String] = SidebarStrategy.fromJson(
          entry.key as String,
          Map<String, dynamic>.from(entry.value as Map),
        );
      }
    }

    // Parse route strategies
    final routeStrategies = <String, String>{};
    final routeStrategiesJson = json['routeStrategies'] as Map?;
    if (routeStrategiesJson != null) {
      for (final entry in routeStrategiesJson.entries) {
        routeStrategies[entry.key as String] = entry.value as String;
      }
    }

    return NavConfig(
      version: json['version'] as String? ?? '1.0.0',
      publicRoutes: publicRoutes,
      groups: groups,
      staticItems: staticItems,
      entityPlacements: entityPlacements,
      sidebarStrategies: sidebarStrategies,
      routeStrategies: routeStrategies,
    );
  }

  /// Get sidebar strategy for a route
  /// Supports wildcard matching (e.g., "/admin/*" matches "/admin/users")
  SidebarStrategy? getStrategyForRoute(String route) {
    // First try exact match
    if (routeStrategies.containsKey(route)) {
      final strategyId = routeStrategies[route]!;
      return sidebarStrategies[strategyId];
    }

    // Then try wildcard matches
    for (final entry in routeStrategies.entries) {
      final pattern = entry.key;
      if (pattern.endsWith('/*')) {
        final prefix = pattern.substring(0, pattern.length - 2);
        if (route.startsWith(prefix)) {
          return sidebarStrategies[entry.value];
        }
      }
    }

    // Default to 'app' strategy
    return sidebarStrategies['app'];
  }

  /// Get strategy by ID
  SidebarStrategy? getStrategy(String strategyId) {
    return sidebarStrategies[strategyId];
  }

  /// Get groups sorted by order
  List<NavGroup> get sortedGroups {
    final sorted = List<NavGroup>.from(groups);
    sorted.sort((a, b) => a.order.compareTo(b.order));
    return sorted;
  }

  /// Get static items for a specific group, sorted by order
  List<StaticNavItem> getStaticItemsForGroup(String groupId) {
    final items = staticItems.where((item) => item.group == groupId).toList();
    items.sort((a, b) => a.order.compareTo(b.order));
    return items;
  }

  /// Get entity placements for a specific group, sorted by order
  List<EntityPlacement> getEntityPlacementsForGroup(String groupId) {
    final placements = entityPlacements.values
        .where((p) => p.group == groupId)
        .toList();
    placements.sort((a, b) => a.order.compareTo(b.order));
    return placements;
  }

  /// Check if an entity is placed in navigation
  bool hasEntityPlacement(String entityName) {
    return entityPlacements.containsKey(entityName);
  }

  /// Get public route by ID
  PublicRoute? getPublicRoute(String id) {
    try {
      return publicRoutes.firstWhere((r) => r.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Check if a path is a public route
  bool isPublicRoute(String path) {
    return publicRoutes.any((r) => r.path == path);
  }

  /// Get static items for sidebar navigation (main app nav)
  List<StaticNavItem> get sidebarStaticItems {
    return staticItems
        .where((item) => item.menuType == NavMenuType.sidebar)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }

  /// Get static items for user menu (account menu)
  List<StaticNavItem> get userMenuStaticItems {
    return staticItems
        .where((item) => item.menuType == NavMenuType.userMenu)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }
}

// ============================================================================
// SERVICE
// ============================================================================

/// Navigation Configuration Service
///
/// Singleton service that loads and provides access to nav config.
/// Initialize once at app startup, then access via static methods.
class NavConfigService {
  NavConfigService._(); // Private constructor - static class only

  static NavConfig? _config;
  static bool _isLoading = false;
  static bool _isInitialized = false;

  /// Get the loaded configuration
  /// Throws if not initialized
  static NavConfig get config {
    if (_config == null) {
      throw StateError(
        'NavConfigService not initialized. Call initialize() first.',
      );
    }
    return _config!;
  }

  /// Check if service is initialized
  static bool get isInitialized => _isInitialized;

  /// Initialize the service by loading config from assets
  static Future<void> initialize() async {
    if (_isInitialized) return;
    if (_isLoading) return;

    _isLoading = true;
    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/nav-config.json',
      );
      final json = jsonDecode(jsonString) as Map<String, dynamic>;
      _config = NavConfig.fromJson(json);
      _isInitialized = true;
    } catch (e, stackTrace) {
      ErrorService.logError(
        'NavConfigService.initialize failed',
        error: e,
        stackTrace: stackTrace,
        context: {'asset': 'nav-config.json'},
      );
      rethrow;
    } finally {
      _isLoading = false;
    }
  }

  /// Reset service (for testing)
  static void reset() {
    _config = null;
    _isInitialized = false;
    _isLoading = false;
  }

  /// Load config for testing with custom JSON
  static void loadFromJson(Map<String, dynamic> json) {
    _config = NavConfig.fromJson(json);
    _isInitialized = true;
  }
}
