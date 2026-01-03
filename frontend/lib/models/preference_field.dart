/// Preference Field Models
///
/// Data models for entity preference schema
/// Used for JSONB preference fields in entities
library;

/// Preference field types supported by the form builder
enum PreferenceFieldType { boolean, enumType, string, integer }

/// Preference field definition for JSONB preferences schema
/// Used to dynamically generate preference forms
class PreferenceFieldDefinition {
  final String key;
  final PreferenceFieldType type;
  final String label;
  final String? description;
  final dynamic defaultValue;
  final List<String>? enumValues;
  final Map<String, String>? displayLabels; // Maps enum values to display text
  final int order;

  const PreferenceFieldDefinition({
    required this.key,
    required this.type,
    required this.label,
    this.description,
    this.defaultValue,
    this.enumValues,
    this.displayLabels,
    this.order = 0,
  });

  factory PreferenceFieldDefinition.fromJson(
    String key,
    Map<String, dynamic> json,
  ) {
    return PreferenceFieldDefinition(
      key: key,
      type: _parsePreferenceFieldType(json['type'] as String? ?? 'string'),
      label: json['label'] as String? ?? _formatLabel(key),
      description: json['description'] as String?,
      defaultValue: json['default'],
      enumValues: (json['values'] as List<dynamic>?)?.cast<String>(),
      displayLabels: (json['displayLabels'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, v.toString()),
      ),
      order: json['order'] as int? ?? 0,
    );
  }

  static PreferenceFieldType _parsePreferenceFieldType(String type) {
    return switch (type.toLowerCase()) {
      'boolean' || 'bool' => PreferenceFieldType.boolean,
      'enum' => PreferenceFieldType.enumType,
      'string' => PreferenceFieldType.string,
      'integer' || 'int' => PreferenceFieldType.integer,
      _ => PreferenceFieldType.string,
    };
  }

  /// Format key to display label (e.g., 'notificationsEnabled' -> 'Notifications Enabled')
  static String _formatLabel(String key) {
    // Split on camelCase
    final words = key.replaceAllMapped(
      RegExp(r'([a-z])([A-Z])'),
      (match) => '${match.group(1)} ${match.group(2)}',
    );
    // Capitalize first letter
    if (words.isEmpty) return key;
    return '${words[0].toUpperCase()}${words.substring(1)}';
  }

  /// Get display text for an enum value
  String getDisplayText(String value) {
    return displayLabels?[value] ?? _formatLabel(value);
  }
}
