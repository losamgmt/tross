/// AuditLogEntry - Model for audit trail entries
///
/// Represents a single audit log entry tracking changes to entities.
library;

/// A single audit log entry
class AuditLogEntry {
  final int id;
  final String resourceType;
  final int? resourceId;
  final String action;
  final Map<String, dynamic>? oldValues;
  final Map<String, dynamic>? newValues;
  final int? userId;
  final DateTime createdAt;
  final String? ipAddress;
  final String? userAgent;
  final String? result;
  final String? errorMessage;

  // User info from join (optional - populated in getAllLogs)
  final String? userEmail;
  final String? userFirstName;
  final String? userLastName;

  const AuditLogEntry({
    required this.id,
    required this.resourceType,
    this.resourceId,
    required this.action,
    this.oldValues,
    this.newValues,
    this.userId,
    required this.createdAt,
    this.ipAddress,
    this.userAgent,
    this.result,
    this.errorMessage,
    this.userEmail,
    this.userFirstName,
    this.userLastName,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: json['id'] as int,
      resourceType: json['resource_type'] as String,
      resourceId: json['resource_id'] as int?,
      action: json['action'] as String,
      oldValues: json['old_values'] as Map<String, dynamic>?,
      newValues: json['new_values'] as Map<String, dynamic>?,
      userId: json['user_id'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      ipAddress: json['ip_address'] as String?,
      userAgent: json['user_agent'] as String?,
      result: json['result'] as String?,
      errorMessage: json['error_message'] as String?,
      userEmail: json['user_email'] as String?,
      userFirstName: json['user_first_name'] as String?,
      userLastName: json['user_last_name'] as String?,
    );
  }

  /// Get display name for the user who performed the action
  String get userDisplayName {
    if (userFirstName != null || userLastName != null) {
      return '${userFirstName ?? ''} ${userLastName ?? ''}'.trim();
    }
    if (userEmail != null) {
      return userEmail!;
    }
    if (userId != null) {
      return 'User #$userId';
    }
    return 'System';
  }

  /// Get human-readable action description
  String get actionDescription {
    switch (action.toLowerCase()) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      case 'deactivate':
        return 'Deactivated';
      case 'login':
        return 'Logged in';
      case 'logout':
        return 'Logged out';
      case 'login_failed':
        return 'Failed login attempt';
      default:
        // Convert snake_case to Title Case
        return action
            .replaceAll('_', ' ')
            .split(' ')
            .map(
              (w) => w.isNotEmpty
                  ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
                  : '',
            )
            .join(' ');
    }
  }

  /// Get list of changed fields (for updates)
  List<String> get changedFields {
    if (oldValues == null || newValues == null) return [];

    final changed = <String>[];
    for (final key in newValues!.keys) {
      final oldVal = oldValues![key];
      final newVal = newValues![key];
      if (oldVal != newVal) {
        changed.add(key);
      }
    }
    return changed;
  }
}
