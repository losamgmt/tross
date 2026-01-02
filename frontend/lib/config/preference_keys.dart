/// Theme Preference Enum
///
/// This is the ONLY hardcoded preference type because it's needed
/// for type-safe binding to MaterialApp's themeMode.
///
/// ALL OTHER preferences are 100% METADATA-DRIVEN:
/// - Keys come from preferenceSchema in entity-metadata.json
/// - Defaults come from preferenceSchema
/// - No hardcoded constants, classes, or defaults needed
///
/// To add a new preference:
/// 1. Add it to backend/config/models/preferences-metadata.js preferenceSchema
/// 2. Run: node scripts/sync-entity-metadata.js
/// 3. Done! It appears in the UI automatically.
library;

/// Available theme modes for the app
///
/// This enum exists because MaterialApp.themeMode requires ThemeMode,
/// and we need type-safe conversion from the string preference value.
/// This is the ONLY preference that needs a Dart type.
enum ThemePreference {
  system('system'),
  light('light'),
  dark('dark');

  const ThemePreference(this.value);
  final String value;

  /// Parse theme preference from string value
  ///
  /// Used when reading from preferences Map.
  /// Falls back to system if value is unrecognized.
  static ThemePreference fromString(String? value) {
    if (value == null) return ThemePreference.system;
    return ThemePreference.values.firstWhere(
      (e) => e.value == value,
      orElse: () => ThemePreference.system,
    );
  }
}
