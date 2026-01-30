/// Dashboard Config Loader Tests
///
/// Tests the minimal, config-driven dashboard configuration system.
/// Uses new entity-based API (not legacy sections/stats).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/dashboard_config.dart';
import 'package:tross_app/services/dashboard_config_loader.dart';

void main() {
  group('DashboardConfig', () {
    group('fromJson', () {
      test('parses complete config correctly', () {
        final json = {
          'version': '1.0.0',
          'entities': [
            {
              'entity': 'work_order',
              'minRole': 'customer',
              'groupBy': 'status',
              'order': 1,
            },
            {
              'entity': 'invoice',
              'minRole': 'manager',
              'groupBy': 'status',
              'order': 2,
            },
          ],
        };

        final config = DashboardConfig.fromJson(json);

        expect(config.version, equals('1.0.0'));
        expect(config.entities.length, equals(2));

        // First entity
        expect(config.entities[0].entity, equals('work_order'));
        expect(config.entities[0].minRole, equals('customer'));
        expect(config.entities[0].groupBy, equals('status'));

        // Second entity
        expect(config.entities[1].entity, equals('invoice'));
        expect(config.entities[1].minRole, equals('manager'));
      });

      test('sorts entities by order', () {
        final json = {
          'entities': [
            {'entity': 'third', 'order': 3, 'groupBy': 'status'},
            {'entity': 'first', 'order': 1, 'groupBy': 'status'},
            {'entity': 'second', 'order': 2, 'groupBy': 'status'},
          ],
        };

        final config = DashboardConfig.fromJson(json);

        expect(config.entities[0].entity, equals('first'));
        expect(config.entities[1].entity, equals('second'));
        expect(config.entities[2].entity, equals('third'));
      });

      test('provides defaults for missing fields', () {
        final json = {
          'entities': [
            {'entity': 'test_entity'},
          ],
        };

        final config = DashboardConfig.fromJson(json);

        expect(config.version, equals('1.0.0'));
        expect(config.entities[0].minRole, equals('customer'));
        expect(config.entities[0].groupBy, equals('status'));
        expect(config.entities[0].order, equals(0));
      });
    });

    group('getEntitiesForRole', () {
      late DashboardConfig config;

      setUp(() {
        config = DashboardConfig.fromJson({
          'entities': [
            {
              'entity': 'customer_entity',
              'minRole': 'customer',
              'order': 1,
              'groupBy': 'status',
            },
            {
              'entity': 'tech_entity',
              'minRole': 'technician',
              'order': 2,
              'groupBy': 'status',
            },
            {
              'entity': 'dispatcher_entity',
              'minRole': 'dispatcher',
              'order': 3,
              'groupBy': 'status',
            },
            {
              'entity': 'manager_entity',
              'minRole': 'manager',
              'order': 4,
              'groupBy': 'status',
            },
            {
              'entity': 'admin_entity',
              'minRole': 'admin',
              'order': 5,
              'groupBy': 'status',
            },
          ],
        });
      });

      test('customer sees only customer entities', () {
        final entities = config.getEntitiesForRole('customer');
        expect(entities.length, equals(1));
        expect(entities[0].entity, equals('customer_entity'));
      });

      test('technician sees customer and technician entities', () {
        final entities = config.getEntitiesForRole('technician');
        expect(entities.length, equals(2));
        expect(
          entities.map((e) => e.entity).toList(),
          containsAll(['customer_entity', 'tech_entity']),
        );
      });

      test('dispatcher sees customer, technician, dispatcher entities', () {
        final entities = config.getEntitiesForRole('dispatcher');
        expect(entities.length, equals(3));
      });

      test('manager sees customer through manager entities', () {
        final entities = config.getEntitiesForRole('manager');
        expect(entities.length, equals(4));
      });

      test('admin sees all entities', () {
        final entities = config.getEntitiesForRole('admin');
        expect(entities.length, equals(5));
      });

      test('unknown role sees nothing', () {
        final entities = config.getEntitiesForRole('unknown');
        expect(entities.length, equals(0));
      });
    });

    group('allEntityNames', () {
      test('collects all entity names', () {
        final config = DashboardConfig.fromJson({
          'entities': [
            {'entity': 'work_order', 'groupBy': 'status'},
            {'entity': 'invoice', 'groupBy': 'status'},
            {'entity': 'contract', 'groupBy': 'status'},
          ],
        });

        expect(
          config.allEntityNames,
          containsAll(['work_order', 'invoice', 'contract']),
        );
      });

      test('returns empty list when no entities', () {
        final config = DashboardConfig.fromJson({'entities': []});
        expect(config.allEntityNames, isEmpty);
      });
    });

    group('constructor', () {
      test('const constructor works correctly', () {
        const config = DashboardConfig(
          version: '2.0.0',
          entities: [
            DashboardEntityConfig(
              entity: 'test',
              minRole: 'admin',
              groupBy: 'status',
            ),
          ],
        );

        expect(config.version, equals('2.0.0'));
        expect(config.entities.length, equals(1));
      });

      test('handles null entities in json', () {
        final config = DashboardConfig.fromJson({});
        expect(config.entities, isEmpty);
      });
    });
  });

  group('DashboardEntityConfig', () {
    test('parses entity config correctly', () {
      final json = {
        'entity': 'work_order',
        'minRole': 'customer',
        'groupBy': 'status',
        'order': 1,
      };

      final entity = DashboardEntityConfig.fromJson(json);

      expect(entity.entity, equals('work_order'));
      expect(entity.minRole, equals('customer'));
      expect(entity.groupBy, equals('status'));
      expect(entity.order, equals(1));
      expect(entity.chartType, equals(DashboardChartType.bar));
    });

    test('parses explicit chartType pie', () {
      final entity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'customer',
        'groupBy': 'status',
        'chartType': 'pie',
      });

      expect(entity.chartType, equals(DashboardChartType.pie));
    });

    test('const constructor sets defaults correctly', () {
      const entity = DashboardEntityConfig(
        entity: 'invoice',
        minRole: 'manager',
        groupBy: 'status',
      );

      expect(entity.entity, equals('invoice'));
      expect(entity.chartType, equals(DashboardChartType.bar));
      expect(entity.order, equals(0));
    });

    test('minUserRole returns correct UserRole', () {
      final entity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'manager',
        'groupBy': 'status',
      });

      expect(entity.minUserRole, isNotNull);
      expect(entity.minUserRole!.name, equals('manager'));
    });

    test('minUserRole returns null for unknown role', () {
      final entity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'unknown_role',
        'groupBy': 'status',
      });

      expect(entity.minUserRole, isNull);
    });

    test('rolePriority returns correct priority', () {
      final customerEntity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'customer',
        'groupBy': 'status',
      });
      final adminEntity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'admin',
        'groupBy': 'status',
      });

      expect(customerEntity.rolePriority, equals(1));
      expect(adminEntity.rolePriority, equals(5));
    });

    test('rolePriority returns 0 for unknown role', () {
      final entity = DashboardEntityConfig.fromJson({
        'entity': 'test',
        'minRole': 'unknown_role',
        'groupBy': 'status',
      });

      expect(entity.rolePriority, equals(0));
    });
  });

  group('DashboardChartType', () {
    test('fromString parses known types', () {
      expect(
        DashboardChartType.fromString('bar'),
        equals(DashboardChartType.bar),
      );
      expect(
        DashboardChartType.fromString('pie'),
        equals(DashboardChartType.pie),
      );
      // Legacy 'distribution' maps to pie
      expect(
        DashboardChartType.fromString('distribution'),
        equals(DashboardChartType.pie),
      );
    });

    test('fromString defaults to bar for unknown', () {
      expect(
        DashboardChartType.fromString('unknown'),
        equals(DashboardChartType.bar),
      );
      expect(
        DashboardChartType.fromString(null),
        equals(DashboardChartType.bar),
      );
    });
  });

  group('DashboardConfigService', () {
    setUp(() {
      DashboardConfigService.reset();
    });

    test('isInitialized is false before initialize', () {
      expect(DashboardConfigService.isInitialized, isFalse);
    });

    test('loadFromJson initializes service', () {
      DashboardConfigService.loadFromJson({'version': '1.0.0', 'entities': []});

      expect(DashboardConfigService.isInitialized, isTrue);
      expect(DashboardConfigService.config.version, equals('1.0.0'));
    });

    test('config throws when not initialized', () {
      expect(() => DashboardConfigService.config, throwsStateError);
    });

    test('reset clears initialization', () {
      DashboardConfigService.loadFromJson({'entities': []});
      expect(DashboardConfigService.isInitialized, isTrue);

      DashboardConfigService.reset();
      expect(DashboardConfigService.isInitialized, isFalse);
    });
  });
}
