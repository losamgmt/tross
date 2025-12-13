/// String Formatting Helpers
///
/// Centralized, reusable utilities for formatting strings.
/// All methods are pure functions with no side effects.
///
/// Single Responsibility: Transform and format string values.
library;

/// String formatting utilities.
///
/// Provides consistent, reusable formatting for:
/// - Capitalization
/// - Text truncation
/// - Label generation
class StringHelpers {
  // Private constructor to prevent instantiation
  StringHelpers._();

  /// Capitalizes first letter of a string.
  ///
  /// Returns empty string if input is empty.
  ///
  /// Example:
  /// ```dart
  /// print(StringHelpers.capitalize('hello')); // "Hello"
  /// print(StringHelpers.capitalize('WORLD')); // "WORLD"
  /// print(StringHelpers.capitalize('')); // ""
  /// ```
  static String capitalize(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1);
  }

  /// Converts string to title case (capitalizes first letter, lowercases rest).
  ///
  /// Returns empty string if input is empty.
  ///
  /// Example:
  /// ```dart
  /// print(StringHelpers.toTitleCase('hello')); // "Hello"
  /// print(StringHelpers.toTitleCase('WORLD')); // "World"
  /// ```
  static String toTitleCase(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1).toLowerCase();
  }

  /// Truncates string to maximum length with ellipsis.
  ///
  /// Example:
  /// ```dart
  /// print(StringHelpers.truncate('Hello World', 8)); // "Hello..."
  /// print(StringHelpers.truncate('Short', 10)); // "Short"
  /// ```
  static String truncate(
    String text,
    int maxLength, {
    String ellipsis = '...',
  }) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  }
}
