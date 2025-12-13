/// StringHelper - Pure string formatting utility functions
///
/// ZERO DEPENDENCIES - Pure functions only
/// NO context sensitivity - receives strings, returns formatted strings
/// SRP: String transformation logic ONLY
library;

/// String formatting utilities
class StringHelper {
  StringHelper._(); // Private constructor - static class only

  /// Capitalizes first letter of a string
  ///
  /// Returns empty string if input is null or empty
  /// Examples:
  ///   capitalize('admin') => 'Admin'
  ///   capitalize('USER') => 'USER' (only first letter changed)
  ///   capitalize('') => ''
  static String capitalize(String? text) {
    if (text == null || text.isEmpty) return '';
    if (text.length == 1) return text.toUpperCase();
    return text[0].toUpperCase() + text.substring(1);
  }

  /// Gets first character of a string, uppercased
  ///
  /// Returns fallback if input is null or empty
  /// Examples:
  ///   getInitial('John Doe') => 'J'
  ///   getInitial('alice') => 'A'
  ///   getInitial('', fallback: 'U') => 'U'
  static String getInitial(String? text, {String fallback = 'U'}) {
    if (text == null || text.isEmpty) return fallback;
    return text[0].toUpperCase();
  }

  /// Converts string to uppercase
  ///
  /// Returns empty string if input is null or empty
  /// Examples:
  ///   toUpperCase('admin') => 'ADMIN'
  ///   toUpperCase('User') => 'USER'
  ///   toUpperCase(null) => ''
  static String toUpperCase(String? text) {
    return text?.toUpperCase() ?? '';
  }

  /// Converts string to lowercase
  ///
  /// Returns empty string if input is null or empty
  /// Examples:
  ///   toLowerCase('ADMIN') => 'admin'
  ///   toLowerCase('User') => 'user'
  ///   toLowerCase(null) => ''
  static String toLowerCase(String? text) {
    return text?.toLowerCase() ?? '';
  }

  /// Trims whitespace from string
  ///
  /// Returns empty string if input is null or empty
  /// Examples:
  ///   trim('  hello  ') => 'hello'
  ///   trim(null) => ''
  static String trim(String? text) {
    return text?.trim() ?? '';
  }
}
