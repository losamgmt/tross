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
  enumType, // 'enum' is reserved in Dart
  text,
  uuid,
  foreignKey, // FK relationship to another entity
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
  final List<String>? enumValues; // For enum fields
  final String? pattern; // Regex pattern
  final String? description;

  // Foreign key relationship fields
  final String? relatedEntity; // e.g., 'role', 'customer'
  final String? displayField; // Single field fallback e.g., 'name', 'email'
  final List<String>?
  displayFields; // Multiple fields e.g., ['company_name', 'email']
  final String?
  displayTemplate; // Format string e.g., '{company_name} - {email}'

  /// Check if this is a foreign key field
  bool get isForeignKey =>
      type == FieldType.foreignKey || relatedEntity != null;

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
    this.pattern,
    this.description,
    this.relatedEntity,
    this.displayField,
    this.displayFields,
    this.displayTemplate,
  });

  factory FieldDefinition.fromJson(String name, Map<String, dynamic> json) {
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
      enumValues: (json['values'] as List<dynamic>?)?.cast<String>(),
      pattern: json['pattern'] as String?,
      description: json['description'] as String?,
      relatedEntity: json['relatedEntity'] as String?,
      displayField: json['displayField'] as String?,
      displayFields: (json['displayFields'] as List<dynamic>?)?.cast<String>(),
      displayTemplate: json['displayTemplate'] as String?,
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
