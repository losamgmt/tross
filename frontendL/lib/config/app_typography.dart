/// Application Typography System
///
/// Single source of truth for ALL text styles used in the application.
/// KISS Principle: Typography only - no colors or other styling.
///
/// Follows Material 3 Design typography scale:
/// - Display: Largest text (hero headings)
/// - Headline: Section headers
/// - Title: Subsection titles
/// - Body: Main content text
/// - Label: UI labels, buttons
///
/// Usage:
/// ```dart
/// Text('Hello', style: AppTypography.headlineLarge)
/// ElevatedButton(child: Text('Click', style: AppTypography.labelLarge))
/// ```
library;

import 'package:flutter/material.dart';

/// Application typography constants
class AppTypography {
  // Private constructor to prevent instantiation
  AppTypography._();

  // ============================================================================
  // FONT FAMILIES
  // ============================================================================

  /// Primary font family - Roboto (Material Design default)
  static const String fontFamilyPrimary = 'Roboto';

  /// Monospace font family - for code, numbers
  static const String fontFamilyMono = 'Roboto Mono';

  // ============================================================================
  // FONT WEIGHTS
  // ============================================================================

  static const FontWeight thin = FontWeight.w100;
  static const FontWeight extraLight = FontWeight.w200;
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
  static const FontWeight extraBold = FontWeight.w800;
  static const FontWeight black = FontWeight.w900;

  // ============================================================================
  // DISPLAY STYLES - Largest text (hero sections, landing pages)
  // ============================================================================

  /// Display Large - 57sp
  /// Use for: Hero text, very large headlines
  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 57.0,
    fontWeight: regular,
    height: 1.12,
    letterSpacing: -0.25,
  );

  /// Display Medium - 45sp
  /// Use for: Large headings
  static const TextStyle displayMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 45.0,
    fontWeight: regular,
    height: 1.16,
    letterSpacing: 0.0,
  );

  /// Display Small - 36sp
  /// Use for: Smaller large headings
  static const TextStyle displaySmall = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 36.0,
    fontWeight: regular,
    height: 1.22,
    letterSpacing: 0.0,
  );

  // ============================================================================
  // HEADLINE STYLES - Section headers
  // ============================================================================

  /// Headline Large - 32sp
  /// Use for: Major section headers
  static const TextStyle headlineLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 32.0,
    fontWeight: regular,
    height: 1.25,
    letterSpacing: 0.0,
  );

  /// Headline Medium - 28sp
  /// Use for: Section headers
  static const TextStyle headlineMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 28.0,
    fontWeight: regular,
    height: 1.29,
    letterSpacing: 0.0,
  );

  /// Headline Small - 24sp
  /// Use for: Subsection headers
  static const TextStyle headlineSmall = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 24.0,
    fontWeight: regular,
    height: 1.33,
    letterSpacing: 0.0,
  );

  // ============================================================================
  // TITLE STYLES - Subsection titles, card headers
  // ============================================================================

  /// Title Large - 22sp
  /// Use for: Large titles, card headers
  static const TextStyle titleLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 22.0,
    fontWeight: regular,
    height: 1.27,
    letterSpacing: 0.0,
  );

  /// Title Medium - 16sp, Medium weight
  /// Use for: Medium titles, list headers
  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16.0,
    fontWeight: medium,
    height: 1.50,
    letterSpacing: 0.15,
  );

  /// Title Small - 14sp, Medium weight
  /// Use for: Small titles, dense lists
  static const TextStyle titleSmall = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14.0,
    fontWeight: medium,
    height: 1.43,
    letterSpacing: 0.1,
  );

  // ============================================================================
  // BODY STYLES - Main content text
  // ============================================================================

  /// Body Large - 16sp
  /// Use for: Large body text, primary content
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16.0,
    fontWeight: regular,
    height: 1.50,
    letterSpacing: 0.5,
  );

  /// Body Medium - 14sp
  /// Use for: Default body text
  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14.0,
    fontWeight: regular,
    height: 1.43,
    letterSpacing: 0.25,
  );

  /// Body Small - 12sp
  /// Use for: Small body text, captions
  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 12.0,
    fontWeight: regular,
    height: 1.33,
    letterSpacing: 0.4,
  );

  // ============================================================================
  // LABEL STYLES - UI labels, buttons, chips
  // ============================================================================

  /// Label Large - 14sp, Medium weight
  /// Use for: Button text, prominent labels
  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14.0,
    fontWeight: medium,
    height: 1.43,
    letterSpacing: 0.1,
  );

  /// Label Medium - 12sp, Medium weight
  /// Use for: Form labels, chip text
  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 12.0,
    fontWeight: medium,
    height: 1.33,
    letterSpacing: 0.5,
  );

  /// Label Small - 11sp, Medium weight
  /// Use for: Small labels, badges, tags
  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 11.0,
    fontWeight: medium,
    height: 1.45,
    letterSpacing: 0.5,
  );

  // ============================================================================
  // CUSTOM STYLES - Application-specific
  // ============================================================================

  /// Code/Monospace text
  /// Use for: Code snippets, IDs, fixed-width content
  static const TextStyle code = TextStyle(
    fontFamily: fontFamilyMono,
    fontSize: 14.0,
    fontWeight: regular,
    height: 1.43,
    letterSpacing: 0.0,
  );

  /// Number display (tabular numbers for alignment)
  /// Use for: Tables, stats, dashboards
  static const TextStyle number = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16.0,
    fontWeight: medium,
    height: 1.50,
    letterSpacing: 0.0,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  /// Overline text (small all-caps)
  /// Use for: Category labels, section tags
  static const TextStyle overline = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 10.0,
    fontWeight: medium,
    height: 1.60,
    letterSpacing: 1.5,
  );

  /// Caption text
  /// Use for: Image captions, footnotes
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 12.0,
    fontWeight: regular,
    height: 1.33,
    letterSpacing: 0.4,
  );

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Apply custom color to any text style
  ///
  /// Example: `AppTypography.withColor(AppTypography.bodyLarge, Colors.red)`
  static TextStyle withColor(TextStyle style, Color color) {
    return style.copyWith(color: color);
  }

  /// Apply custom weight to any text style
  ///
  /// Example: `AppTypography.withWeight(AppTypography.bodyLarge, FontWeight.bold)`
  static TextStyle withWeight(TextStyle style, FontWeight weight) {
    return style.copyWith(fontWeight: weight);
  }

  /// Apply custom size to any text style (scale factor)
  ///
  /// Example: `AppTypography.scaled(AppTypography.bodyLarge, 1.2)`
  static TextStyle scaled(TextStyle style, double scale) {
    return style.copyWith(fontSize: (style.fontSize ?? 14.0) * scale);
  }

  /// Create italic variant of any text style
  ///
  /// Example: `AppTypography.italic(AppTypography.bodyLarge)`
  static TextStyle italic(TextStyle style) {
    return style.copyWith(fontStyle: FontStyle.italic);
  }

  /// Create underlined variant of any text style
  ///
  /// Example: `AppTypography.underline(AppTypography.bodyLarge)`
  static TextStyle underline(TextStyle style) {
    return style.copyWith(decoration: TextDecoration.underline);
  }
}
