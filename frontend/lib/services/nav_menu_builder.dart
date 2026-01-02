/// NavMenuBuilder - Build navigation menus from config and metadata
///
/// SINGLE RESPONSIBILITY: Transform nav-config.json + entity-metadata.json
/// into NavMenuItem lists for sidebar and user menu.
///
/// Uses:
/// - NavConfigService for navigation structure (groups, order, static items)
/// - EntityMetadataRegistry for entity display info
/// - PermissionService for visibility rules
/// - EntityIconResolver for consistent icons
///
/// This service is the SINGLE SOURCE OF TRUTH for menu item generation.
/// AdaptiveShell, AppSidebar, and other nav components consume its output.
library;

import '../models/permission.dart';
import '../services/auth/auth_profile_service.dart';
import '../services/entity_metadata.dart';
import '../services/error_service.dart';
import '../services/nav_config_loader.dart';
import '../services/permission_service_dynamic.dart';
import '../utils/entity_icon_resolver.dart';
import '../widgets/organisms/navigation/nav_menu_item.dart';
import '../core/routing/app_routes.dart';

/// Build navigation menus from configuration and metadata
class NavMenuBuilder {
  NavMenuBuilder._();

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /// Build sidebar navigation items (main app navigation)
  ///
  /// Includes Dashboard + all entity links organized by group.
  /// Returns fallback items if NavConfigService not initialized.
  static List<NavMenuItem> buildSidebarItems() {
    if (!NavConfigService.isInitialized) {
      return _fallbackSidebarItems;
    }
    return _buildSidebarFromConfig();
  }

  /// Build sidebar items for a specific strategy
  ///
  /// [strategyId] - The strategy ID ('app', 'admin', etc.) from nav-config.json
  /// Returns items filtered by the strategy's groups.
  static List<NavMenuItem> buildSidebarItemsForStrategy(String strategyId) {
    if (!NavConfigService.isInitialized) {
      return _getFallbackForStrategy(strategyId);
    }
    return _buildSidebarFromStrategy(strategyId);
  }

  /// Build sidebar items for the current route
  ///
  /// Automatically determines the strategy based on route path.
  static List<NavMenuItem> buildSidebarItemsForRoute(String currentRoute) {
    if (!NavConfigService.isInitialized) {
      // Use known route patterns from fallback registry
      final strategyId = _inferStrategyFromRoute(currentRoute);
      return _getFallbackForStrategy(strategyId);
    }
    final strategy = NavConfigService.config.getStrategyForRoute(currentRoute);
    if (strategy == null) {
      return _buildSidebarFromConfig();
    }
    return _buildSidebarFromStrategy(strategy.id);
  }

  /// Build user menu items (account dropdown)
  ///
  /// Includes Settings, Admin (conditional), etc.
  /// Logout is handled separately by the shell.
  static List<NavMenuItem> buildUserMenuItems() {
    if (!NavConfigService.isInitialized) {
      return _fallbackUserMenuItems;
    }
    return _buildUserMenuFromConfig();
  }

  /// Filter items based on user permissions
  ///
  /// Removes items the user doesn't have access to.
  /// DEFENSIVE: If filtering fails for any reason, returns all items
  /// (backend validates permissions anyway).
  static List<NavMenuItem> filterForUser(
    List<NavMenuItem> items,
    Map<String, dynamic>? user,
  ) {
    try {
      final filtered = items.where((item) => item.isVisibleFor(user)).toList();
      ErrorService.logInfo(
        '[NavMenu] filterForUser result',
        context: {
          'inputCount': items.length,
          'outputCount': filtered.length,
          'hasUser': user != null,
          'userRole': user?['role'],
        },
      );
      return filtered;
    } catch (e) {
      ErrorService.logError(
        '[NavMenu] filterForUser failed - returning all items',
        error: e,
        context: {'itemCount': items.length, 'hasUser': user != null},
      );
      return items; // Defensive: show all items on error
    }
  }

  // ============================================================================
  // STRATEGY-BASED SIDEBAR BUILDING
  // ============================================================================

