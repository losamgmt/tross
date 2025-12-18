import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/nav_config_loader.dart';

void main() {
  setUp(() {
    NavConfigService.reset();
  });

  group('NavConfig Model', () {
    test('parses complete config from JSON', () {
      final json = {
        'version': '1.0.0',
        'publicRoutes': [
          {'id': 'login', 'path': '/login'},
          {'id': 'callback', 'path': '/callback'},
        ],
        'groups': [
          {'id': 'main', 'label': 'Main', 'order': 0},
          {'id': 'admin', 'label': 'Administration', 'order': 99},
        ],
        'staticItems': [
          {
            'id': 'dashboard',
            'label': 'Dashboard',
            'route': '/',
            'group': 'main',
            'order': 0,
            'permissionResource': 'dashboard',
          },
        ],
        'entityPlacements': {
          'customer': {'group': 'crm', 'order': 1},
          'workOrder': {'group': 'operations', 'order': 2},
        },
      };

      final config = NavConfig.fromJson(json);

      expect(config.version, '1.0.0');
      expect(config.publicRoutes.length, 2);
      expect(config.groups.length, 2);
      expect(config.staticItems.length, 1);
      expect(config.entityPlacements.length, 2);
    });

    test('handles empty config gracefully', () {
      final json = <String, dynamic>{};
      final config = NavConfig.fromJson(json);

      expect(config.version, '1.0.0');
      expect(config.publicRoutes, isEmpty);
      expect(config.groups, isEmpty);
      expect(config.staticItems, isEmpty);
      expect(config.entityPlacements, isEmpty);
    });
  });

  group('PublicRoute Model', () {
    test('parses from JSON', () {
      final json = {'id': 'login', 'path': '/login'};
      final route = PublicRoute.fromJson(json);

      expect(route.id, 'login');
      expect(route.path, '/login');
    });
  });

  group('NavGroup Model', () {
    test('parses from JSON', () {
      final json = {'id': 'admin', 'label': 'Administration', 'order': 99};
      final group = NavGroup.fromJson(json);

      expect(group.id, 'admin');
      expect(group.label, 'Administration');
      expect(group.order, 99);
    });
  });

  group('StaticNavItem Model', () {
    test('parses from JSON', () {
      final json = {
        'id': 'dashboard',
        'label': 'Dashboard',
        'route': '/',
        'group': 'main',
        'order': 0,
        'permissionResource': 'dashboard',
      };
      final item = StaticNavItem.fromJson(json);

      expect(item.id, 'dashboard');
      expect(item.label, 'Dashboard');
      expect(item.route, '/');
      expect(item.group, 'main');
      expect(item.order, 0);
      expect(item.permissionResource, 'dashboard');
    });
  });

  group('EntityPlacement Model', () {
    test('parses from JSON with entity name', () {
      final json = {'group': 'crm', 'order': 1};
      final placement = EntityPlacement.fromJson('customer', json);

      expect(placement.entityName, 'customer');
      expect(placement.group, 'crm');
      expect(placement.order, 1);
    });
  });

  group('NavConfig Helper Methods', () {
    late NavConfig config;

    setUp(() {
      config = NavConfig.fromJson({
        'version': '1.0.0',
        'publicRoutes': [
          {'id': 'login', 'path': '/login'},
          {'id': 'error', 'path': '/error'},
        ],
        'groups': [
          {'id': 'main', 'label': 'Main', 'order': 0},
          {'id': 'crm', 'label': 'CRM', 'order': 1},
          {'id': 'admin', 'label': 'Admin', 'order': 99},
        ],
        'staticItems': [
          {
            'id': 'dashboard',
            'label': 'Dashboard',
            'route': '/',
            'group': 'main',
            'order': 0,
            'permissionResource': 'dashboard',
          },
          {
            'id': 'admin_panel',
            'label': 'Admin Panel',
            'route': '/admin',
            'group': 'admin',
            'order': 0,
            'permissionResource': 'admin_panel',
          },
        ],
        'entityPlacements': {
          'customer': {'group': 'crm', 'order': 1},
          'contract': {'group': 'crm', 'order': 2},
          'user': {'group': 'admin', 'order': 1},
        },
      });
    });

    test('sortedGroups returns groups in order', () {
      final sorted = config.sortedGroups;
      expect(sorted[0].id, 'main');
      expect(sorted[1].id, 'crm');
      expect(sorted[2].id, 'admin');
    });

    test('getStaticItemsForGroup returns correct items', () {
      final mainItems = config.getStaticItemsForGroup('main');
      expect(mainItems.length, 1);
      expect(mainItems[0].id, 'dashboard');

      final adminItems = config.getStaticItemsForGroup('admin');
      expect(adminItems.length, 1);
      expect(adminItems[0].id, 'admin_panel');

      final crmItems = config.getStaticItemsForGroup('crm');
      expect(crmItems, isEmpty);
    });

    test('getEntityPlacementsForGroup returns correct placements', () {
      final crmPlacements = config.getEntityPlacementsForGroup('crm');
      expect(crmPlacements.length, 2);
      expect(crmPlacements[0].entityName, 'customer');
      expect(crmPlacements[1].entityName, 'contract');

      final adminPlacements = config.getEntityPlacementsForGroup('admin');
      expect(adminPlacements.length, 1);
      expect(adminPlacements[0].entityName, 'user');
    });

    test('hasEntityPlacement returns correct value', () {
      expect(config.hasEntityPlacement('customer'), isTrue);
      expect(config.hasEntityPlacement('preferences'), isFalse);
    });

    test('getPublicRoute returns correct route', () {
      expect(config.getPublicRoute('login')?.path, '/login');
      expect(config.getPublicRoute('unknown'), isNull);
    });

    test('isPublicRoute checks paths correctly', () {
      expect(config.isPublicRoute('/login'), isTrue);
      expect(config.isPublicRoute('/error'), isTrue);
      expect(config.isPublicRoute('/'), isFalse);
      expect(config.isPublicRoute('/admin'), isFalse);
    });
  });

  group('NavConfigService', () {
    test('loadFromJson initializes service', () {
      expect(NavConfigService.isInitialized, isFalse);

      NavConfigService.loadFromJson({
        'version': '1.0.0',
        'publicRoutes': [],
        'groups': [],
        'staticItems': [],
        'entityPlacements': {},
      });

      expect(NavConfigService.isInitialized, isTrue);
      expect(NavConfigService.config.version, '1.0.0');
    });

    test('reset clears the service', () {
      NavConfigService.loadFromJson({
        'version': '2.0.0',
        'publicRoutes': [],
        'groups': [],
        'staticItems': [],
        'entityPlacements': {},
      });

      expect(NavConfigService.isInitialized, isTrue);

      NavConfigService.reset();

      expect(NavConfigService.isInitialized, isFalse);
    });

    test('config throws if not initialized', () {
      expect(() => NavConfigService.config, throwsStateError);
    });
  });
}
