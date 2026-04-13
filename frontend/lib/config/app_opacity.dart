/// Application Opacity System
///
/// Single source of truth for ALL opacity values.
/// KISS Principle: Opacity only - no colors (those are in AppColors).
///
/// Usage:
/// ```dart
/// // Disabled state
/// Opacity(opacity: AppOpacity.disabled, child: widget)
///
/// // Subtle background
/// color.withValues(alpha: AppOpacity.subtle)
/// ```
library;

/// Application opacity constants
class AppOpacity {
  // Private constructor to prevent instantiation
  AppOpacity._();

  // ============================================================================
  // STANDARD OPACITY SCALE
  // ============================================================================

  /// Fully opaque (1.0)
  static const double full = 1.0;

  /// High opacity (0.87) - Primary text on surface
  static const double high = 0.87;

  /// Medium-high opacity (0.7) - Secondary text, subtle emphasis
  static const double mediumHigh = 0.7;

  /// Medium opacity (0.6) - Tertiary elements
  static const double medium = 0.6;

  /// Disabled opacity (0.5) - Disabled states, inactive elements
  static const double disabled = 0.5;

  /// Subtle opacity (0.4) - Hints, placeholders, dividers
  static const double subtle = 0.4;

  /// Muted opacity (0.3) - Very subtle backgrounds
  static const double muted = 0.3;

  /// Faint opacity (0.2) - Hover states, selection backgrounds
  static const double faint = 0.2;

  /// Barely visible (0.12) - Ripple effects, very subtle indicators
  static const double barelyVisible = 0.12;

  /// Ghost opacity (0.08) - Nearly invisible, subtle surface tints
  static const double ghost = 0.08;

  /// Transparent (0.0)
  static const double transparent = 0.0;

  // ============================================================================
  // SEMANTIC ALIASES - Use these for consistent meaning
  // ============================================================================

  /// Disabled content opacity
  static const double disabledContent = disabled;

  /// Disabled surface opacity (for backgrounds)
  static const double disabledSurface = muted;

  /// Hover state opacity (for overlays)
  static const double hover = barelyVisible;

  /// Focus state opacity (for overlays)
  static const double focus = faint;

  /// Selected state opacity (for backgrounds)
  static const double selected = faint;

  /// Pressed state opacity (for overlays)
  static const double pressed = muted;

  /// Divider opacity
  static const double divider = subtle;

  /// Placeholder text opacity
  static const double placeholder = subtle;

  /// Hint text opacity
  static const double hint = subtle;

  /// Icon when disabled
  static const double iconDisabled = disabled;

  /// Text when disabled
  static const double textDisabled = disabled;

  /// Surface tint (for elevation simulation)
  static const double surfaceTint = ghost;

  /// Scrim (modal backdrop)
  static const double scrim = disabled;

  /// Drag handle indicator
  static const double dragHandle = subtle;
}