  /// Build sidebar items for a specific strategy
  ///
  /// Supports three section types:
  /// 1. Clickable items (have route) - e.g., "Home" → /admin
  /// 2. Entity groupers (id == 'entities') - dynamic children from metadata
  /// 3. Static groupers (have children) - e.g., "Logs" with Data/Auth children
  static List<NavMenuItem> _buildSidebarFromStrategy(String strategyId) {
    final config = NavConfigService.config;
    final strategy = config.getStrategy(strategyId);

    if (strategy == null) {
      ErrorService.logWarning(
        '[NavMenu] Strategy not found, falling back to default',
        context: {'strategyId': strategyId},
      );
      return _buildSidebarFromConfig();
    }

    final items = <NavMenuItem>[];

    // If strategy has custom sections, build from section definitions
    if (strategy.hasSections) {
      for (final section in strategy.sections) {
        // Type 1: Clickable item (has route, not a grouper)
        if (section.hasRoute && !section.isGrouper) {
          items.add(
            NavMenuItem(
              id: 'section_${section.id}',
              label: section.label,
              icon: section.icon != null
                  ? EntityIconResolver.getStaticIcon(section.icon!)
                  : null,
              route: section.route,
              requiresAuth: false,
            ),
          );
          continue;
        }

        // Type 2: Entity grouper (dynamic children from metadata)
        if (section.id == 'entities' && strategy.includeEntities) {
          final entityChildren = <NavMenuItem>[];
          for (final groupId in strategy.groups) {
            final placements = config.getEntityPlacementsForGroup(groupId);
            for (final placement in placements) {
              // Admin context: route to /admin/:entity for entity settings
              final menuItem = _entityPlacementToNavMenuItem(
                placement,
                routePrefix: '/admin',
              );
              if (menuItem != null) {
                entityChildren.add(menuItem);
              }
            }
          }

          items.add(
            NavMenuItem(
              id: 'section_${section.id}',
              label: section.label,
              icon: section.icon != null
                  ? EntityIconResolver.getStaticIcon(section.icon!)
                  : null,
              isSectionHeader: entityChildren.isNotEmpty,
              children: entityChildren.isNotEmpty ? entityChildren : null,
              requiresAuth: false,
            ),
          );
          continue;
        }

        // Type 3: Static grouper (has children defined in config)
        if (section.hasChildren) {
          final staticChildren = section.children.map((child) {
            return NavMenuItem(
              id: 'section_${section.id}_${child.id}',
              label: child.label,
              icon: child.icon != null
                  ? EntityIconResolver.getStaticIcon(child.icon!)
                  : null,
              route: child.route,
              requiresAuth: false,
            );
          }).toList();

          items.add(
            NavMenuItem(
              id: 'section_${section.id}',
              label: section.label,
              icon: section.icon != null
                  ? EntityIconResolver.getStaticIcon(section.icon!)
                  : null,
              isSectionHeader: true,
              children: staticChildren,
              requiresAuth: false,
            ),
          );
          continue;
        }

        // Fallback: Clickable item with no route (shouldn't happen with good config)
        ErrorService.logWarning(
          '[NavMenu] Section has no route, children, or entity flag',
          context: {'sectionId': section.id},
        );
      }
    } else {
      // No custom sections - build from groups with collapsible headers
      // Add dashboard if strategy wants it
      if (strategy.showDashboard) {
        final dashboardItem = config.staticItems.firstWhere(
          (item) => item.id == 'dashboard',
          orElse: () => const StaticNavItem(
            id: 'dashboard',
            label: 'Dashboard',
            route: '/home',
            group: 'main',
            order: 0,
          ),
        );
        items.add(_staticItemToNavMenuItem(dashboardItem));
      }

      // Process groups - each group becomes a collapsible section
      for (final groupId in strategy.groups) {
        final group = config.groups.firstWhere(
          (g) => g.id == groupId,
          orElse: () => NavGroup(id: groupId, label: groupId, order: 99),
        );

        final groupChildren = <NavMenuItem>[];

        // Add static items for this group
        final staticItems = config
            .getStaticItemsForGroup(groupId)
            .where((s) => s.menuType == NavMenuType.sidebar);

        for (final staticItem in staticItems) {
          groupChildren.add(_staticItemToNavMenuItem(staticItem));
        }

        // Add entities if strategy includes them
        if (strategy.includeEntities) {
          final placements = config.getEntityPlacementsForGroup(groupId);
          for (final placement in placements) {
            final menuItem = _entityPlacementToNavMenuItem(placement);
            if (menuItem != null) {
              groupChildren.add(menuItem);
            }
          }
        }

        // Only add group if it has children
        if (groupChildren.isNotEmpty) {
          // If only one group, add items directly without section header
          if (strategy.groups.length == 1) {
            items.addAll(groupChildren);
          } else {
            // Multiple groups - add as collapsible section
            items.add(
              NavMenuItem(
                id: 'section_$groupId',
                label: group.label,
                isSectionHeader: true,
                children: groupChildren,
                requiresAuth: false,
              ),
            );
          }
        }
      }
    }

    return items;
  }

  // ============================================================================
  // SIDEBAR BUILDING (Legacy - builds from all groups)
  // ============================================================================

