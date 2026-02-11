/// FieldGroupAction - Generic action configuration for field groups
///
/// Defines an action that can be triggered on a field group.
/// The system is intentionally generic to support any UI function.
///
/// Built-in action types:
/// - `copy_fields`: Copy values from another group (matching by suffix)
/// - `clear_fields`: Reset all fields in the group to empty/default
/// - `toggle_fields`: Toggle boolean fields or expand/collapse
///
/// Custom actions are handled via callback - any type string not
/// matching built-in types is forwarded to the parent handler.
///
/// Usage in metadata JSON:
/// ```json
/// "service_address": {
///   "label": "Service Address",
///   "fields": ["service_line1", "service_city", ...],
///   "actions": [
///     {
///       "id": "same_as_billing",
///       "type": "copy_fields",
///       "label": "Same as Billing",
///       "icon": "content_copy",
///       "config": { "source": "billing_address" }
///     }
///   ]
/// }
/// ```
library;

import 'package:flutter/material.dart';

/// Action types with built-in handlers
abstract class FieldGroupActionTypes {
  /// Copy field values from another group (suffix matching)
  static const String copyFields = 'copy_fields';

  /// Clear/reset all fields in the group
  static const String clearFields = 'clear_fields';

  /// Custom action - handled by parent callback
  static const String custom = 'custom';
}

/// Icon name to IconData mapping for common action icons
IconData parseActionIcon(String? iconName) {
  return switch (iconName) {
    'content_copy' => Icons.content_copy,
    'copy' => Icons.content_copy,
    'clear' => Icons.clear,
    'delete' => Icons.delete_outline,
    'refresh' => Icons.refresh,
    'undo' => Icons.undo,
    'reset' => Icons.restart_alt,
    'check' => Icons.check,
    'add' => Icons.add,
    'remove' => Icons.remove,
    'edit' => Icons.edit,
    'visibility' => Icons.visibility,
    'visibility_off' => Icons.visibility_off,
    'expand' => Icons.expand_more,
    'collapse' => Icons.expand_less,
    'sync' => Icons.sync,
    _ => Icons.smart_button, // Default for unknown icons
  };
}

/// Configurable action for a field group
///
/// Actions can be built-in (copy_fields, clear_fields) or custom.
/// Custom actions are forwarded to the parent's onGroupAction callback.
class FieldGroupAction {
  /// Unique identifier for this action
  final String id;

  /// Action type - determines which handler processes this action
  /// Built-in types: 'copy_fields', 'clear_fields'
  /// Any other value is treated as custom
  final String type;

  /// Display label for the button
  final String label;

  /// Icon name (parsed to IconData)
  final String? iconName;

  /// Type-specific configuration
  /// For copy_fields: { "source": "group_name" }
  /// For custom: any JSON object passed to handler
  final Map<String, dynamic> config;

  /// Whether this action is enabled
  final bool enabled;

  const FieldGroupAction({
    required this.id,
    required this.type,
    required this.label,
    this.iconName,
    this.config = const {},
    this.enabled = true,
  });

  /// Parse icon name to IconData
  IconData get icon => parseActionIcon(iconName);

  /// Whether this is a built-in action type
  bool get isBuiltIn =>
      type == FieldGroupActionTypes.copyFields ||
      type == FieldGroupActionTypes.clearFields;

  factory FieldGroupAction.fromJson(Map<String, dynamic> json) {
    return FieldGroupAction(
      id:
          json['id'] as String? ??
          'action_${DateTime.now().millisecondsSinceEpoch}',
      type: json['type'] as String? ?? FieldGroupActionTypes.custom,
      label: json['label'] as String? ?? 'Action',
      iconName: json['icon'] as String?,
      config: (json['config'] as Map<String, dynamic>?) ?? const {},
      enabled: json['enabled'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'label': label,
    if (iconName != null) 'icon': iconName,
    if (config.isNotEmpty) 'config': config,
    if (!enabled) 'enabled': enabled,
  };

  /// Convenience factory for copy_fields action
  factory FieldGroupAction.copyFrom({
    required String sourceGroup,
    String? label,
    String id = 'copy_from_source',
  }) {
    return FieldGroupAction(
      id: id,
      type: FieldGroupActionTypes.copyFields,
      label: label ?? 'Same as Source',
      iconName: 'content_copy',
      config: {'source': sourceGroup},
    );
  }

  /// Convenience factory for clear_fields action
  factory FieldGroupAction.clear({
    String label = 'Clear',
    String id = 'clear_fields',
  }) {
    return FieldGroupAction(
      id: id,
      type: FieldGroupActionTypes.clearFields,
      label: label,
      iconName: 'clear',
    );
  }
}
