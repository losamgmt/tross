/// Color Calculation and Selection Helpers
///
/// Centralized, reusable utilities for color calculations and transformations.
/// All methods are pure functions with no side effects.
///
/// Single Responsibility: Calculate and transform colors for UI display.
library;

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';

/// Color utility functions.
///
/// Provides consistent, reusable color utilities for:
/// - Performance-based color selection (response times, etc.)
/// - Color transformations (opacity, lightness, contrast)
/// - Status-based color mapping
class ColorHelpers {
  // Private constructor to prevent instantiation
  ColorHelpers._();

  /// Returns a color based on response time performance.
  ///
  /// Uses standard thresholds:
  /// - **Green (success)**: < 100ms (fast)
  /// - **Amber (warning)**: 100-500ms (medium)
  /// - **Red (error)**: > 500ms (slow)
  ///
  /// Example:
  /// ```dart
  /// final color = ColorHelpers.responseTimeColor(Duration(milliseconds: 45));
  /// // Returns AppColors.success (green)
  /// ```
  static Color responseTimeColor(Duration duration) {
    final ms = duration.inMilliseconds;
    if (ms < 100) {
      return AppColors.success; // Fast: < 100ms
    } else if (ms < 500) {
      return AppColors.warning; // Medium: 100-500ms
    } else {
      return AppColors.error; // Slow: > 500ms
    }
  }

  /// Returns a color for HealthStatus enum values.
  ///
  /// Maps health status to semantic colors:
  /// - **healthy** → success (green)
  /// - **degraded** → warning (amber)
  /// - **critical** → error (red)
  /// - **unknown** → neutral gray (50% opacity)
  ///
  /// Example:
  /// ```dart
  /// final color = ColorHelpers.healthStatusColor(
  ///   HealthStatus.degraded,
  ///   theme,
  /// );
  /// // Returns AppColors.warning
  /// ```
  static Color healthStatusColor(dynamic status, ThemeData theme) {
    final statusString = status.toString().split('.').last;
    switch (statusString) {
      case 'healthy':
        return AppColors.success;
      case 'degraded':
        return AppColors.warning;
      case 'critical':
        return AppColors.error;
      case 'unknown':
      default:
        return theme.colorScheme.onSurface.withValues(alpha: 0.5);
    }
  }

  /// Creates a color with adjusted opacity while preserving RGB values.
  ///
  /// **Note**: This is a wrapper around Flutter's `Color.withValues(alpha:)`.
  /// Provided for consistency with legacy `Color.withOpacity()` patterns.
  ///
  /// [opacity] must be between 0.0 (transparent) and 1.0 (opaque).
  ///
  /// Example:
  /// ```dart
  /// final semiTransparent = ColorHelpers.withOpacity(Colors.blue, 0.5);
  /// ```
  static Color withOpacity(Color color, double opacity) {
    assert(
      opacity >= 0.0 && opacity <= 1.0,
      'Opacity must be between 0.0 and 1.0',
    );
    return color.withValues(alpha: opacity);
  }

  /// Determines if a color is "light" based on relative luminance.
  ///
  /// Uses WCAG 2.0 formula: colors with luminance > 0.5 are considered light.
  ///
  /// Useful for determining text color (dark text on light backgrounds).
  ///
  /// Example:
  /// ```dart
  /// if (ColorHelpers.isLight(backgroundColor)) {
  ///   textColor = Colors.black;
  /// } else {
  ///   textColor = Colors.white;
  /// }
  /// ```
  static bool isLight(Color color) {
    return color.computeLuminance() > 0.5;
  }

  /// Returns appropriate text color (black or white) for given background.
  ///
  /// Ensures sufficient contrast for accessibility:
  /// - **Light backgrounds** → Black text
  /// - **Dark backgrounds** → White text
  ///
  /// Example:
  /// ```dart
  /// final textColor = ColorHelpers.contrastingTextColor(backgroundColor);
  /// ```
  static Color contrastingTextColor(Color backgroundColor) {
    return isLight(backgroundColor) ? Colors.black : Colors.white;
  }

  /// Lightens a color by mixing with white.
  ///
  /// [amount] must be between 0.0 (no change) and 1.0 (pure white).
  ///
  /// Example:
  /// ```dart
  /// final lighterBlue = ColorHelpers.lighten(Colors.blue, 0.3);
  /// // Returns blue mixed with 30% white
  /// ```
  static Color lighten(Color color, double amount) {
    assert(
      amount >= 0.0 && amount <= 1.0,
      'Amount must be between 0.0 and 1.0',
    );
    return Color.lerp(color, Colors.white, amount)!;
  }

  /// Darkens a color by mixing with black.
  ///
  /// [amount] must be between 0.0 (no change) and 1.0 (pure black).
  ///
  /// Example:
  /// ```dart
  /// final darkerBlue = ColorHelpers.darken(Colors.blue, 0.3);
  /// // Returns blue mixed with 30% black
  /// ```
  static Color darken(Color color, double amount) {
    assert(
      amount >= 0.0 && amount <= 1.0,
      'Amount must be between 0.0 and 1.0',
    );
    return Color.lerp(color, Colors.black, amount)!;
  }
}
