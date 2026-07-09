import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/entity_metadata.dart';
import 'package:tross/utils/field_dependency_resolver.dart';

void main() {
  // work_order-shaped metadata: mutual timeOffset rules + a backend-only lookup field.
  final metadata = EntityMetadata.fromJson('work_order', {
    'rlsResource': 'work_orders',
    'fields': {
      'scheduled_start': {
        'type': 'timestamp',
        'derived': {
          'from': 'scheduled_end',
          'via': 'timeOffset',
          'params': {'hours': -1},
        },
      },
      'scheduled_end': {
        'type': 'timestamp',
        'derived': {
          'from': 'scheduled_start',
          'via': 'timeOffset',
          'params': {'hours': 1},
        },
      },
      'property_id': {
        'type': 'foreignKey',
        'references': 'property',
        'derived': {'from': 'unit_id', 'via': 'lookup'},
      },
      'unit_id': {'type': 'foreignKey', 'references': 'unit'},
    },
  });

  group('FieldDependencyResolver.apply', () {
    test(
      'derives end from start (+1h) when start changed and end is blank',
      () {
        final result = FieldDependencyResolver.apply(
          metadata: metadata,
          value: {'scheduled_start': '2026-07-09T10:00:00.000Z'},
          previous: {},
        );
        expect(result['scheduled_end'], '2026-07-09T11:00:00.000Z');
        expect(result['scheduled_start'], '2026-07-09T10:00:00.000Z');
      },
    );

    test(
      'derives start from end (-1h) when end changed and start is blank',
      () {
        final result = FieldDependencyResolver.apply(
          metadata: metadata,
          value: {'scheduled_end': '2026-07-09T10:00:00.000Z'},
          previous: {},
        );
        expect(result['scheduled_start'], '2026-07-09T09:00:00.000Z');
      },
    );

    test('does not clobber an explicit target value', () {
      final result = FieldDependencyResolver.apply(
        metadata: metadata,
        value: {
          'scheduled_start': '2026-07-09T10:00:00.000Z',
          'scheduled_end': '2026-07-09T15:00:00.000Z',
        },
        previous: {},
      );
      expect(result['scheduled_end'], '2026-07-09T15:00:00.000Z');
    });

    test('does nothing when the source did not change', () {
      final result = FieldDependencyResolver.apply(
        metadata: metadata,
        value: {'scheduled_start': '2026-07-09T10:00:00.000Z'},
        previous: {'scheduled_start': '2026-07-09T10:00:00.000Z'},
      );
      expect(result['scheduled_end'], isNull);
    });

    test('ignores backend-only methods (lookup) on the client', () {
      final result = FieldDependencyResolver.apply(
        metadata: metadata,
        value: {'unit_id': 7},
        previous: {},
      );
      expect(result['property_id'], isNull);
    });

    test('returns the same map instance when nothing derives', () {
      final value = {'name': 'WO'};
      final result = FieldDependencyResolver.apply(
        metadata: metadata,
        value: value,
        previous: {},
      );
      expect(identical(result, value), isTrue);
    });

    test('returns value unchanged when metadata is null', () {
      final value = {'scheduled_start': '2026-07-09T10:00:00.000Z'};
      final result = FieldDependencyResolver.apply(
        metadata: null,
        value: value,
        previous: {},
      );
      expect(identical(result, value), isTrue);
    });
  });
}
