/// User Model - Frontend representation of backend User
/// Backend schema: backend/db/models/User.js
/// API endpoint: GET /api/users
/// Last synced: 2025-11-10 (Added status field, made auth0_id nullable)
///
/// DEFENSIVE: Validates all API response data with toSafe*() validators
/// Philosophy: Never trust external data - validate at every boundary
///
/// Status Field (Migration 007):
/// - pending_activation: Admin created user awaiting first login (auth0_id can be null)
/// - active: Fully activated user (should have auth0_id, but logs warning if missing)
/// - suspended: Temporarily disabled account
library;

import '../utils/validators.dart';

class User {
  final int id;
  final String email;
  final String? auth0Id; // Nullable: Can be null for pending_activation users
  final String firstName;
  final String lastName;
  final int roleId;
  final String role;
  final bool isActive;
  final String
  status; // User lifecycle state (pending_activation, active, suspended)
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deactivatedAt; // Added Phase 9: Audit trail
  final int? deactivatedBy; // Added Phase 9: Audit trail (user_id)
  final bool
  isSynthetic; // Dev mode flag: true if auth0_id is synthetic (dev-user-{id})

  User({
    required this.id,
    required this.email,
    this.auth0Id, // Nullable: pending_activation users may not have auth0_id yet
    required this.firstName,
    required this.lastName,
    required this.roleId,
    required this.role,
    required this.isActive,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.deactivatedAt,
    this.deactivatedBy,
    this.isSynthetic = false, // Default to false
  });

  /// Create User from JSON response
  ///
  /// DEFENSIVE: Validates all fields with toSafe*() to prevent runtime crashes
  /// Throws ArgumentError with clear field name if data is invalid
  ///
  /// Handles nullable auth0_id for pending_activation users and dev mode synthetic IDs
  factory User.fromJson(Map<String, dynamic> json) {
    try {
      // Check for synthetic auth0_id (dev mode)
      final isSynthetic = json['_synthetic'] == true;

      return User(
        id: Validators.toSafeInt(json['id'], 'user.id', min: 1)!,
        email: Validators.toSafeEmail(json['email'], 'user.email'),
        // Allow null auth0_id for pending_activation users
        auth0Id: Validators.toSafeString(
          json['auth0_id'],
          'user.auth0_id',
          allowNull: true,
        ),
        firstName:
            Validators.toSafeString(
              json['first_name'],
              'user.first_name',
              allowNull: true,
            ) ??
            '',
        lastName:
            Validators.toSafeString(
              json['last_name'],
              'user.last_name',
              allowNull: true,
            ) ??
            '',
        roleId: Validators.toSafeInt(json['role_id'], 'user.role_id', min: 1)!,
        role: Validators.toSafeString(json['role'], 'user.role', minLength: 3)!,
        isActive:
            Validators.toSafeBool(json['is_active'], 'user.is_active') ?? true,
        // Status defaults to 'active' if missing (backward compatibility)
        status:
            Validators.toSafeString(
              json['status'],
              'user.status',
              allowNull: true,
            ) ??
            'active',
        createdAt: Validators.toSafeDateTime(
          json['created_at'],
          'user.created_at',
        )!,
        updatedAt: Validators.toSafeDateTime(
          json['updated_at'],
          'user.updated_at',
        )!,
        // Phase 9: Audit fields - handle both missing keys and null values
        deactivatedAt:
            (json.containsKey('deactivated_at') &&
                json['deactivated_at'] != null)
            ? Validators.toSafeDateTime(
                json['deactivated_at'],
                'user.deactivated_at',
              )
            : null,
        deactivatedBy:
            (json.containsKey('deactivated_by') &&
                json['deactivated_by'] != null)
            ? Validators.toSafeInt(
                json['deactivated_by'],
                'user.deactivated_by',
                min: 1,
              )
            : null,
        isSynthetic: isSynthetic,
      );
    } catch (e) {
      // Re-throw with context for debugging
      throw ArgumentError('Failed to parse User from JSON: $e\nJSON: $json');
    }
  }

  /// Convert User to JSON (for updates/creates)
  Map<String, dynamic> toJson() {
    final json = {
      'id': id,
      'email': email,
      'auth0_id': auth0Id,
      'first_name': firstName,
      'last_name': lastName,
      'role_id': roleId,
      'role': role,
      'is_active': isActive,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };

    // Include audit fields if they exist
    if (deactivatedAt != null) {
      json['deactivated_at'] = deactivatedAt!.toIso8601String();
    }
    if (deactivatedBy != null) {
      json['deactivated_by'] = deactivatedBy!;
    }

    return json;
  }

  /// Get user's full name
  String get fullName {
    final first = firstName.trim();
    final last = lastName.trim();

    if (first.isEmpty && last.isEmpty) {
      return email.split('@').first; // Fallback to email username
    }

    return '$first $last'.trim();
  }

  /// Get user's display name (for UI)
  String get displayName => fullName;

  /// Check if user is pending activation (awaiting first login)
  bool get isPendingActivation => status == 'pending_activation';

  /// Check if user is suspended
  bool get isSuspended => status == 'suspended';

  /// Check if user is fully active (both status and is_active flags)
  bool get isFullyActive => status == 'active' && isActive;

  /// Get human-readable status label
  String get statusLabel {
    switch (status) {
      case 'pending_activation':
        return 'Pending Activation';
      case 'active':
        return 'Active';
      case 'suspended':
        return 'Suspended';
      default:
        return status; // Fallback for unknown statuses
    }
  }

  /// Check if user has potential data quality issue (active but no auth0_id)
  bool get hasDataQualityIssue => status == 'active' && auth0Id == null;

  /// Copy with method for immutable updates
  User copyWith({
    int? id,
    String? email,
    String? auth0Id,
    String? firstName,
    String? lastName,
    int? roleId,
    String? role,
    bool? isActive,
    String? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deactivatedAt,
    int? deactivatedBy,
    bool? isSynthetic,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      auth0Id: auth0Id ?? this.auth0Id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      roleId: roleId ?? this.roleId,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deactivatedAt: deactivatedAt ?? this.deactivatedAt,
      deactivatedBy: deactivatedBy ?? this.deactivatedBy,
      isSynthetic: isSynthetic ?? this.isSynthetic,
    );
  }

  @override
  String toString() => 'User(id: $id, email: $email, role: $role)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          email == other.email;

  @override
  int get hashCode => id.hashCode ^ email.hashCode;
}
