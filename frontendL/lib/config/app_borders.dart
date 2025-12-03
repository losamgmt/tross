/// Application Border System
///
/// Single source of truth for ALL borders and border radii.
/// KISS Principle: Borders only - no colors, shadows, or other styling.
///
/// Organization:
/// - Border Radii: Rounded corners for components
/// - Border Widths: Stroke widths for borders
/// - Border Styles: Predefined Border configurations
///
/// Usage:
/// ```dart
/// Container(decoration: BoxDecoration(borderRadius: AppBorders.radiusMedium))
/// TextField(decoration: InputDecoration(border: AppBorders.outlineMedium))
/// ```
library;

import 'package:flutter/material.dart';

/// Application border constants
class AppBorders {
  // Private constructor to prevent instantiation
  AppBorders._();

  // ============================================================================
  // BORDER RADIUS - Rounded corners
  // ============================================================================

  /// No rounding (sharp corners)
  static const BorderRadius radiusNone = BorderRadius.zero;

  /// Extra small radius - 4px
  /// Use for: Small chips, tags, tiny buttons
  static const BorderRadius radiusXSmall = BorderRadius.all(
    Radius.circular(4.0),
  );

  /// Small radius - 8px
  /// Use for: Buttons, inputs, small cards
  static const BorderRadius radiusSmall = BorderRadius.all(
    Radius.circular(8.0),
  );

  /// Medium radius - 12px
  /// Use for: Cards, larger buttons, panels
  static const BorderRadius radiusMedium = BorderRadius.all(
    Radius.circular(12.0),
  );

  /// Large radius - 16px
  /// Use for: Large cards, dialogs, bottom sheets
  static const BorderRadius radiusLarge = BorderRadius.all(
    Radius.circular(16.0),
  );

  /// Extra large radius - 24px
  /// Use for: Modal dialogs, major containers
  static const BorderRadius radiusXLarge = BorderRadius.all(
    Radius.circular(24.0),
  );

  /// Circular (fully rounded)
  /// Use for: Avatar, circular buttons, badges
  static const BorderRadius radiusCircular = BorderRadius.all(
    Radius.circular(999.0),
  );

  // ============================================================================
  // INDIVIDUAL CORNER RADII - For specific corner customization
  // ============================================================================

  /// Top corners only - Medium (12px)
  /// Use for: Top of bottom sheets, panels
  static const BorderRadius radiusTopMedium = BorderRadius.only(
    topLeft: Radius.circular(12.0),
    topRight: Radius.circular(12.0),
  );

  /// Bottom corners only - Medium (12px)
  /// Use for: Bottom of dropdowns, tooltips
  static const BorderRadius radiusBottomMedium = BorderRadius.only(
    bottomLeft: Radius.circular(12.0),
    bottomRight: Radius.circular(12.0),
  );

  /// Top corners only - Large (16px)
  /// Use for: Top of modals, large bottom sheets
  static const BorderRadius radiusTopLarge = BorderRadius.only(
    topLeft: Radius.circular(16.0),
    topRight: Radius.circular(16.0),
  );

  /// Bottom corners only - Large (16px)
  /// Use for: Bottom of large dropdowns
  static const BorderRadius radiusBottomLarge = BorderRadius.only(
    bottomLeft: Radius.circular(16.0),
    bottomRight: Radius.circular(16.0),
  );

  // ============================================================================
  // BORDER WIDTHS - Stroke thickness
  // ============================================================================

  /// No border
  static const double widthNone = 0.0;

  /// Hairline border - 0.5px
  /// Use for: Subtle dividers, very light borders
  static const double widthHairline = 0.5;

  /// Thin border - 1px
  /// Use for: Default borders, dividers, outlines
  static const double widthThin = 1.0;

  /// Medium border - 2px
  /// Use for: Emphasized borders, active states
  static const double widthMedium = 2.0;

  /// Thick border - 3px
  /// Use for: Focus states, strong emphasis
  static const double widthThick = 3.0;

  /// Extra thick border - 4px
  /// Use for: Very strong emphasis, selected states
  static const double widthXThick = 4.0;

  // ============================================================================
  // PREDEFINED BORDER STYLES - Common border configurations
  // ============================================================================

  /// No border
  static const Border none = Border();