  static List<NavMenuItem> _buildSidebarFromConfig() {
    final config = NavConfigService.config;
    final items = <NavMenuItem>[];

    // Process groups in order
    for (final group in config.sortedGroups) {
      // Add sidebar static items for this group
      final staticItems = config
          .getStaticItemsForGroup(group.id)
          .where((s) => s.menuType == NavMenuType.sidebar);

      for (final staticItem in staticItems) {
        items.add(_staticItemToNavMenuItem(staticItem));
      }

      // Add entity placements for this group
      final entityPlacements = config.getEntityPlacementsForGroup(group.id);
      for (final placement in entityPlacements) {
        final menuItem = _entityPlacementToNavMenuItem(placement);
        if (menuItem != null) {
          items.add(menuItem);
        }
      }

      // Add divider after each group (except the last)
      if (group.id != config.sortedGroups.last.id && items.isNotEmpty) {
        items.add(NavMenuItem.divider(id: 'divider_${group.id}'));
      }
    }

    return items;
  }

  // ============================================================================
  // USER MENU BUILDING
  // ============================================================================

  static List<NavMenuItem> _buildUserMenuFromConfig() {
    final config = NavConfigService.config;
    return config.userMenuStaticItems.map(_staticItemToNavMenuItem).toList();
  }

  // ============================================================================
  // CONVERTERS
  // ============================================================================

  /// Convert StaticNavItem to NavMenuItem with permission check
  ///
  /// Uses `permissionResource` for nav visibility (distinct from entity rlsResource
  /// which controls row-level data access).
  /// If `permissionResource` is null, item is visible to all authenticated users.
  static NavMenuItem _staticItemToNavMenuItem(StaticNavItem staticItem) {
    // Map permissionResource to ResourceType for nav visibility check
    final resourceType = ResourceType.fromString(staticItem.permissionResource);

    ErrorService.logInfo(
      '[NavMenu] Converting static item',
      context: {
        'id': staticItem.id,
        'permissionResource': staticItem.permissionResource,
        'resourceTypeResolved': resourceType?.toBackendString(),
        'hasPermissionCheck': resourceType != null,
      },
    );

    // Use icon from config, fallback to ID-based lookup
    final icon =
        EntityIconResolver.fromString(staticItem.icon) ??
        EntityIconResolver.getStaticIcon(staticItem.id);

    return NavMenuItem(
      id: staticItem.id,
      label: staticItem.label,
      icon: icon,
      route: staticItem.route,
      // If no permissionResource, just require auth (any logged-in user)
      // If permissionResource exists, use visibleWhen for permission check
      requiresAuth: resourceType == null,
      visibleWhen: resourceType != null
          ? (user) => _canAccessResource(resourceType, user)
          : null,
    );
  }

  /// Convert EntityPlacement to NavMenuItem
  ///
  /// For entities, nav visibility uses the entity's `rlsResource` from metadata.
  /// This is intentional: if you can't read any records, hide the nav item.
  ///
  /// [routePrefix] - Optional route prefix. Defaults to '' (root level).
  ///   Entities sit directly under root, matching backend /api/:entity structure.
  ///   Use '/admin' for admin entity settings routes.
  static NavMenuItem? _entityPlacementToNavMenuItem(
    EntityPlacement placement, {
    String routePrefix = '',
  }) {
    // Get entity metadata for display name and icon
    if (!EntityMetadataRegistry.has(placement.entityName)) {
      return null;
    }
    final metadata = EntityMetadataRegistry.get(placement.entityName);

    return NavMenuItem(
      id: 'entity_${placement.entityName}',
      label: metadata.displayNamePlural,
      icon: EntityIconResolver.getIcon(
        placement.entityName,
        metadataIcon: metadata.icon,
      ),
      route: '$routePrefix/${placement.entityName}',
      // Don't use requiresAuth - visibleWhen handles permission checks
      requiresAuth: false,
      // Entities use their rlsResource from metadata
      visibleWhen: (user) => _canAccessEntity(placement.entityName, user),
    );
  }

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  /// Check if user can access a resource
  ///
  /// DEFENSIVE: Returns true on error to avoid hiding menu items due to bugs.
  /// Backend always validates permissions, so false negatives are worse than
  /// false positives (user clicks, gets 403 → that's fine).
  static bool _canAccessResource(
    ResourceType resource,
    Map<String, dynamic>? user,
  ) {
    try {
      if (user == null) {
        ErrorService.logWarning(
          '[NavMenu] _canAccessResource: user is null',
          context: {'resource': resource.toBackendString()},
        );
        return false;
      }
      final role = user['role'] as String?;
      final rolePriority = user['role_priority'];
      if (role == null || role.isEmpty) {
        ErrorService.logWarning(
          '[NavMenu] _canAccessResource: role is null/empty',
          context: {
            'resource': resource.toBackendString(),
            'userKeys': user.keys.toList(),
            'role_priority': rolePriority,
          },
        );
        return true; // Defensive: show menu item, let backend reject if unauthorized
      }
      final result = PermissionService.hasPermission(
        role,
        resource,
        CrudOperation.read,
      );
      ErrorService.logInfo(
        '[NavMenu] _canAccessResource check',
        context: {
          'resource': resource.toBackendString(),
          'role': role,
          'role_priority': rolePriority,
          'result': result,
        },
      );
      return result;
    } catch (e) {
      ErrorService.logError(
        '[NavMenu] _canAccessResource exception - defaulting to visible',
        error: e,
        context: {'resource': resource.toBackendString()},
      );
      return true; // Defensive: show menu item on error
    }
  }

