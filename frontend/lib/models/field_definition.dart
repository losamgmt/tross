/// Field Definition Models
///
/// Data models for entity field metadata
/// Used by EntityMetadata and form/table generation
library;

/// Field types matching backend field definitions
enum FieldType {
  string,
  integer,
  boolean,
  email,
  phone,
  timestamp,
  date,
  jsonb,
  decimal,
  currency, // Monetary amounts (stored as int cents)
  enumType, // 'enum' is reserved in Dart
  text,
  uuid,
  foreignKey, // FK relationship to another entity
}

/// Declarative field derivation.
///
/// Mirrors the backend `derived` construct: this field's value is derived from a sibling
/// [from] field via a named method [via] with optional [params]. The frontend applies the
/// methods it implements (e.g. `timeOffset`); backend-only methods (e.g. `lookup`) are
/// ignored client-side and resolved on save.
class FieldDerived {
  final String from;
  final String via;
  final Map<String, dynamic>? params;

  const FieldDerived({required this.from, required this.via, this.params});

  factory FieldDerived.fromJson(Map<String, dynamic> json) {
    return FieldDerived(
      from: json['from'] as String,
      via: json['via'] as String,
      params: json['params'] as Map<String, dynamic>?,
    );
  }
}

/// Field definition from metadata
class FieldDefinition {
  final String name;
  final FieldType type;
  final bool required;
  final bool readonly;
  final int? maxLength;
  final int? minLength;
  final num? min;
  final num? max;
  final dynamic defaultValue;
  final List<String>? enumValues; // For enum fields - just the value names
  final Map<String, String?>? enumValueColors; // value -> BadgeStyle name
  final String? pattern; // Regex pattern
  final String? description;

  // Foreign key relationship fields
  final String?
  references; // e.g., 'role', 'customer' - aligns with SQL REFERENCES
  final String? displayField; // Single field fallback e.g., 'name', 'email'
  final List<String>?
  displayFields; // Multiple fields e.g., ['company_name', 'email']
  final String?
  displayTemplate; // Format string e.g., '{company_name} - {email}'

  /// Declarative derivation of this field's value from a sibling field (see [FieldDerived]).
  final FieldDerived? derived;

  /// Check if this is a foreign key field
  bool get isForeignKey => type == FieldType.foreignKey || references != null;

  /// Get color name for an enum value (or null for default/neutral)
  String? getValueColor(String value) => enumValueColors?[value];

  const FieldDefinition({
    required this.name,
    required this.type,
    this.required = false,
    this.readonly = false,
    this.maxLength,
    this.minLength,
    this.min,
    this.max,
    this.defaultValue,
    this.enumValues,
    this.enumValueColors,
    this.pattern,
    this.description,
    this.references,
    this.displayField,
    this.displayFields,
    this.displayTemplate,
    this.derived,
  });

  factory FieldDefinition.fromJson(String name, Map<String, dynamic> json) {
    final valuesRaw = json['values'];
    List<String>? enumValues;
    Map<String, String?>? enumValueColors;

    if (valuesRaw is List) {
      // Legacy format: ["value1", "value2"]
      enumValues = valuesRaw.cast<String>();
    } else if (valuesRaw is Map) {
      // New format: {"value1": {"color": "success"}, "value2": null}
      enumValues = valuesRaw.keys.cast<String>().toList();
      enumValueColors = {};
      for (final entry in valuesRaw.entries) {
        final key = entry.key as String;
        final props = entry.value;
        if (props is Map && props['color'] != null) {
          enumValueColors[key] = props['color'] as String;
        } else {
          enumValueColors[key] = null; // Explicit null = use neutral
        }
      }
    }

    return FieldDefinition(
      name: name,
      type: _parseFieldType(json['type'] as String? ?? 'string'),
      required: json['required'] as bool? ?? false,
      readonly: json['readonly'] as bool? ?? false,
      maxLength: json['maxLength'] as int?,
      minLength: json['minLength'] as int?,
      min: json['min'] as num?,
      max: json['max'] as num?,
      defaultValue: json['default'],
      enumValues: enumValues,
      enumValueColors: enumValueColors,
      pattern: json['pattern'] as String?,
      description: json['description'] as String?,
      references: json['references'] as String?,
      displayField: json['displayField'] as String?,
      displayFields: (json['displayFields'] as List<dynamic>?)?.cast<String>(),
      displayTemplate: json['displayTemplate'] as String?,
      derived: json['derived'] is Map<String, dynamic>
          ? FieldDerived.fromJson(json['derived'] as Map<String, dynamic>)
          : null,
    );
  }

  static FieldType _parseFieldType(String type) {
    return switch (type.toLowerCase()) {
      'string' => FieldType.string,
      'integer' || 'int' => FieldType.integer,
      'boolean' || 'bool' => FieldType.boolean,
      'email' => FieldType.email,
      'phone' => FieldType.phone,
      'timestamp' || 'datetime' => FieldType.timestamp,
      'date' => FieldType.date,
      'jsonb' || 'json' => FieldType.jsonb,
      'decimal' || 'float' || 'double' || 'number' => FieldType.decimal,
      'currency' => FieldType.currency,
      'enum' => FieldType.enumType,
      'text' => FieldType.text,
      'uuid' => FieldType.uuid,
      'foreignkey' || 'fk' => FieldType.foreignKey,
      _ => FieldType.string,
    };
  }
}

/// Sort configuration
class SortConfig {
  final String field;
  final String order; // 'ASC' or 'DESC'

  const SortConfig({required this.field, this.order = 'DESC'});

  factory SortConfig.fromJson(Map<String, dynamic> json) {
    return SortConfig(
      field: json['field'] as String? ?? 'id',
      order: json['order'] as String? ?? 'DESC',
    );
  }
}
