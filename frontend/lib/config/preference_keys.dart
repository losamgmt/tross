/// Preference Keys Configuration
///
/// Single source of truth for user preference keys, types, and defaults.
/// Synced with backend's preferenceSchema in user-preferences-metadata.js
///
/// IMPORTANT: When adding new preferences:
/// 1. Add the key constant here
/// 2. Add to PreferenceDefaults
/// 3. Update backend's PREFERENCE_SCHEMA
/// 4. Run migration if needed
library;

/// Available theme modes for the app
enum ThemePreference {
  system('system'),
  light('light'),
  dark('dark');

  const ThemePreference(this.value);
  final String value;

  static ThemePreference fromString(String value) {
    return ThemePreference.values.firstWhere(
      (e) => e.value == value,
      orElse: () => ThemePreference.system,
    );
  }
}

/// Preference key constants
/// Use these instead of raw strings to prevent typos
class PreferenceKeys {
  PreferenceKeys._();

  /// Theme preference key
  /// Values: 'system', 'light', 'dark'
  static const String theme = 'theme';

  /// Notifications enabled preference key
  /// Values: true, false
  static const String notificationsEnabled = 'notificationsEnabled';

  /// All valid preference keys
  static const List<String> all = [theme, notificationsEnabled];

  /// Check if a key is valid
  static bool isValid(String key) => all.contains(key);
}

/// Default preference values
/// Must match backend's DEFAULT_PREFERENCES
class PreferenceDefaults {
  PreferenceDefaults._();

  /// Default theme preference
  static const String theme = 'system';

  /// Default notifications enabled preference
  static const bool notificationsEnabled = true;

  /// Get all defaults as a map
  static Map<String, dynamic> get all => {
    PreferenceKeys.theme: theme,
    PreferenceKeys.notificationsEnabled: notificationsEnabled,
  };
}

/// Preference schema definitions (for validation)
/// Matches backend's PREFERENCE_SCHEMA
class PreferenceSchema {
  PreferenceSchema._();

  /// Theme schema
  static const Map<String, dynamic> theme = {
    'type': 'enum',
    'values': ['system', 'light', 'dark'],
    'default': 'system',
    'description': 'UI color theme preference',
  };

  /// Notifications enabled schema
  static const Map<String, dynamic> notificationsEnabled = {
    'type': 'boolean',
    'default': true,
    'description': 'Whether to show notifications',
  };

  /// Get schema for a key
  static Map<String, dynamic>? getSchema(String key) {
    switch (key) {
      case PreferenceKeys.theme:
        return theme;
      case PreferenceKeys.notificationsEnabled:
        return notificationsEnabled;
      default:
        return null;
    }
  }
}

/// User preferences data class
/// Represents the user's preferences with type-safe access
class UserPreferences {
  UserPreferences({
    this.id,
    this.userId,
    required this.theme,
    required this.notificationsEnabled,
    this.createdAt,
    this.updatedAt,
  });

  /// Create from API response JSON
  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    final prefs = json['preferences'] as Map<String, dynamic>? ?? {};
    return UserPreferences(
      id: json['id'] as int?,
      userId: json['user_id'] as int?,
      theme: ThemePreference.fromString(
        prefs[PreferenceKeys.theme] as String? ?? PreferenceDefaults.theme,
      ),
      notificationsEnabled:
          prefs[PreferenceKeys.notificationsEnabled] as bool? ??
          PreferenceDefaults.notificationsEnabled,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  /// Create with defaults
  factory UserPreferences.defaults() {
    return UserPreferences(
      theme: ThemePreference.system,
      notificationsEnabled: PreferenceDefaults.notificationsEnabled,
    );
  }

  final int? id;
  final int? userId;
  final ThemePreference theme;
  final bool notificationsEnabled;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  /// Convert to JSON for API requests
  Map<String, dynamic> toJson() {
    return {
      PreferenceKeys.theme: theme.value,
      PreferenceKeys.notificationsEnabled: notificationsEnabled,
    };
  }

  /// Create a copy with updated values
  UserPreferences copyWith({
    int? id,
    int? userId,
    ThemePreference? theme,
    bool? notificationsEnabled,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserPreferences(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      theme: theme ?? this.theme,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is UserPreferences &&
        other.id == id &&
        other.userId == userId &&
        other.theme == theme &&
        other.notificationsEnabled == notificationsEnabled;
  }

  @override
  int get hashCode {
    return Object.hash(id, userId, theme, notificationsEnabled);
  }

  @override
  String toString() {
    return 'UserPreferences(theme: ${theme.value}, '
        'notificationsEnabled: $notificationsEnabled)';
  }
}
