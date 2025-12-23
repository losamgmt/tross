/// Tests for NavMenuBuilder sidebar strategy functionality
///
/// Verifies:
/// - Strategy-based sidebar item building
/// - Route-to-strategy mapping
/// - Fallback behavior when config not loaded
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/nav_config_loader.dart';
import 'package:tross_app/services/nav_menu_builder.dart';

void main() {
  group('NavMenuBuilder Sidebar Strategies', () {
    // Sample nav config with strategies
    final testConfig = {
      'version': '1.4.0',
      'sidebarStrategies': {
        'app': {
          'label': 'Main Navigation',
          'groups': ['main', 'crm'],
          'includeEntities': true,
          'showDashboard': true,
        },
        'admin': {
          'label': 'Administration',
          'groups': ['admin'],
          'includeEntities': true,
          'sections': [
            {'id': 'entities', 'label': 'Entity Settings', 'order': 0},
            {'id': 'platform', 'label': 'Platform', 'order': 1},
          ],
        },
      },
      'routeStrategies': {
        '/home': 'app',
        '/entity/*': 'app',
        '/admin': 'admin',
        '/admin/*': 'admin',
      },
      'publicRoutes': [
        {'id': 'login', 'path': '/login'},
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
          'route': '/home',
          'group': 'main',
          'order': 0,
          'menuType': 'sidebar',
        },
      ],
      'entityPlacements': {},
    };

    setUp(() {
      // Reset service before each test
      NavConfigService.reset();
    });

    tearDown(() {
      NavConfigService.reset();
    });

    group('NavConfig Strategy Resolution', () {
      test('getStrategyForRoute returns correct strategy for exact match', () {
        NavConfigService.loadFromJson(testConfig);
        final config = NavConfigService.config;

        final homeStrategy = config.getStrategyForRoute('/home');
        expect(homeStrategy?.id, equals('app'));

        final adminStrategy = config.getStrategyForRoute('/admin');
        expect(adminStrategy?.id, equals('admin'));
      });

      test('getStrategyForRoute supports wildcard matching', () {
        NavConfigService.loadFromJson(testConfig);
        final config = NavConfigService.config;

        // /entity/* should match /entity/customer
        final entityStrategy = config.getStrategyForRoute('/entity/customer');
        expect(entityStrategy?.id, equals('app'));

        // /admin/* should match /admin/users
        final adminSubStrategy = config.getStrategyForRoute('/admin/users');
        expect(adminSubStrategy?.id, equals('admin'));
      });

      test(
        'getStrategyForRoute falls back to app strategy for unknown routes',
        () {
          NavConfigService.loadFromJson(testConfig);
          final config = NavConfigService.config;

          final unknownStrategy = config.getStrategyForRoute('/unknown/path');
          expect(unknownStrategy?.id, equals('app'));
        },
      );
    });

    group('SidebarStrategy Properties', () {
      test('parses sections correctly', () {
        NavConfigService.loadFromJson(testConfig);
        final strategy = NavConfigService.config.getStrategy('admin');

        expect(strategy?.hasSections, isTrue);
        expect(strategy?.sections.length, equals(2));
        expect(strategy?.sections.first.id, equals('entities'));
        expect(strategy?.sections.first.label, equals('Entity Settings'));
      });

      test('parses groups correctly', () {
        NavConfigService.loadFromJson(testConfig);
        final strategy = NavConfigService.config.getStrategy('app');

        expect(strategy?.groups, contains('main'));
        expect(strategy?.groups, contains('crm'));
        expect(strategy?.showDashboard, isTrue);
      });
    });

    group('Fallback Behavior', () {
      test(
        'buildSidebarItemsForStrategy returns fallback when not initialized',
        () {
          // Don't initialize config
          final items = NavMenuBuilder.buildSidebarItemsForStrategy('app');

          // Should return fallback items (at least dashboard)
          expect(items, isNotEmpty);
          expect(items.any((i) => i.id == 'dashboard'), isTrue);
        },
      );

      test(
        'buildSidebarItemsForStrategy returns admin fallback for admin strategy',
        () {
          // Don't initialize config
          final items = NavMenuBuilder.buildSidebarItemsForStrategy('admin');

          // Should return admin fallback items
          expect(items, isNotEmpty);
        },
      );

      test('buildSidebarItemsForRoute uses route prefix for fallback', () {
        // Don't initialize config
        final appItems = NavMenuBuilder.buildSidebarItemsForRoute('/home');
        final adminItems = NavMenuBuilder.buildSidebarItemsForRoute(
          '/admin/users',
        );

        // Should use correct fallbacks based on route
        expect(appItems.any((i) => i.id == 'dashboard'), isTrue);
        expect(adminItems, isNotEmpty);
      });
    });
  });

  group('SidebarSection Model', () {
    test('parses from JSON correctly', () {
      final json = {
        'id': 'test_section',
        'label': 'Test Section',
        'icon': 'settings_outlined',
        'order': 5,
      };

      final section = SidebarSection.fromJson(json);

      expect(section.id, equals('test_section'));
      expect(section.label, equals('Test Section'));
      expect(section.icon, equals('settings_outlined'));
      expect(section.order, equals(5));
    });

    test('uses default order when not provided', () {
      final json = {'id': 'no_order', 'label': 'No Order'};

      final section = SidebarSection.fromJson(json);
      expect(section.order, equals(0));
    });
  });

  group('SidebarStrategy Model', () {
    test('parses from JSON correctly', () {
      final json = {
        'label': 'Test Strategy',
        'groups': ['group1', 'group2'],
        'includeEntities': false,
        'showDashboard': true,
      };

      final strategy = SidebarStrategy.fromJson('test', json);

      expect(strategy.id, equals('test'));
      expect(strategy.label, equals('Test Strategy'));
      expect(strategy.groups, equals(['group1', 'group2']));
      expect(strategy.includeEntities, isFalse);
      expect(strategy.showDashboard, isTrue);
      expect(strategy.hasSections, isFalse);
    });

    test('uses defaults for missing properties', () {
      final json = <String, dynamic>{};

      final strategy = SidebarStrategy.fromJson('minimal', json);

      expect(strategy.id, equals('minimal'));
      expect(strategy.label, equals('minimal'));
      expect(strategy.groups, isEmpty);
      expect(strategy.includeEntities, isTrue);
      expect(strategy.showDashboard, isFalse);
    });
  });
}
