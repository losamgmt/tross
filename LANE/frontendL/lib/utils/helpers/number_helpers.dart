/// Number Formatting Helpers
///
/// Centralized, reusable utilities for formatting numbers.
/// All methods are pure functions with no side effects.
///
/// Single Responsibility: Format numeric values for display.
library;

/// Number formatting utilities.
///
/// Provides consistent, reusable formatting for:
/// - Decimal precision control
/// - Integer detection and formatting
/// - Prefix/suffix support (handled by caller)
class NumberHelpers {
  // Private constructor to prevent instantiation
  NumberHelpers._();

  /// Formats a [num] with optional decimal precision.
  ///
  /// Rules:
  /// - If [decimals] is provided, formats to exact decimal places
  /// - If number is integer or whole number, shows without decimals
  /// - Otherwise, shows natural string representation
  ///
  /// Example:
  /// ```dart
  /// print(NumberHelpers.formatNumber(42)); // "42"
  /// print(NumberHelpers.formatNumber(42.5)); // "42.5"
  /// print(NumberHelpers.formatNumber(42.5, decimals: 2)); // "42.50"
  /// print(NumberHelpers.formatNumber(42.123, decimals: 2)); // "42.12"
  /// ```
  static String formatNumber(num number, {int? decimals}) {
    if (decimals != null) {
      return number.toStringAsFixed(decimals);
    }
    // If it's an integer, show without decimals
    if (number is int || number == number.roundToDouble()) {
      return number.round().toString();
    }
    return number.toString();
  }
}
