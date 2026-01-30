/// Metadata-Driven Field Config Factory
///
/// SOLE RESPONSIBILITY: Generate FieldConfig lists from EntityMetadata
///
/// This eliminates the need for per-entity field config classes like:
/// - UserFieldConfigs
/// - RoleFieldConfigs
/// - CustomerFieldConfigs
/// etc.
///
/// Instead, ALL field configs are generated dynamically from metadata.
///
/// USAGE:
/// ```dart
/// // Get field configs for customer entity
/// final fields = MetadataFieldConfigFactory.forEntity('customer');
///
/// // Get specific fields only
/// final fields = MetadataFieldConfigFactory.forEntity(
///   'customer',
///   includeFields: ['email', 'phone', 'company_name'],
/// );
///
/// // Get for create form (excludes readonly fields)
/// final fields = MetadataFieldConfigFactory.forCreate('customer');
///
/// // Get for edit form (marks immutable fields as readonly)
/// final fields = MetadataFieldConfigFactory.forEdit('customer');
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/atoms/inputs/text_input.dart' show TextFieldType;
import '../widgets/molecules/forms/field_config.dart';
import 'entity_metadata.dart' as meta;
import 'generic_entity_service.dart';

/// Factory for generating FieldConfigs from EntityMetadata
///
/// Works with `Map<String, dynamic>` as the model type.
/// All values are extracted/set using map key access.
class MetadataFieldConfigFactory {
  // Private constructor - static class only
  MetadataFieldConfigFactory._();

  /// Safely convert any value to String (defensive against type mismatches)
  static String _safeToString(dynamic value) {
    if (value == null) return '';
    if (value is String) return value;
    return value.toString();
  }

  /// Safely convert any value to String? (preserves null)
  static String? _safeToNullableString(dynamic value) {
    if (value == null) return null;
    if (value is String) return value.isEmpty ? null : value;
    return value.toString();
  }

  /// Type alias for our generic FieldConfig with `Map<String, dynamic>`
  /// `FieldConfig<Map<String, dynamic>, dynamic>`

  /// Generate all visible field configs for an entity
  ///
  /// [context] - BuildContext for accessing Provider (optional if no FK fields)
  /// [entityName] - Name of the entity (e.g., 'customer')
  /// [includeFields] - If provided, only include these fields
  /// [excludeFields] - Fields to exclude (e.g., system fields)
  /// [forEdit] - If true, marks immutable fields as readOnly
  ///
  /// Note: GenericEntityService is only required for entities with foreignKey
  /// fields that need async loading. For entities without FK fields (like
  /// preferences), context can be null.
  static List<FieldConfig<Map<String, dynamic>, dynamic>> forEntity(
    BuildContext? context,
    String entityName, {
    List<String>? includeFields,
    List<String>? excludeFields,
    bool forEdit = false,
  }) {
    final metadata = meta.EntityMetadataRegistry.get(entityName);
    final configs = <FieldConfig<Map<String, dynamic>, dynamic>>[];

    // Lazy-load entity service only when needed for FK fields
    GenericEntityService? entityService;

    // Default exclusions - system fields not shown in forms
    final defaultExclusions = {'id', 'created_at', 'updated_at'};

    for (final entry in metadata.fields.entries) {
      final fieldName = entry.key;
      final fieldDef = entry.value;

      // Skip excluded fields
      if (defaultExclusions.contains(fieldName)) continue;
      if (excludeFields?.contains(fieldName) == true) continue;

      // Skip if includeFields specified and field not in list
      if (includeFields != null && !includeFields.contains(fieldName)) continue;

      // Skip readonly fields for create/edit forms
      if (fieldDef.readonly) continue;

      // Lazy-load entity service for FK fields
      if (fieldDef.type == meta.FieldType.foreignKey && entityService == null) {
        if (context == null) {
          // Skip FK field if no context - can't load async options
          continue;
        }
        entityService = context.read<GenericEntityService>();
      }

      // Generate the config
      final config = _createFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        metadata: metadata,
        entityService: entityService,
        readOnly: forEdit && metadata.isImmutable(fieldName),
      );

      if (config != null) {
        configs.add(config);
      }
    }

