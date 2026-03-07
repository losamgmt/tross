/// Relationship Model
///
/// Defines entity relationships for metadata-driven data fetching,
/// ?include= API support, and Related tab composition.
library;

/// Relationship cardinality types.
///
/// Matches backend RelationshipType in entity-metadata.types.js.
enum RelationshipType {
  /// This entity has FK to the related entity (N:1)
  /// Example: work_order belongsTo customer (work_order.customer_id → customers.id)
  belongsTo,

  /// Related entity has FK to this entity (1:N)
  /// Example: customer hasMany work_orders (work_orders.customer_id → customers.id)
  hasMany,

  /// Related entity has FK to this entity, unique (1:1)
  /// Example: user hasOne preferences (preferences.user_id → users.id)
  hasOne,

  /// Related through a junction table (M:N)
  /// Example: customer manyToMany units (through customer_units)
  manyToMany;

  /// Parse from JSON string
  static RelationshipType? fromString(String? value) {
    if (value == null) return null;
    return switch (value) {
      'belongsTo' => RelationshipType.belongsTo,
      'hasMany' => RelationshipType.hasMany,
      'hasOne' => RelationshipType.hasOne,
      'manyToMany' => RelationshipType.manyToMany,
      _ => null,
    };
  }
}

/// Row click behavior for tables.
///
/// Determines what happens when a row is tapped in a data table.
/// Configurable per relationship or context.
enum RowClickBehavior {
  /// Navigate to the entity detail screen
  navigate,

  /// Show entity detail in a modal dialog
  modal,

  /// No click handling
  none;

  /// Parse from JSON string with default fallback
  static RowClickBehavior fromString(
    String? value, {
    RowClickBehavior? defaultValue,
  }) {
    if (value == null) return defaultValue ?? RowClickBehavior.navigate;
    return switch (value) {
      'navigate' => RowClickBehavior.navigate,
      'modal' => RowClickBehavior.modal,
      'none' => RowClickBehavior.none,
      _ => defaultValue ?? RowClickBehavior.navigate,
    };
  }
}

/// Relationship definition for JOINs and data loading.
///
/// Matches backend RelationshipDefinition in entity-metadata.types.js.
class Relationship {
  /// Relationship name (key in relationships map)
  final String name;

  /// Relationship cardinality type
  final RelationshipType type;

  /// Target table name (the entity we're relating TO)
  final String table;

  /// FK column name in related table (or sourceKey for manyToMany)
  final String foreignKey;

  /// For manyToMany: junction table name (e.g., 'customer_units')
  final String? through;

  /// For manyToMany: FK in junction pointing to target entity
  final String? targetKey;

  /// Fields to include in JOIN (null = all)
  final List<String>? fields;

  /// Human-readable description
  final String? description;

  /// Row click behavior override
  final RowClickBehavior? rowClickBehavior;

  const Relationship({
    required this.name,
    required this.type,
    required this.table,
    required this.foreignKey,
    this.through,
    this.targetKey,
    this.fields,
    this.description,
    this.rowClickBehavior,
  });

  factory Relationship.fromJson(String name, Map<String, dynamic> json) {
    final typeStr = json['type'] as String?;
    final type = RelationshipType.fromString(typeStr);
    if (type == null) {
      throw ArgumentError(
        'Invalid relationship type "$typeStr" for relationship "$name". '
        'Must be one of: belongsTo, hasMany, hasOne, manyToMany',
      );
    }

    return Relationship(
      name: name,
      type: type,
      table: json['table'] as String? ?? '',
      foreignKey: json['foreignKey'] as String? ?? '',
      through: json['through'] as String?,
      targetKey: json['targetKey'] as String?,
      fields: (json['fields'] as List<dynamic>?)?.cast<String>(),
      description: json['description'] as String?,
      rowClickBehavior: json['rowClickBehavior'] != null
          ? RowClickBehavior.fromString(json['rowClickBehavior'] as String)
          : null,
    );
  }

  /// Whether this is a many-to-many relationship
  bool get isManyToMany => type == RelationshipType.manyToMany;

  /// Whether this is a has-many relationship (1:N)
  bool get isHasMany => type == RelationshipType.hasMany;

  /// Whether this relationship should show in Related tabs (hasMany or manyToMany)
  bool get showInRelatedTab =>
      type == RelationshipType.hasMany || type == RelationshipType.manyToMany;

  /// Get the entity name from the table name (assumes plural → singular)
  /// Example: 'work_orders' → 'work_order'
  String get targetEntity {
    // Remove trailing 's' or 'ies' → 'y'
    if (table.endsWith('ies')) {
      return '${table.substring(0, table.length - 3)}y';
    }
    if (table.endsWith('s')) {
      return table.substring(0, table.length - 1);
    }
    return table;
  }
}

/// Junction entity configuration.
///
/// Defines which two entities a junction table connects.
class JunctionFor {
  /// First entity in the M:M relationship (typically the "owner" side)
  final String entity1;

  /// Second entity in the M:M relationship
  final String entity2;

  /// FK column name for entity1 (optional, defaults to entity1_id)
  final String? foreignKey1;

  /// FK column name for entity2 (optional, defaults to entity2_id)
  final String? foreignKey2;

  const JunctionFor({
    required this.entity1,
    required this.entity2,
    this.foreignKey1,
    this.foreignKey2,
  });

  factory JunctionFor.fromJson(Map<String, dynamic> json) {
    return JunctionFor(
      entity1: json['entity1'] as String? ?? '',
      entity2: json['entity2'] as String? ?? '',
      foreignKey1: json['foreignKey1'] as String?,
      foreignKey2: json['foreignKey2'] as String?,
    );
  }

  /// Get both connected entities as a list
  List<String> get entities => [entity1, entity2];

  /// Check if this junction connects to a specific entity
  bool connectsTo(String entityName) =>
      entity1 == entityName || entity2 == entityName;

  /// Get the "other" entity when viewing from one side
  String? otherEntity(String fromEntity) {
    if (entity1 == fromEntity) return entity2;
    if (entity2 == fromEntity) return entity1;
    return null;
  }
}
