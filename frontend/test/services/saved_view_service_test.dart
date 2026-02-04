/// SavedViewService Unit Tests
///
/// Tests the SavedViewService which wraps GenericEntityService
/// with saved-view-specific logic (getForEntity, setDefault, etc.)
///
/// Philosophy: Test the wrapper behavior, not GenericEntityService internals
/// (GenericEntityService is tested separately in scenario tests)
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/models/saved_view.dart';
import 'package:tross/services/saved_view_service.dart';
import 'package:tross/services/generic_entity_service.dart';
import '../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;
  late GenericEntityService entityService;
  late SavedViewService savedViewService;

  /// Creates a complete SavedView mock data map
  Map<String, dynamic> createMockView({
    required int id,
    int userId = 100,
    required String entityName,
    required String viewName,
    Map<String, dynamic> settings = const {
      'hiddenColumns': <String>[],
      'density': 'standard',
    },
    bool isDefault = false,
    String createdAt = '2026-01-01T00:00:00Z',
    String updatedAt = '2026-01-01T00:00:00Z',
  }) {
    return {
      'id': id,
      'user_id': userId,
      'entity_name': entityName,
      'view_name': viewName,
      'settings': settings,
      'is_default': isDefault,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  setUp(() {
    mockApiClient = MockApiClient();
    entityService = GenericEntityService(mockApiClient);
    savedViewService = SavedViewService(entityService);
  });

  group('SavedViewService', () {
    group('getForEntity', () {
      test('fetches views filtered by entity name', () async {
        // Arrange - use mockEntityList for fetchEntities
        mockApiClient.mockEntityList('saved_view', [
          createMockView(
            id: 1,
            entityName: 'work_order',
            viewName: 'My View',
            isDefault: false,
          ),
          createMockView(
            id: 2,
            entityName: 'work_order',
            viewName: 'Default View',
            settings: {
              'hiddenColumns': ['created_at'],
              'density': 'compact',
            },
            isDefault: true,
          ),
        ]);

        // Act
        final views = await savedViewService.getForEntity('work_order');

        // Assert
        expect(views.length, 2);
        // Default view should be sorted first
        expect(views[0].isDefault, isTrue);
        expect(views[0].viewName, 'Default View');
        expect(views[1].isDefault, isFalse);
      });

      test('returns empty list when no views exist', () async {
        // Arrange - empty list
        mockApiClient.mockEntityList('saved_view', []);

        // Act
        final views = await savedViewService.getForEntity('customer');

        // Assert
        expect(views, isEmpty);
      });

      test('rethrows on API error', () async {
        // Arrange
        mockApiClient.setShouldFail(true, message: 'Network error');

        // Act & Assert
        expect(
          () => savedViewService.getForEntity('work_order'),
          throwsException,
        );
      });
    });

    group('getDefault', () {
      test('returns default view when exists', () async {
        // Arrange
        mockApiClient.mockEntityList('saved_view', [
          createMockView(
            id: 5,
            entityName: 'invoice',
            viewName: 'Default Invoice View',
            isDefault: true,
          ),
        ]);

        // Act
        final defaultView = await savedViewService.getDefault('invoice');

        // Assert
        expect(defaultView, isNotNull);
        expect(defaultView!.viewName, 'Default Invoice View');
        expect(defaultView.isDefault, isTrue);
      });

      test('returns null when no default view exists', () async {
        // Arrange - empty list
        mockApiClient.mockEntityList('saved_view', []);

        // Act
        final defaultView = await savedViewService.getDefault('customer');

        // Assert
        expect(defaultView, isNull);
      });

      test('returns null on error (graceful fallback)', () async {
        // Arrange
        mockApiClient.setShouldFail(true, message: 'Server error');

        // Act
        final defaultView = await savedViewService.getDefault('work_order');

        // Assert - graceful fallback to null, not exception
        expect(defaultView, isNull);
      });
    });

    group('create', () {
      test('creates a new saved view', () async {
        // Arrange - use mockCreate for createEntity
        mockApiClient.mockCreate(
          'saved_view',
          createMockView(
            id: 10,
            entityName: 'work_order',
            viewName: 'New View',
            settings: {
              'hiddenColumns': ['notes'],
              'density': 'comfortable',
            },
            isDefault: false,
          ),
        );

        // Act
        final created = await savedViewService.create(
          entityName: 'work_order',
          viewName: 'New View',
          settings: SavedViewSettings(
            hiddenColumns: ['notes'],
            density: 'comfortable',
          ),
        );

        // Assert
        expect(created.id, 10);
        expect(created.viewName, 'New View');
        expect(created.settings.hiddenColumns, contains('notes'));
      });

      test('creates view with isDefault flag', () async {
        // Arrange
        mockApiClient.mockCreate(
          'saved_view',
          createMockView(
            id: 11,
            entityName: 'customer',
            viewName: 'Primary View',
            isDefault: true,
          ),
        );

        // Act
        final created = await savedViewService.create(
          entityName: 'customer',
          viewName: 'Primary View',
          settings: SavedViewSettings(hiddenColumns: [], density: 'standard'),
          isDefault: true,
        );

        // Assert
        expect(created.isDefault, isTrue);
      });

      test('rethrows on API error', () async {
        // Arrange
        mockApiClient.setShouldFail(true, message: 'Validation error');

        // Act & Assert
        expect(
          () => savedViewService.create(
            entityName: 'work_order',
            viewName: 'Test',
            settings: SavedViewSettings(hiddenColumns: [], density: 'standard'),
          ),
          throwsException,
        );
      });
    });

    group('update', () {
      test('updates view name', () async {
        // Arrange - use mockUpdate for updateEntity
        mockApiClient.mockUpdate(
          'saved_view',
          5,
          createMockView(
            id: 5,
            entityName: 'work_order',
            viewName: 'Updated Name',
            updatedAt: '2026-01-02T00:00:00Z',
          ),
        );

        // Act
        final updated = await savedViewService.update(
          5,
          viewName: 'Updated Name',
        );

        // Assert
        expect(updated.viewName, 'Updated Name');
      });

      test('updates settings', () async {
        // Arrange
        mockApiClient.mockUpdate(
          'saved_view',
          6,
          createMockView(
            id: 6,
            entityName: 'invoice',
            viewName: 'My View',
            settings: {
              'hiddenColumns': ['total'],
              'density': 'compact',
            },
            updatedAt: '2026-01-02T00:00:00Z',
          ),
        );

        // Act
        final updated = await savedViewService.update(
          6,
          settings: SavedViewSettings(
            hiddenColumns: ['total'],
            density: 'compact',
          ),
        );

        // Assert
        expect(updated.settings.hiddenColumns, contains('total'));
        expect(updated.settings.density, 'compact');
      });

      test('rethrows on API error', () async {
        // Arrange
        mockApiClient.setShouldFail(true, message: 'Not found');

        // Act & Assert
        expect(
          () => savedViewService.update(999, viewName: 'Test'),
          throwsException,
        );
      });
    });

    group('delete', () {
      test('deletes a saved view', () async {
        // MockApiClient.deleteEntity succeeds by default
        // Act & Assert - should complete without error
        await expectLater(savedViewService.delete(7), completes);
      });

      test('rethrows on API error', () async {
        // Arrange
        mockApiClient.setShouldFail(true, message: 'Cannot delete');

        // Act & Assert
        expect(() => savedViewService.delete(999), throwsException);
      });
    });

    group('setAsDefault', () {
      test('sets view as default via update', () async {
        // Arrange
        mockApiClient.mockUpdate(
          'saved_view',
          8,
          createMockView(
            id: 8,
            entityName: 'contract',
            viewName: 'Main View',
            isDefault: true,
            updatedAt: '2026-01-02T00:00:00Z',
          ),
        );

        // Act
        final updated = await savedViewService.setAsDefault(8);

        // Assert
        expect(updated.isDefault, isTrue);
      });
    });
  });

  group('SavedViewSettings', () {
    test('fromJson parses settings correctly', () {
      final json = {
        'hiddenColumns': ['col1', 'col2'],
        'density': 'compact',
        'filters': {'status': 'active'},
      };

      final settings = SavedViewSettings.fromJson(json);

      expect(settings.hiddenColumns, ['col1', 'col2']);
      expect(settings.density, 'compact');
      expect(settings.filters, {'status': 'active'});
    });

    test('fromJson handles missing optional fields', () {
      final json = <String, dynamic>{};

      final settings = SavedViewSettings.fromJson(json);

      expect(settings.hiddenColumns, isEmpty);
      expect(settings.density, 'standard');
      expect(settings.filters, isEmpty);
    });

    test('toJson serializes correctly', () {
      final settings = SavedViewSettings(
        hiddenColumns: ['a', 'b'],
        density: 'comfortable',
        filters: {'key': 'value'},
      );

      final json = settings.toJson();

      expect(json['hiddenColumns'], ['a', 'b']);
      expect(json['density'], 'comfortable');
      expect(json['filters'], {'key': 'value'});
    });
  });

  group('SavedView Model', () {
    test('fromJson parses complete view', () {
      final json = {
        'id': 42,
        'user_id': 100,
        'entity_name': 'work_order',
        'view_name': 'Test View',
        'settings': {'hiddenColumns': [], 'density': 'standard'},
        'is_default': true,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-02T00:00:00Z',
      };

      final view = SavedView.fromJson(json);

      expect(view.id, 42);
      expect(view.userId, 100);
      expect(view.entityName, 'work_order');
      expect(view.viewName, 'Test View');
      expect(view.isDefault, isTrue);
      expect(view.settings, isNotNull);
    });
  });
}
