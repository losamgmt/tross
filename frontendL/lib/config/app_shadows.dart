/// Application Shadow & Elevation System
///
/// Single source of truth for ALL shadows and elevation levels.
/// KISS Principle: Shadows only - no borders, colors (except shadow colors).
///
/// Follows Material 3 Design elevation levels (0-5).
/// Each elevation level has predefined shadow configurations.
///
/// Usage:
/// ```dart
/// Container(
///   decoration: BoxDecoration(
///     boxShadow: AppShadows.elevation2,
///   ),
/// )
/// Card(elevation: AppShadows.level4)
/// ```
library;

import 'package:flutter/material.dart';

/// Application shadow and elevation constants
class AppShadows {
  // Private constructor to prevent instantiation
  AppShadows._();

  // ============================================================================
  // ELEVATION LEVELS - Material Design 3
  // ============================================================================

  /// Level 0 - No elevation
  /// Use for: Flat surfaces, inline elements
  static const double level0 = 0.0;

  /// Level 1 - Minimal elevation (1dp)
  /// Use for: Cards at rest, outlined buttons
  static const double level1 = 1.0;

  /// Level 2 - Low elevation (3dp)
  /// Use for: App bar, cards on hover
  static const double level2 = 2.0;

  /// Level 3 - Medium elevation (6dp)
  /// Use for: FAB, elevated buttons, chips
  static const double level3 = 3.0;

  /// Level 4 - High elevation (8dp)
  /// Use for: Navigation drawer, modal bottom sheet
  static const double level4 = 4.0;

  /// Level 5 - Highest elevation (12dp)
  /// Use for: Dialogs, pickers, menus
  static const double level5 = 5.0;

  // ============================================================================
  // SHADOW COLORS - Base colors for shadows
  // ============================================================================

  /// Default shadow color - black with 20% opacity
  static const Color shadowColor = Color(0x33000000);

  /// Light shadow color - black with 10% opacity
  /// Use for: Subtle shadows in light mode
  static const Color shadowColorLight = Color(0x1A000000);

  /// Dark shadow color - black with 40% opacity
  /// Use for: Strong shadows, dark mode
  static const Color shadowColorDark = Color(0x66000000);

  /// Ambient shadow color - black with 25% opacity
  /// Use for: Key shadow (upper layer)
  static const Color shadowColorAmbient = Color(0x40000000);

  /// Umbra shadow color - black with 15% opacity
  /// Use for: Penumbra shadow (lower layer)
  static const Color shadowColorUmbra = Color(0x26000000);

  // ============================================================================
  // BOX SHADOW CONFIGURATIONS
  // ============================================================================

  /// No shadow
  static const List<BoxShadow> elevation0 = [];

  /// Elevation 1 - Minimal shadow (1dp)
  /// Use for: Cards at rest, subtle depth
  static const List<BoxShadow> elevation1 = [
    BoxShadow(
      color: shadowColorUmbra,
      offset: Offset(0.0, 1.0),
      blurRadius: 1.0,
      spreadRadius: 0.0,
    ),
    BoxShadow(
      color: shadowColorAmbient,
      offset: Offset(0.0, 1.0),
      blurRadius: 3.0,
      spreadRadius: 0.0,
    ),
  ];

  /// Elevation 2 - Low shadow (3dp)
  /// Material default for AppBar
  /// Use for: App bar, cards on hover
  static const List<BoxShadow> elevation2 = [
    BoxShadow(
      color: shadowColorUmbra,
      offset: Offset(0.0, 1.0),
      blurRadius: 2.0,
      spreadRadius: 0.0,
    ),
    BoxShadow(
      color: shadowColorAmbient,
      offset: Offset(0.0, 2.0),
      blurRadius: 4.0,
      spreadRadius: 0.0,
    ),
  ];

  /// Elevation 3 - Medium shadow (6dp)
  /// Use for: FAB, elevated buttons at rest
  static const List<BoxShadow> elevation3 = [
    BoxShadow(
      color: shadowColorUmbra,
      offset: Offset(0.0, 2.0),
      blurRadius: 4.0,
      spreadRadius: -1.0,
    ),
    BoxShadow(
      color: shadowColorAmbient,
      offset: Offset(0.0, 3.0),
      blurRadius: 6.0,
      spreadRadius: 0.0,
    ),
  ];

  /// Elevation 4 - High shadow (8dp)
  /// Material default for Card
  /// Use for: Navigation drawer, bottom sheet
  static const List<BoxShadow> elevation4 = [
    BoxShadow(
      color: shadowColorUmbra,
      offset: Offset(0.0, 2.0),
      blurRadius: 4.0,
      spreadRadius: -1.0,
    ),
    BoxShadow(
      color: shadowColorAmbient,
      offset: Offset(0.0, 4.0),
      blurRadius: 8.0,
      spreadRadius: 0.0,
    ),
  ];

  /// Elevation 5 - Highest shadow (12dp)
  /// Use for: Dialogs, pickers, dropdown menus
  static const List<BoxShadow> elevation5 = [
    BoxShadow(
      color: shadowColorUmbra,
      offset: Offset(0.0, 4.0),
      blurRadius: 5.0,
      spreadRadius: -2.0,
    ),
    BoxShadow(
      color: shadowColorAmbient,
      offset: Offset(0.0, 5.0),
      blurRadius: 12.0,
      spreadRadius: 0.0,
    ),
  ];
}
