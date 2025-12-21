/// Saved View Service - Manages user's saved table views
///
/// SOLE RESPONSIBILITY: CRUD for saved views with convenience methods
///
/// Uses GenericEntityService under the hood - this is just a thin wrapper
/// that adds saved-view-specific logic (getForEntity, setDefault, etc.)
///
/// USAGE:
/// ```dart
/// // Get all views for work_orders
/// final views = await SavedViewService.getForEntity('work_order');
///
/// // Save current view
/// await SavedViewService.save(
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
/// final view = await SavedViewService.getById(viewId);
/// ```
library;

import 'generic_entity_service.dart';
import 'error_service.dart';

/// Settings stored in a saved view
class SavedViewSettings {
  final List<String> hiddenColumns;
  final String density;
  final Map<String, dynamic> filters;
  final Map<String, dynamic>? sort;

  const SavedViewSettings({
    this.hiddenColumns = const [],
    this.density = 'standard',
    this.filters = const {},
    this.sort,
  });

  factory SavedViewSettings.fromJson(Map<String, dynamic> json) {
    return SavedViewSettings(
      hiddenColumns:
          (json['hiddenColumns'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      density: json['density'] as String? ?? 'standard',
      filters: (json['filters'] as Map<String, dynamic>?) ?? {},
      sort: json['sort'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'hiddenColumns': hiddenColumns,
    'density': density,
    'filters': filters,
    if (sort != null) 'sort': sort,
  };
}

/// A saved view record
class SavedView {
  final int id;
  final int userId;
  final String entityName;
  final String viewName;
  final SavedViewSettings settings;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SavedView({
    required this.id,
    required this.userId,
    required this.entityName,
    required this.viewName,
    required this.settings,
    required this.isDefault,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SavedView.fromJson(Map<String, dynamic> json) {
    return SavedView(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      entityName: json['entity_name'] as String,
      viewName: json['view_name'] as String,
      settings: SavedViewSettings.fromJson(
        (json['settings'] as Map<String, dynamic>?) ?? {},
      ),
      isDefault: json['is_default'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

/// Service for managing saved table views
class SavedViewService {
  // Private constructor - static only
  SavedViewService._();

  static const String _entityName = 'saved_view';

  /// Get all saved views for a specific entity
  ///
  /// Returns views sorted by name, with default view first
  static Future<List<SavedView>> getForEntity(String entityName) async {
    try {
      final result = await GenericEntityService.getAll(
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
  static Future<SavedView?> getDefault(String entityName) async {
    try {
      final result = await GenericEntityService.getAll(
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
  static Future<SavedView> create({
    required String entityName,
    required String viewName,
    required SavedViewSettings settings,
    bool isDefault = false,
  }) async {
    try {
      final created = await GenericEntityService.create(_entityName, {
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
  static Future<SavedView> update(
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

      final updated = await GenericEntityService.update(
        _entityName,
        viewId,
        updates,
      );

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
  static Future<void> delete(int viewId) async {
    try {
      await GenericEntityService.delete(_entityName, viewId);
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
  static Future<SavedView> setAsDefault(int viewId) async {
    return update(viewId, isDefault: true);
  }
}