  /// Thin border (1px) - requires color parameter
  /// Example: `Border.all(width: AppBorders.widthThin, color: color)`
  /// Use BorderSide helper methods below for colored borders

  // ============================================================================
  // BORDER SIDE HELPERS - Create colored borders
  // ============================================================================

  /// Create a thin border side
  /// Example: `Border.all(width: AppBorders.widthThin, color: AppColors.border)`
  static BorderSide thin(Color color) {
    return BorderSide(width: widthThin, color: color);
  }

  /// Create a medium border side
  static BorderSide medium(Color color) {
    return BorderSide(width: widthMedium, color: color);
  }

  /// Create a thick border side
  static BorderSide thick(Color color) {
    return BorderSide(width: widthThick, color: color);
  }

  /// Create a hairline border side
  static BorderSide hairline(Color color) {
    return BorderSide(width: widthHairline, color: color);
  }

  // ============================================================================
  // COMPLETE BORDER HELPERS - Create full borders
  // ============================================================================

  /// Create a full thin border
  /// Example: `AppBorders.allThin(AppColors.border)`
  static Border allThin(Color color) {
    return Border.all(width: widthThin, color: color);
  }

  /// Create a full medium border
  static Border allMedium(Color color) {
    return Border.all(width: widthMedium, color: color);
  }

  /// Create a full thick border
  static Border allThick(Color color) {
    return Border.all(width: widthThick, color: color);
  }

  /// Create a bottom-only thin border
  /// Example: `AppBorders.bottomThin(AppColors.divider)`
  static Border bottomThin(Color color) {
    return Border(
      bottom: BorderSide(width: widthThin, color: color),
    );
  }

  /// Create a bottom-only medium border
  static Border bottomMedium(Color color) {
    return Border(
      bottom: BorderSide(width: widthMedium, color: color),
    );
  }

  /// Create a top-only thin border
  static Border topThin(Color color) {
    return Border(
      top: BorderSide(width: widthThin, color: color),
    );
  }

  /// Create a top-only medium border
  static Border topMedium(Color color) {
    return Border(
      top: BorderSide(width: widthMedium, color: color),
    );
  }

  // ============================================================================
  // OUTLINED BORDER HELPERS - For OutlinedBorder widgets (buttons, inputs)
  // ============================================================================

  /// Create a rounded rectangle outline - Small (8px)
  /// Example: `AppBorders.outlineSmall(AppColors.border)`
  static OutlinedBorder outlineSmall(Color color, {double? width}) {
    return RoundedRectangleBorder(
      borderRadius: radiusSmall,
      side: BorderSide(width: width ?? widthThin, color: color),
    );
  }

  /// Create a rounded rectangle outline - Medium (12px)
  /// Example: `AppBorders.outlineMedium(AppColors.border)`
  static OutlinedBorder outlineMedium(Color color, {double? width}) {
    return RoundedRectangleBorder(
      borderRadius: radiusMedium,
      side: BorderSide(width: width ?? widthThin, color: color),
    );
  }

  /// Create a rounded rectangle outline - Large (16px)
  static OutlinedBorder outlineLarge(Color color, {double? width}) {
    return RoundedRectangleBorder(
      borderRadius: radiusLarge,
      side: BorderSide(width: width ?? widthThin, color: color),
    );
  }

  /// Create a circular outline
  /// Example: `AppBorders.outlineCircular(AppColors.border)`
  static OutlinedBorder outlineCircular(Color color, {double? width}) {
    return CircleBorder(
      side: BorderSide(width: width ?? widthThin, color: color),
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /// Create custom border radius
  /// Example: `AppBorders.customRadius(20.0)`
  static BorderRadius customRadius(double radius) {
    return BorderRadius.all(Radius.circular(radius));
  }

  /// Create asymmetric border radius
  /// Example: `AppBorders.customAsymmetric(topLeft: 8, bottomRight: 16)`
  static BorderRadius customAsymmetric({
    double topLeft = 0,
    double topRight = 0,
    double bottomLeft = 0,
    double bottomRight = 0,
  }) {
    return BorderRadius.only(
      topLeft: Radius.circular(topLeft),
      topRight: Radius.circular(topRight),
      bottomLeft: Radius.circular(bottomLeft),
      bottomRight: Radius.circular(bottomRight),
    );
  }
}