    return configs;
  }

  /// Generate field configs for create form
  ///
  /// Excludes readonly and system fields.
  static List<FieldConfig<Map<String, dynamic>, dynamic>> forCreate(
    BuildContext context,
    String entityName, {
    List<String>? includeFields,
    List<String>? excludeFields,
  }) {
    return forEntity(
      context,
      entityName,
      includeFields: includeFields,
      excludeFields: excludeFields,
      forEdit: false,
    );
  }

  /// Generate field configs for edit form
  ///
  /// Marks immutable fields as readOnly.
  static List<FieldConfig<Map<String, dynamic>, dynamic>> forEdit(
    BuildContext context,
    String entityName, {
    List<String>? includeFields,
    List<String>? excludeFields,
  }) {
    return forEntity(
      context,
      entityName,
      includeFields: includeFields,
      excludeFields: excludeFields,
      forEdit: true,
    );
  }

  /// Generate field configs for display (read-only view)
  ///
  /// Includes ALL fields (even readonly ones like timestamps)
  /// All configs marked as readOnly since this is for display only.
  ///
  /// [context] - BuildContext for accessing Provider (optional if no FK fields)
  /// [entityName] - Name of the entity (e.g., 'customer')
  /// [includeFields] - If provided, only include these fields
  /// [excludeFields] - Fields to exclude
  /// [includeSystemFields] - If true, includes id, created_at, updated_at
  static List<FieldConfig<Map<String, dynamic>, dynamic>> forDisplay(
    BuildContext? context,
    String entityName, {
    List<String>? includeFields,
    List<String>? excludeFields,
    bool includeSystemFields = false,
  }) {
    final metadata = meta.EntityMetadataRegistry.get(entityName);
    final configs = <FieldConfig<Map<String, dynamic>, dynamic>>[];

    // Lazy-load entity service only when needed for FK fields
    GenericEntityService? entityService;

    // Default exclusions - system fields unless explicitly included
    final defaultExclusions = includeSystemFields
        ? <String>{}
        : {'id', 'created_at', 'updated_at'};

    for (final entry in metadata.fields.entries) {
      final fieldName = entry.key;
      final fieldDef = entry.value;

      // Skip excluded fields
      if (defaultExclusions.contains(fieldName)) continue;
      if (excludeFields?.contains(fieldName) == true) continue;

      // Skip if includeFields specified and field not in list
      if (includeFields != null && !includeFields.contains(fieldName)) continue;

      // Lazy-load entity service for FK fields
      if (fieldDef.type == meta.FieldType.foreignKey && entityService == null) {
        if (context == null) {
          // Skip FK field if no context - can't load async options
          continue;
        }
        entityService = context.read<GenericEntityService>();
      }

      // Generate the config - always readonly for display
      final config = _createFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        metadata: metadata,
        entityService: entityService,
        readOnly: true, // Always readonly for display
      );

      if (config != null) {
        configs.add(config);
      }
    }

    return configs;
  }

  /// Generate a single field config from metadata
  static FieldConfig<Map<String, dynamic>, dynamic>? _createFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required meta.EntityMetadata metadata,
    GenericEntityService? entityService,
    bool readOnly = false,
  }) {
    // Generate label from field name
    final label = _fieldNameToLabel(fieldName);

    // Build validator
    final validator = _buildValidator(fieldDef, metadata);

    // Build the config based on field type
    return switch (fieldDef.type) {
      meta.FieldType.string || meta.FieldType.text => _createTextFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.email => _createEmailFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.phone => _createPhoneFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.integer ||
      meta.FieldType.decimal ||
      meta.FieldType.currency => _createNumberFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.boolean => _createBooleanFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        readOnly: readOnly,
      ),
      meta.FieldType.timestamp || meta.FieldType.date => _createDateFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.enumType => _createSelectFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
      ),
      meta.FieldType.foreignKey => _createForeignKeyFieldConfig(
        fieldName: fieldName,
        fieldDef: fieldDef,
        label: label,
        validator: validator,
        readOnly: readOnly,
        entityService: entityService,
      ),
      meta.FieldType.jsonb =>
        null, // Skip JSONB for now - needs special handling
      meta.FieldType.uuid => null, // Skip UUID - usually system-generated
    };
  }

  /// Convert field_name to "Field Name"
  static String _fieldNameToLabel(String fieldName) {
    return fieldName
        .split('_')
        .map(
          (word) => word.isEmpty
              ? ''
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }

  /// Build validator function from field definition
  static String? Function(dynamic)? _buildValidator(
    meta.FieldDefinition fieldDef,
    meta.EntityMetadata metadata,
  ) {
    final validators = <String? Function(dynamic)>[];

    // Required check
    if (fieldDef.required || metadata.isRequired(fieldDef.name)) {
      validators.add((value) {
        if (value == null || (value is String && value.trim().isEmpty)) {
          return '${_fieldNameToLabel(fieldDef.name)} is required';
        }
        return null;
      });
    }

    // Max length check
    if (fieldDef.maxLength != null) {
      validators.add((value) {
        if (value is String && value.length > fieldDef.maxLength!) {
          return 'Maximum ${fieldDef.maxLength} characters';
        }
        return null;
      });
    }

    // Min length check
    if (fieldDef.minLength != null) {
      validators.add((value) {
        if (value is String &&
            value.isNotEmpty &&
            value.length < fieldDef.minLength!) {
          return 'Minimum ${fieldDef.minLength} characters';
        }
        return null;
      });
    }

    // Email format check
    if (fieldDef.type == meta.FieldType.email) {
      validators.add((value) {
        if (value is String && value.isNotEmpty) {
          final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
          if (!emailRegex.hasMatch(value)) {
            return 'Invalid email format';
          }
        }
        return null;
      });
    }

    // Number range checks
    if (fieldDef.min != null) {
      validators.add((value) {
        final num? numValue = value is num
            ? value
            : value is String
            ? num.tryParse(value)
            : null;
        if (numValue != null && numValue < fieldDef.min!) {
          return 'Minimum value is ${fieldDef.min}';
        }
        return null;
      });
    }

    if (fieldDef.max != null) {
      validators.add((value) {
        final num? numValue = value is num
            ? value
            : value is String
            ? num.tryParse(value)
            : null;
        if (numValue != null && numValue > fieldDef.max!) {
          return 'Maximum value is ${fieldDef.max}';
        }
        return null;
      });
    }

    // Enum values check
    if (fieldDef.enumValues != null && fieldDef.enumValues!.isNotEmpty) {
      validators.add((value) {
        if (value != null &&
            value is String &&
            value.isNotEmpty &&
            !fieldDef.enumValues!.contains(value)) {
          return 'Invalid selection';
        }
        return null;
      });
    }

    // Combine validators
    if (validators.isEmpty) return null;

    return (value) {
      for (final validator in validators) {
        final error = validator(value);
        if (error != null) return error;
      }
      return null;
    };
  }

  /// Create text field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createTextFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: fieldDef.type == meta.FieldType.text
          ? FieldType.textArea
          : FieldType.text,
      label: label,
      getValue: (map) => _safeToString(map[fieldName]),
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      placeholder: 'Enter ${label.toLowerCase()}',
      required: fieldDef.required,
      readOnly: readOnly,
      maxLength: fieldDef.maxLength,
      minLines: fieldDef.type == meta.FieldType.text ? 3 : null,
      maxLines: fieldDef.type == meta.FieldType.text ? 5 : null,
    );
  }

  /// Create email field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createEmailFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.text,
      label: label,
      getValue: (map) => _safeToString(map[fieldName]),
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      placeholder: 'email@example.com',
      required: fieldDef.required,
      readOnly: readOnly,
      textFieldType: TextFieldType.email,
      icon: Icons.email,
      maxLength: fieldDef.maxLength,
    );
  }

  /// Create phone field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createPhoneFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.text,
      label: label,
      getValue: (map) => _safeToString(map[fieldName]),
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      placeholder: '(555) 123-4567',
      required: fieldDef.required,
      readOnly: readOnly,
      textFieldType: TextFieldType.phone,
      icon: Icons.phone,
      maxLength: fieldDef.maxLength,
    );
  }

  /// Create number field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createNumberFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.number,
      label: label,
      getValue: (map) {
        // PostgreSQL returns decimal as string - convert to num
        final value = map[fieldName];
        if (value == null) return null;
        if (value is num) return value;
        if (value is String) return num.tryParse(value);
        return null;
      },
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      placeholder: 'Enter $label',
      required: fieldDef.required,
      readOnly: readOnly,
      isInteger: fieldDef.type == meta.FieldType.integer,
      minValue: fieldDef.min,
      maxValue: fieldDef.max,
    );
  }

  /// Create boolean field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createBooleanFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.boolean,
      label: label,
      getValue: (map) =>
          map[fieldName] as bool? ?? (fieldDef.defaultValue as bool? ?? false),
      setValue: (map, value) => {...map, fieldName: value},
      required: false,
      readOnly: readOnly,
    );
  }

  /// Create date field config
  static FieldConfig<Map<String, dynamic>, dynamic> _createDateFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.date,
      label: label,
      getValue: (map) {
        final value = map[fieldName];
        if (value == null) return null;
        if (value is DateTime) return value;
        if (value is String) return DateTime.tryParse(value);
        return null;
      },
      setValue: (map, value) {
        String? isoString;
        if (value is DateTime) {
          isoString = value.toIso8601String();
        } else if (value is String) {
          isoString = value;
        }
        return {...map, fieldName: isoString};
      },
      validator: validator,
      required: fieldDef.required,
      readOnly: readOnly,
      icon: Icons.calendar_today,
    );
  }

  /// Create select field config for enum types
  static FieldConfig<Map<String, dynamic>, dynamic> _createSelectFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
  }) {
    final items = fieldDef.enumValues ?? <String>[];

    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.select,
      label: label,
      getValue: (map) {
        final value = _safeToNullableString(map[fieldName]);
        // Return null/empty for values not in items list (including null from DB)
        if (value == null || value.isEmpty) return null;
        // Ensure value is actually in items list to prevent dropdown assertion
        if (!items.contains(value)) return null;
        return value;
      },
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      required: fieldDef.required,
      readOnly: readOnly,
      selectItems: items,
      displayText: (item) => _fieldNameToLabel(item.toString()),
      allowEmpty: !fieldDef.required,
    );
  }

  /// Create async select field config for foreign key relationships
  ///
  /// Loads related entities and displays them by their display field (e.g., name, email)
  /// while storing the ID value.
  ///
  /// Display field priority:
  /// 1. fieldDef.displayField (per-field override in source entity)
  /// 2. relatedEntity.displayField (entity-level default from target entity)
  /// 3. 'name' (hardcoded fallback)
  ///
  /// Returns null if entityService is not provided (FK fields require async loading).
  static FieldConfig<Map<String, dynamic>, dynamic>?
  _createForeignKeyFieldConfig({
    required String fieldName,
    required meta.FieldDefinition fieldDef,
    required String label,
    required String? Function(dynamic)? validator,
    required bool readOnly,
    required GenericEntityService? entityService,
  }) {
    final relatedEntity = fieldDef.relatedEntity;

    // Determine display field with proper fallback chain
    String displayField;
    if (fieldDef.displayField != null) {
      // Priority 1: Per-field override
      displayField = fieldDef.displayField!;
    } else if (relatedEntity != null &&
        meta.EntityMetadataRegistry.has(relatedEntity)) {
      // Priority 2: Related entity's displayField
      displayField = meta.EntityMetadataRegistry.get(
        relatedEntity,
      ).displayField;
    } else {
      // Priority 3: Hardcoded fallback
      displayField = 'name';
    }

    if (relatedEntity == null) {
      // Fallback to number input if no relationship defined
      return FieldConfig<Map<String, dynamic>, dynamic>(
        fieldName: fieldName,
        fieldType: FieldType.number,
        label: label,
        getValue: (map) => map[fieldName] as int?,
        setValue: (map, value) => {...map, fieldName: value},
        validator: validator,
        required: fieldDef.required,
        readOnly: readOnly,
        isInteger: true,
        placeholder: 'Enter $label',
      );
    }

    // FK fields require entityService for async loading
    if (entityService == null) {
      return null;
    }

    // Create human-readable label (remove "_id" suffix)
    final displayLabel = label.replaceAll(' Id', '').replaceAll(' ID', '');

    return FieldConfig<Map<String, dynamic>, dynamic>(
      fieldName: fieldName,
      fieldType: FieldType.asyncSelect,
      label: displayLabel,
      getValue: (map) => map[fieldName] as int?,
      setValue: (map, value) => {...map, fieldName: value},
      validator: validator,
      required: fieldDef.required,
      readOnly: readOnly,
      placeholder: 'Select $displayLabel',
      asyncItemsLoader: () async {
        // Load related entities using GenericEntityService
        final result = await entityService.getAll(relatedEntity);
        return result.data;
      },
      valueField: 'id',
      asyncDisplayField: displayField,
      asyncDisplayFields: fieldDef.displayFields,
      asyncDisplayTemplate: fieldDef.displayTemplate,
      allowEmpty: !fieldDef.required,
    );
  }
}
