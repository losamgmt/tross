/// Config Loader Contract Tests (Strategy 7)
///
/// Mass-gain pattern: Test config loader MODELS with same contract pattern.
/// Test model construction, fromJson, and properties.
///
/// Coverage targets:
/// - NavConfigLoader models (150 uncovered lines)
/// - PermissionConfigLoader models (122 uncovered lines)
library;

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/nav_config_loader.dart';
import 'package:tross_app/services/permission_config_loader.dart';

// Helper to create properly typed JSON from string
Map<String, dynamic> _json(String s) => jsonDecode(s) as Map<String, dynamic>;

void main() {
  group('Strategy 7: Config Loader Contract Tests', () {
    group('PublicRoute', () {
      test('fromJson creates valid instance', () {
        final route = PublicRoute.fromJson({'id': 'login', 'path': '/login'});

        expect(route.id, 'login');
        expect(route.path, '/login');
      });
    });

    group('NavGroup', () {
      test('fromJson creates valid instance', () {
        final group = NavGroup.fromJson({
          'id': 'main',
          'label': 'Main Menu',
          'order': 1,
        });

        expect(group.id, 'main');
        expect(group.label, 'Main Menu');
        expect(group.order, 1);
      });
    });

    group('StaticNavItem', () {
      test('fromJson creates valid instance with all fields', () {
        final item = StaticNavItem.fromJson({
          'id': 'dashboard',
          'label': 'Dashboard',
          'icon': 'dashboard_outlined',
          'route': '/dashboard',
          'group': 'main',
          'order': 1,
          'permissionResource': 'dashboard',
          'menuType': 'sidebar',
        });

        expect(item.id, 'dashboard');
        expect(item.label, 'Dashboard');
        expect(item.icon, 'dashboard_outlined');
        expect(item.route, '/dashboard');
        expect(item.group, 'main');
        expect(item.order, 1);
        expect(item.permissionResource, 'dashboard');
        expect(item.menuType, NavMenuType.sidebar);
      });

      test('fromJson handles userMenu type', () {
        final item = StaticNavItem.fromJson({
          'id': 'settings',
          'label': 'Settings',
          'route': '/settings',
          'group': 'user',
          'order': 1,
          'menuType': 'userMenu',
        });

        expect(item.menuType, NavMenuType.userMenu);
      });

      test('fromJson defaults missing optional fields', () {
        final item = StaticNavItem.fromJson({
          'id': 'test',
          'label': 'Test',
          'route': '/test',
          'group': 'main',
          'order': 1,
        });

        expect(item.icon, isNull);
        expect(item.permissionResource, isNull);
        expect(item.menuType, NavMenuType.sidebar);
      });
    });

    group('SidebarSection', () {
      test('fromJson creates valid instance', () {
        final section = SidebarSection.fromJson({
          'id': 'entities',
          'label': 'Entities',
          'icon': 'folder_outlined',
          'order': 1,
        });

        expect(section.id, 'entities');
        expect(section.label, 'Entities');
        expect(section.icon, 'folder_outlined');
        expect(section.order, 1);
        expect(section.hasRoute, false);
        expect(section.hasChildren, false);
      });

      test('fromJson with route', () {
        final section = SidebarSection.fromJson({
          'id': 'dashboard',
          'label': 'Dashboard',
          'order': 0,
          'route': '/dashboard',
        });

        expect(section.hasRoute, true);
        expect(section.route, '/dashboard');
      });

      test('fromJson with children', () {
        final section = SidebarSection.fromJson({
          'id': 'logs',
          'label': 'Logs',
          'order': 5,
          'isGrouper': true,
          'children': [
            {'id': 'data_logs', 'label': 'Data', 'route': '/logs/data'},
            {'id': 'auth_logs', 'label': 'Auth', 'route': '/logs/auth'},
          ],
        });

        expect(section.isGrouper, true);
        expect(section.hasChildren, true);
        expect(section.children.length, 2);
        expect(section.children[0].id, 'data_logs');
        expect(section.children[1].route, '/logs/auth');
      });
    });

    group('SidebarSectionChild', () {
      test('fromJson creates valid instance', () {
        final child = SidebarSectionChild.fromJson({
          'id': 'data_logs',
          'label': 'Data Logs',
          'icon': 'storage_outlined',
          'route': '/logs/data',
        });

        expect(child.id, 'data_logs');
        expect(child.label, 'Data Logs');
        expect(child.icon, 'storage_outlined');
        expect(child.route, '/logs/data');
      });
    });

    group('SidebarStrategy', () {
      test('fromJson creates valid instance', () {
        final strategy = SidebarStrategy.fromJson('app', {
          'label': 'Application',
          'groups': ['main', 'entities'],
          'includeEntities': true,
          'showDashboard': true,
        });

        expect(strategy.id, 'app');
        expect(strategy.label, 'Application');
        expect(strategy.groups, ['main', 'entities']);
        expect(strategy.includeEntities, true);
        expect(strategy.showDashboard, true);
        expect(strategy.hasSections, false);
      });

      test('fromJson with sections', () {
        final strategy = SidebarStrategy.fromJson('admin', {
          'label': 'Admin',
          'groups': ['admin'],
          'sections': [
            {'id': 'users', 'label': 'Users', 'order': 1},
          ],
        });

        expect(strategy.hasSections, true);
        expect(strategy.sections.length, 1);
      });

      test('fromJson defaults optional fields', () {
        final strategy = SidebarStrategy.fromJson('test', {});

        expect(strategy.label, 'test');
        expect(strategy.groups, isEmpty);
        expect(strategy.includeEntities, true);
        expect(strategy.showDashboard, false);
        expect(strategy.showHome, false);
      });
    });

    group('NavConfig', () {
      test('fromJson creates valid instance', () {
        final config = NavConfig.fromJson({
          'version': '1.0',
          'publicRoutes': [
            {'id': 'login', 'path': '/login'},
          ],
          'groups': [
            {'id': 'main', 'label': 'Main', 'order': 1},
          ],
          'staticItems': [
            {
              'id': 'dashboard',
              'label': 'Dashboard',
              'route': '/dashboard',
              'group': 'main',
              'order': 1,
            },
          ],
          'entityPlacements': {},
        });

        expect(config.version, '1.0');
        expect(config.publicRoutes.length, 1);
        expect(config.groups.length, 1);
        expect(config.staticItems.length, 1);
      });

      test('fromJson handles empty config', () {
        final config = NavConfig.fromJson({'version': '1.0'});

        expect(config.version, '1.0');
        expect(config.publicRoutes, isEmpty);
        expect(config.groups, isEmpty);
        expect(config.staticItems, isEmpty);
      });
    });

    // =========================================================================
    // PermissionConfigLoader Models
    // =========================================================================

    group('RoleConfig', () {
      test('fromJson creates valid instance', () {
        final role = RoleConfig.fromJson({
          'priority': 100,
          'description': 'Admin user',
        });

        expect(role.priority, 100);
        expect(role.description, 'Admin user');
      });
    });

    group('PermissionDetail', () {
      test('fromJson creates valid instance with all fields', () {
        final detail = PermissionDetail.fromJson({
          'minimumRole': 'admin',
          'minimumPriority': 100,
          'description': 'Can create users',
          'disabled': false,
        });

        expect(detail.minimumRole, 'admin');
        expect(detail.minimumPriority, 100);
        expect(detail.description, 'Can create users');
        expect(detail.disabled, false);
      });

      test('fromJson handles null minimumRole', () {
        final detail = PermissionDetail.fromJson({
          'minimumRole': null,
          'minimumPriority': 0,
          'description': 'Disabled operation',
          'disabled': true,
        });

        expect(detail.minimumRole, isNull);
        expect(detail.disabled, true);
      });

      test('fromJson defaults disabled to false', () {
        final detail = PermissionDetail.fromJson({
          'minimumRole': 'viewer',
          'minimumPriority': 10,
          'description': 'Read only',
        });

        expect(detail.disabled, false);
      });
    });

    group('NavVisibility', () {
      test('fromJson creates valid instance', () {
        final nav = NavVisibility.fromJson({
          'minimumRole': 'technician',
          'minimumPriority': 30,
          'description': 'Visible to technicians and above',
        });

        expect(nav.minimumRole, 'technician');
        expect(nav.minimumPriority, 30);
        expect(nav.description, 'Visible to technicians and above');
      });
    });

    group('ResourceConfig', () {
      test('fromJson creates valid instance with all fields', () {
        final resource = ResourceConfig.fromJson({
          'description': 'User management',
          'rowLevelSecurity': {'admin': 'all', 'technician': 'assigned'},
          'permissions': {
            'read': {
              'minimumRole': 'viewer',
              'minimumPriority': 10,
              'description': 'Read users',
            },
            'create': {
              'minimumRole': 'admin',
              'minimumPriority': 100,
              'description': 'Create users',
            },
          },
          'navVisibility': {
            'minimumRole': 'admin',
            'minimumPriority': 100,
            'description': 'Admin only',
          },
        });

        expect(resource.description, 'User management');
        expect(resource.rowLevelSecurity, isNotNull);
        expect(resource.rowLevelSecurity!['admin'], 'all');
        expect(resource.permissions.length, 2);
        expect(resource.navVisibility, isNotNull);
      });

      test('fromJson handles null rowLevelSecurity', () {
        final resource = ResourceConfig.fromJson({
          'description': 'Public resource',
          'permissions': {
            'read': {
              'minimumRole': null,
              'minimumPriority': 0,
              'description': 'Public read',
            },
          },
        });

        expect(resource.rowLevelSecurity, isNull);
        expect(resource.navVisibility, isNull);
      });
    });

    group('PermissionConfig', () {
      test('fromJson creates valid instance', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "3.0.1",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {
              "admin": {"priority": 100, "description": "Admin"},
              "viewer": {"priority": 10, "description": "Viewer"}
            },
            "resources": {
              "users": {
                "description": "User management",
                "permissions": {
                  "read": {
                    "minimumRole": "viewer",
                    "minimumPriority": 10,
                    "description": "Read users"
                  }
                }
              }
            }
          }
        '''),
        );

        expect(config.version, '3.0.1');
        expect(config.roles.length, 2);
        expect(config.resources.length, 1);
      });

      test('getRolePriority returns priority for valid role', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {
              "admin": {"priority": 100, "description": "Admin"}
            },
            "resources": {}
          }
        '''),
        );

        expect(config.getRolePriority('admin'), 100);
        expect(config.getRolePriority('ADMIN'), 100); // case insensitive
      });

      test('getRolePriority returns null for null/empty role', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {}
          }
        '''),
        );

        expect(config.getRolePriority(null), isNull);
        expect(config.getRolePriority(''), isNull);
      });

      test(
        'getMinimumPriority returns priority for valid resource/operation',
        () {
          final config = PermissionConfig.fromJson(
            _json('''
            {
              "version": "1.0",
              "lastModified": "2025-01-01T00:00:00Z",
              "roles": {},
              "resources": {
                "users": {
                  "description": "Users",
                  "permissions": {
                    "read": {
                      "minimumRole": "viewer",
                      "minimumPriority": 10,
                      "description": "Read"
                    }
                  }
                }
              }
            }
          '''),
          );

          expect(config.getMinimumPriority('users', 'read'), 10);
        },
      );

      test('getMinimumPriority returns null for missing resource', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {}
          }
        '''),
        );

        expect(config.getMinimumPriority('nonexistent', 'read'), isNull);
      });

      test('getMinimumRole returns role for valid resource/operation', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {
              "users": {
                "description": "Users",
                "permissions": {
                  "create": {
                    "minimumRole": "admin",
                    "minimumPriority": 100,
                    "description": "Create"
                  }
                }
              }
            }
          }
        '''),
        );

        expect(config.getMinimumRole('users', 'create'), 'admin');
      });

      test('getMinimumRole returns null for missing resource', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {}
          }
        '''),
        );

        expect(config.getMinimumRole('nonexistent', 'read'), isNull);
      });

      test('getNavVisibilityPriority returns explicit navVisibility', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {
              "users": {
                "description": "Users",
                "navVisibility": {
                  "minimumRole": "admin",
                  "minimumPriority": 100,
                  "description": "Admin nav"
                },
                "permissions": {
                  "read": {
                    "minimumRole": "viewer",
                    "minimumPriority": 10,
                    "description": "Read"
                  }
                }
              }
            }
          }
        '''),
        );

        expect(config.getNavVisibilityPriority('users'), 100);
      });

      test('getNavVisibilityPriority falls back to read permission', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {
              "users": {
                "description": "Users",
                "permissions": {
                  "read": {
                    "minimumRole": "viewer",
                    "minimumPriority": 10,
                    "description": "Read"
                  }
                }
              }
            }
          }
        '''),
        );

        expect(config.getNavVisibilityPriority('users'), 10);
      });

      test('getNavVisibilityPriority returns null for missing resource', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {}
          }
        '''),
        );

        expect(config.getNavVisibilityPriority('nonexistent'), isNull);
      });

      test('getRowLevelSecurity returns policy for role', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {
              "work_orders": {
                "description": "Work Orders",
                "rowLevelSecurity": {
                  "admin": "all",
                  "technician": "assigned"
                },
                "permissions": {}
              }
            }
          }
        '''),
        );

        expect(config.getRowLevelSecurity('admin', 'work_orders'), 'all');
        expect(
          config.getRowLevelSecurity('technician', 'work_orders'),
          'assigned',
        );
      });

      test('getRowLevelSecurity returns null for null/empty role', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {
              "work_orders": {
                "description": "Work Orders",
                "rowLevelSecurity": {"admin": "all"},
                "permissions": {}
              }
            }
          }
        '''),
        );

        expect(config.getRowLevelSecurity(null, 'work_orders'), isNull);
        expect(config.getRowLevelSecurity('', 'work_orders'), isNull);
      });

      test('getRowLevelSecurity returns null for missing resource', () {
        final config = PermissionConfig.fromJson(
          _json('''
          {
            "version": "1.0",
            "lastModified": "2025-01-01T00:00:00Z",
            "roles": {},
            "resources": {}
          }
        '''),
        );

        expect(config.getRowLevelSecurity('admin', 'nonexistent'), isNull);
      });
    });
  });
}