  /// Check if user can access an entity
  static bool _canAccessEntity(String entityName, Map<String, dynamic>? user) {
    if (user == null) return false;
    final role = user['role'] as String?;

    // Get entity metadata to find rlsResource
    if (!EntityMetadataRegistry.has(entityName)) {
      return true; // Unknown entity, allow access
    }
    final metadata = EntityMetadataRegistry.get(entityName);

    // Use ResourceType.fromString which handles snake_case conversion
    final resourceType = ResourceType.fromString(metadata.rlsResource.name);
    if (resourceType == null) {
      return true; // Unknown resource type, allow access
    }

    return PermissionService.hasPermission(
      role,
      resourceType,
      CrudOperation.read,
    );
  }

  // ============================================================================
  // FALLBACK REGISTRY
  // ============================================================================

  /// Fallback strategy registry - maps strategy IDs to fallback items
  /// This replaces hardcoded conditionals with a lookup pattern.
  static final Map<String, List<NavMenuItem> Function()> _fallbackRegistry = {
    'app': () => _fallbackSidebarItems,
    'admin': () => _fallbackAdminSidebarItems,
  };

  /// Known route patterns for strategy inference (when config not loaded)
  /// Format: route prefix -> strategy ID
  static const Map<String, String> _routeStrategyHints = {
    '/admin': 'admin',
    '/settings': 'app',
  };

  /// Get fallback items for a strategy
  static List<NavMenuItem> _getFallbackForStrategy(String strategyId) {
    final factory = _fallbackRegistry[strategyId];
    return factory?.call() ?? _fallbackSidebarItems;
  }

  /// Infer strategy from route when config not available
  static String _inferStrategyFromRoute(String route) {
    for (final entry in _routeStrategyHints.entries) {
      if (route.startsWith(entry.key)) {
        return entry.value;
      }
    }
    return 'app'; // Default strategy
  }

  // ============================================================================
  // FALLBACK ITEMS
  // ============================================================================

  /// Fallback sidebar items when config not loaded
  static List<NavMenuItem> get _fallbackSidebarItems => [
    NavMenuItem(
      id: 'dashboard',
      label: 'Dashboard',
      icon: EntityIconResolver.getStaticIcon('dashboard'),
      route: AppRoutes.home,
      requiresAuth: false,
    ),
  ];

  /// Fallback admin sidebar items when config not loaded
  static List<NavMenuItem> get _fallbackAdminSidebarItems => [
    // Home (clickable)
    NavMenuItem(
      id: 'section_home',
      label: 'Home',
      icon: EntityIconResolver.getStaticIcon('dashboard'),
      route: AppRoutes.admin,
      requiresAuth: false,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),
    // Entities (grouper with children)
    NavMenuItem.section(id: 'section_entities', label: 'Entities'),
    NavMenuItem(
      id: 'entity_user',
      label: 'Users',
      icon: EntityIconResolver.getIcon('user'),
      route: '/admin/user',
      requiresAuth: false,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),
    NavMenuItem(
      id: 'entity_role',
      label: 'Roles',
      icon: EntityIconResolver.getIcon('role'),
      route: '/admin/role',
      requiresAuth: false,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),
    // Logs (single item - tabs inside the screen)
    NavMenuItem(
      id: 'logs',
      label: 'Logs',
      icon: EntityIconResolver.getStaticIcon('history'),
      route: AppRoutes.adminLogs,
      requiresAuth: false,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),
  ];

  /// Fallback user menu items when config not loaded
  static List<NavMenuItem> get _fallbackUserMenuItems => [
    NavMenuItem(
      id: 'admin',
      label: 'Admin',
      icon: EntityIconResolver.getStaticIcon('admin_panel'),
      route: AppRoutes.admin,
      requiresAuth: false,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),
    NavMenuItem(
      id: 'settings',
      label: 'Settings',
      icon: EntityIconResolver.getStaticIcon('settings'),
      route: AppRoutes.settings,
      requiresAuth: false,
    ),
  ];
}
