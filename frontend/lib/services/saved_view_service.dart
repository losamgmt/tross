/// Saved View Service - Manages user's saved table views
///
/// SOLE RESPONSIBILITY: CRUD for saved views with convenience methods
///
/// Uses GenericEntityService under the hood - this is just a thin wrapper
/// that adds saved-view-specific logic (getForEntity, setDefault, etc.)
///
/// USAGE:
/// ```dart
/// // Via Provider
/// final savedViewService = context.read<SavedViewService>();
///
/// // Get all views for work_orders
/// final views = await savedViewService.getForEntity('work_order');
///
/// // Save current view
/// await savedViewService.create(
///   entityName: 'work_order',
///   viewName: 'My Pending Orders',
///   settings: SavedViewSettings(
///     hiddenColumns: ['created_at'],
///     density: 'compact',
///     filters: {'status': 'pending'},
///   ),
/// );
///
/// // Load a view
/// final view = await savedViewService.getById(viewId);
/// ```
library;

import '../models/saved_view.dart';
import 'generic_entity_service.dart';
import 'error_service.dart';

/// Service for managing saved table views
class SavedViewService {
  final GenericEntityService _entityService;

  SavedViewService(this._entityService);

  static const String _entityName = 'saved_view';

  /// Get all saved views for a specific entity
  ///
  /// Returns views sorted by name, with default view first
  Future<List<SavedView>> getForEntity(String entityName) async {
    try {
      final result = await _entityService.getAll(
        _entityName,
        filters: {'entity_name': entityName},
        sortBy: 'view_name',
        sortOrder: 'ASC',
        limit: 100, // Reasonable max for saved views
      );

      final views = result.data
          .map((json) => SavedView.fromJson(json))
          .toList();

      // Sort with default first
      views.sort((a, b) {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.viewName.compareTo(b.viewName);
      });

      return views;
    } catch (e) {
      ErrorService.logError(
        '[SavedViewService] Failed to get views for $entityName',
        error: e,
      );
      rethrow;
    }
  }

  /// Get the default view for an entity, if one exists
  Future<SavedView?> getDefault(String entityName) async {
    try {
      final result = await _entityService.getAll(
        _entityName,
        filters: {'entity_name': entityName, 'is_default': true},
        limit: 1,
      );

      if (result.data.isEmpty) return null;
      return SavedView.fromJson(result.data.first);
    } catch (e) {
      ErrorService.logError(
        '[SavedViewService] Failed to get default view for $entityName',
        error: e,
      );
      return null; // Graceful fallback
    }
  }

  /// Save a new view
  Future<SavedView> create({
    required String entityName,
    required String viewName,
    required SavedViewSettings settings,
    bool isDefault = false,
  }) async {
    try {
      final created = await _entityService.create(_entityName, {
        'entity_name': entityName,
        'view_name': viewName,
        'settings': settings.toJson(),
        'is_default': isDefault,
      });

      ErrorService.logInfo(
        '[SavedViewService] Created view "$viewName" for $entityName',
      );

      return SavedView.fromJson(created);
    } catch (e) {
      ErrorService.logError(
        '[SavedViewService] Failed to create view',
        error: e,
        context: {'entityName': entityName, 'viewName': viewName},
      );
      rethrow;
    }
  }

  /// Update an existing view
  Future<SavedView> update(
    int viewId, {
    String? viewName,
    SavedViewSettings? settings,
    bool? isDefault,
  }) async {
    try {
      final updates = <String, dynamic>{};
      if (viewName != null) updates['view_name'] = viewName;
      if (settings != null) updates['settings'] = settings.toJson();
      if (isDefault != null) updates['is_default'] = isDefault;

      final updated = await _entityService.update(_entityName, viewId, updates);

      ErrorService.logInfo('[SavedViewService] Updated view #$viewId');

      return SavedView.fromJson(updated);
    } catch (e) {
      ErrorService.logError(
        '[SavedViewService] Failed to update view #$viewId',
        error: e,
      );
      rethrow;
    }
  }

  /// Delete a saved view
  Future<void> delete(int viewId) async {
    try {
      await _entityService.delete(_entityName, viewId);
      ErrorService.logInfo('[SavedViewService] Deleted view #$viewId');
    } catch (e) {
      ErrorService.logError(
        '[SavedViewService] Failed to delete view #$viewId',
        error: e,
      );
      rethrow;
    }
  }

  /// Set a view as the default (clears other defaults for that entity)
  ///
  /// Note: Backend should handle clearing other defaults via trigger/logic
  Future<SavedView> setAsDefault(int viewId) async {
    return update(viewId, isDefault: true);
  }
}
