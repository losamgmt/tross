/// Role Model - Frontend representation of backend Role
/// Backend schema: backend/db/models/Role.js
/// API endpoint: GET /api/roles
/// Last synced: 2025-11-07 (Added updatedAt field for audit completeness)
///
/// DEFENSIVE: Validates all API response data with toSafe*() validators
/// Philosophy: Never trust external data - validate at every boundary
library;

import '../utils/validators.dart';

class Role {
  final int id;
  final String name;
  final DateTime createdAt;
  final DateTime
  updatedAt; // Added 2025-11-07: Audit trail (matches backend schema)
  final int? priority; // Added Phase 0: Role hierarchy (admin=5, client=1)
  final String? description; // Added Phase 0: Role description
  final bool isActive; // Added Phase 9: Status management
  final DateTime? deactivatedAt; // Added Phase 9: Audit trail
  final int? deactivatedBy; // Added Phase 9: Audit trail (user_id)

  Role({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    this.priority,
    this.description,
    this.isActive = true,
    this.deactivatedAt,
    this.deactivatedBy,
  });

  /// Create Role from JSON response
  ///
  /// DEFENSIVE: Validates all fields with toSafe*() to prevent runtime crashes
  /// Throws ArgumentError with clear field name if data is invalid
  /// FLEXIBLE: Handles optional fields gracefully (priority, description, audit fields)
  factory Role.fromJson(Map<String, dynamic> json) {
    try {
      return Role(
        id: Validators.toSafeInt(json['id'], 'role.id', min: 1)!,
        name: Validators.toSafeString(
          json['name'],
          'role.name',
          minLength: 3,
          maxLength: 50,
        )!,
        createdAt: Validators.toSafeDateTime(
          json['created_at'],
          'role.created_at',
        )!,
        updatedAt: Validators.toSafeDateTime(
          json['updated_at'],
          'role.updated_at',
        )!,
        // Optional fields - gracefully handle missing data
        // Priority validation: 1-100 for flexible role hierarchy
        priority: json.containsKey('priority')
            ? Validators.toSafeInt(
                json['priority'],
                'role.priority',
                min: 1,
                max: 100,
              )
            : null,
        description: json.containsKey('description')
            ? Validators.toSafeString(
                json['description'],
                'role.description',
                allowNull: true,
              )
            : null,
        // Phase 9: Status & audit fields - handle both missing keys and null values
        isActive: (json.containsKey('is_active') && json['is_active'] != null)
            ? Validators.toSafeBool(json['is_active'], 'role.is_active')!
            : true, // Default to true if missing or null
        deactivatedAt:
            (json.containsKey('deactivated_at') &&
                json['deactivated_at'] != null)
            ? Validators.toSafeDateTime(
                json['deactivated_at'],
                'role.deactivated_at',
              )
            : null,
        deactivatedBy:
            (json.containsKey('deactivated_by') &&
                json['deactivated_by'] != null)
            ? Validators.toSafeInt(
                json['deactivated_by'],
                'role.deactivated_by',
                min: 1,
              )
            : null,
      );
    } catch (e) {
      // Re-throw with context for debugging
      throw ArgumentError('Failed to parse Role from JSON: $e\nJSON: $json');
    }
  }

  /// Convert Role to JSON
  Map<String, dynamic> toJson() {
    final json = {
      'id': id,
      'name': name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_active': isActive,
    };

    // Only include optional fields if they exist
    if (priority != null) json['priority'] = priority!;
    if (description != null) json['description'] = description!;
    if (deactivatedAt != null) {
      json['deactivated_at'] = deactivatedAt!.toIso8601String();
    }
    if (deactivatedBy != null) json['deactivated_by'] = deactivatedBy!;

    return json;
  }

  /// Get display name (capitalized)
  String get displayName {
    if (name.isEmpty) return '';
    return name[0].toUpperCase() + name.substring(1);
  }

  /// Check if role is protected (cannot be deleted/modified)
  bool get isProtected {
    return ['admin', 'client'].contains(name.toLowerCase());
  }

  /// Copy with method for immutable updates
  Role copyWith({
    int? id,
    String? name,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? priority,
    String? description,
    bool? isActive,
    DateTime? deactivatedAt,
    int? deactivatedBy,
  }) {
    return Role(
      id: id ?? this.id,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      priority: priority ?? this.priority,
      description: description ?? this.description,
      isActive: isActive ?? this.isActive,
      deactivatedAt: deactivatedAt ?? this.deactivatedAt,
      deactivatedBy: deactivatedBy ?? this.deactivatedBy,
    );
  }

  @override
  String toString() =>
      'Role(id: $id, name: $name, isActive: $isActive, priority: $priority, description: $description)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Role &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          priority == other.priority &&
          isActive == other.isActive;

  @override
  int get hashCode => id.hashCode ^ name.hashCode ^ isActive.hashCode;
}
