/// SavedView - Model for user's saved table view configurations
///
/// Represents a saved view configuration for a data table.
library;

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
