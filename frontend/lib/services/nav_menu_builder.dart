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
  static List<NavMenuItem> filterForUser(
    List<NavMenuItem> items,
    Map<String, dynamic>? user,
  ) {
    return items.where((item) => item.isVisibleFor(user)).toList();
  }

  // ============================================================================
  // SIDEBAR BUILDING
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
  static NavMenuItem _staticItemToNavMenuItem(StaticNavItem staticItem) {
    // Map permissionResource to ResourceType for nav visibility check
    final resourceType = ResourceType.fromString(staticItem.permissionResource);

    // Use icon from config, fallback to ID-based lookup
    final icon =
        EntityIconResolver.fromString(staticItem.icon) ??
        EntityIconResolver.getStaticIcon(staticItem.id);

    return NavMenuItem(
      id: staticItem.id,
      label: staticItem.label,
      icon: icon,
      route: staticItem.route,
      // Don't use requiresAuth - visibleWhen handles permission checks
      requiresAuth: false,
      visibleWhen: resourceType != null
          ? (user) => _canAccessResource(resourceType, user)
          : null,
    );
  }

  /// Convert EntityPlacement to NavMenuItem
  ///
  /// For entities, nav visibility uses the entity's `rlsResource` from metadata.
  /// This is intentional: if you can't read any records, hide the nav item.
  static NavMenuItem? _entityPlacementToNavMenuItem(EntityPlacement placement) {
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
      route: '/entity/${placement.entityName}',
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
  static bool _canAccessResource(
    ResourceType resource,
    Map<String, dynamic>? user,
  ) {
    if (user == null) return false;
    final role = user['role'] as String?;
    return PermissionService.hasPermission(role, resource, CrudOperation.read);
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
  // FALLBACKS
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
