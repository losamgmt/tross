/// Metadata Types - Type-safe data classes for admin metadata display
///
/// SOLE RESPONSIBILITY: Define typed structures for permissions and validation
/// Used by MetadataProvider implementations to return strongly-typed data
///
/// These types are designed for DISPLAY in admin UI, not for permission checking.
/// For permission checking, use PermissionServiceDynamic.
library;

/// Permission matrix for one entity - role × operation grid
///
/// Used with DataMatrix molecule for visual permission display
class PermissionMatrix {
  /// Entity name (e.g., 'users', 'work_orders')
  final String entity;

  /// Available roles in order (e.g., ['admin', 'manager', 'technician'])
  final List<String> roles;

  /// CRUD operations (e.g., ['create', 'read', 'update', 'delete'])
  final List<String> operations;

  /// Permission grid: role → operation → allowed
  /// Example: permissions['admin']['create'] = true
  final Map<String, Map<String, bool>> permissions;

  /// Role-level security policies per role
  /// Example: rowLevelSecurity['customer'] = 'own_record_only'
  final Map<String, String> rowLevelSecurity;

  const PermissionMatrix({
    required this.entity,
    required this.roles,
    required this.operations,
    required this.permissions,
    this.rowLevelSecurity = const {},
  });

  /// Get permission for a specific role and operation
  bool hasPermission(String role, String operation) {
    return permissions[role]?[operation] ?? false;
  }

  /// Create from permissions.json resource structure
  factory PermissionMatrix.fromResourceConfig({
    required String entity,
    required List<String> roles,
    required Map<String, int> rolePriorities,
    required Map<String, dynamic> resourceJson,
  }) {
    final operations = <String>[];
    final permissions = <String, Map<String, bool>>{};
    final rowLevelSecurity = <String, String>{};

    // Extract operations and minimum priorities
    final permissionsJson = resourceJson['permissions'] as Map<String, dynamic>?;
    if (permissionsJson != null) {
      for (final op in permissionsJson.keys) {
        operations.add(op);
        final opConfig = permissionsJson[op] as Map<String, dynamic>;
        final minPriority = opConfig['minimumPriority'] as int? ?? 999;

        // Calculate which roles have this permission
        for (final role in roles) {
          permissions.putIfAbsent(role, () => {});
          final rolePriority = rolePriorities[role] ?? 0;
          permissions[role]![op] = rolePriority >= minPriority;
        }
      }
    }

    // Extract RLS policies
    final rlsJson = resourceJson['rowLevelSecurity'] as Map<String, dynamic>?;
    if (rlsJson != null) {
      for (final entry in rlsJson.entries) {
        rowLevelSecurity[entry.key] = entry.value as String;
      }
    }

    return PermissionMatrix(
      entity: entity,
      roles: roles,
      operations: operations,
      permissions: permissions,
      rowLevelSecurity: rowLevelSecurity,
    );
  }
}

/// Validation rules for one entity
///
/// Used with KeyValueList molecule for validation display
class EntityValidationRules {
  /// Entity name
  final String entity;

  /// Field validations keyed by field name
  final Map<String, FieldValidation> fields;

  const EntityValidationRules({
    required this.entity,
    required this.fields,
  });

  /// Get validation for a specific field
  FieldValidation? getField(String fieldName) => fields[fieldName];

  /// Get all required field names
  List<String> get requiredFields =>
      fields.entries.where((e) => e.value.required).map((e) => e.key).toList();
}

/// Validation rules for a single field
class FieldValidation {
  final String fieldName;
  final String type;
  final bool required;
  final int? minLength;
  final int? maxLength;
  final String? pattern;
  final String? patternMessage;
  final num? min;
  final num? max;
  final bool trim;
  final bool lowercase;
  final Map<String, String> errorMessages;

  const FieldValidation({
    required this.fieldName,
    required this.type,
    this.required = false,
    this.minLength,
    this.maxLength,
    this.pattern,
    this.patternMessage,
    this.min,
    this.max,
    this.trim = false,
    this.lowercase = false,
    this.errorMessages = const {},
  });

  /// Create from validation-rules.json field structure
  factory FieldValidation.fromJson(String name, Map<String, dynamic> json) {
    final errorMsgs = <String, String>{};
    final errorsJson = json['errorMessages'] as Map<String, dynamic>?;
    if (errorsJson != null) {
      for (final entry in errorsJson.entries) {
        errorMsgs[entry.key] = entry.value as String;
      }
    }

    return FieldValidation(
      fieldName: name,
      type: json['type'] as String? ?? 'string',
      required: json['required'] as bool? ?? false,
      minLength: json['minLength'] as int?,
      maxLength: json['maxLength'] as int?,
      pattern: json['pattern'] as String?,
      patternMessage: json['patternMessage'] as String?,
      min: json['min'] as num?,
      max: json['max'] as num?,
      trim: json['trim'] as bool? ?? false,
      lowercase: json['lowercase'] as bool? ?? false,
      errorMessages: errorMsgs,
    );
  }

  /// Format as display-friendly key-value pairs
  Map<String, String> toDisplayMap() {
    final result = <String, String>{};
    result['Type'] = type;
    result['Required'] = required ? 'Yes' : 'No';
    if (minLength != null) result['Min Length'] = minLength.toString();
    if (maxLength != null) result['Max Length'] = maxLength.toString();
    if (min != null) result['Min Value'] = min.toString();
    if (max != null) result['Max Value'] = max.toString();
    if (pattern != null) result['Pattern'] = pattern!;
    if (trim) result['Trim'] = 'Yes';
    if (lowercase) result['Lowercase'] = 'Yes';
    return result;
  }
}

/// Summary of all roles in the system
class RoleSummary {
  final String name;
  final int priority;
  final String description;

  const RoleSummary({
    required this.name,
    required this.priority,
    required this.description,
  });

  factory RoleSummary.fromJson(String name, Map<String, dynamic> json) {
    return RoleSummary(
      name: name,
      priority: json['priority'] as int? ?? 0,
      description: json['description'] as String? ?? '',
    );
  }
}

/// Summary of a resource (entity) in permissions
class ResourceSummary {
  final String name;
  final String description;
  final List<String> operations;

  const ResourceSummary({
    required this.name,
    required this.description,
    required this.operations,
  });
}
