/// Application Color Palette
///
/// Single source of truth for ALL colors used in the application.
/// KISS Principle: Colors only - no other styling concerns.
///
/// Organization:
/// - Brand Colors: Core identity colors (Bronze, Honey Yellow)
/// - Semantic Colors: Meaning-based (success, warning, error, info)
/// - Neutral Colors: Greys, blacks, whites for backgrounds/text
/// - UI Colors: Component-specific colors
///
/// Usage:
/// ```dart
/// Container(color: AppColors.brandPrimary)
/// Text(style: TextStyle(color: AppColors.textPrimary))
/// ```
library;

import 'package:flutter/material.dart';

/// Application color constants
class AppColors {
  // Private constructor to prevent instantiation
  AppColors._();

  // ============================================================================
  // BRAND COLORS - Core Identity (Tross Orange & Yellow)
  // ============================================================================

  /// Primary brand color - Tross Bronze/Orange
  /// Used for primary buttons, app bar, key UI elements
  static const Color brandPrimary = Color(0xFFCD7F32); // Bronze

  /// Secondary brand color - Honey Yellow
  /// Used for accents, highlights, secondary actions
  static const Color brandSecondary = Color(0xFFFFB90F); // Honey Yellow

  /// Brand color variants (lighter/darker shades of bronze/orange)
  static const Color brandPrimaryLight = Color(0xFFE5A868); // Light Bronze
  static const Color brandPrimaryDark = Color(0xFF9B5F26); // Dark Bronze
  static const Color brandSecondaryLight = Color(0xFFFFD54F); // Light Honey
  static const Color brandSecondaryDark = Color(0xFFFF8F00); // Dark Honey

  /// Tertiary brand color - Deeper Orange for variety
  /// Used for special accents, tertiary actions
  static const Color brandTertiary = Color(0xFFFF6F00); // Deep Orange
  static const Color brandTertiaryLight = Color(
    0xFFFF9E40,
  ); // Light Deep Orange
  static const Color brandTertiaryDark = Color(0xFFC43E00); // Dark Deep Orange

  // ============================================================================
  // SEMANTIC COLORS - On-Brand Warm Palette
  // ============================================================================

  /// Success state - Warm green (fits orange/yellow theme)
  static const Color success = Color(0xFF66BB6A); // Warm green
  static const Color successLight = Color(0xFF81C784);
  static const Color successDark = Color(0xFF388E3C);

  /// Warning state - Brand secondary (Honey Yellow)
  /// PERFECTLY on-brand for warnings!
  static const Color warning = brandSecondary;
  static const Color warningLight = brandSecondaryLight;
  static const Color warningDark = brandSecondaryDark;

  /// Error/Critical state - Warm red (fits orange theme)
  static const Color error = Color(0xFFE53935); // Material Red 600 (warmer)
  static const Color errorLight = Color(0xFFEF5350);
  static const Color errorDark = Color(0xFFC62828);

  /// Info state - OPTIONAL warm blue (can be replaced with brand colors)
  /// Consider using brandPrimary instead if too off-brand
  static const Color info = Color(0xFF42A5F5); // Material Blue 400 (lighter)
  static const Color infoLight = Color(0xFF64B5F6);
  static const Color infoDark = Color(0xFF1976D2);

  // ============================================================================
  // ROLE COLORS - All on-brand orange/yellow variations
  // ============================================================================

  /// Admin role - Brand primary (Bronze)
  static const Color roleAdmin = brandPrimary;
  static const Color roleAdminLight = brandPrimaryLight;
  static const Color roleAdminDark = brandPrimaryDark;

  /// Technician role - Brand secondary (Honey Yellow)
  static const Color roleTechnician = brandSecondary;
  static const Color roleTechnicianLight = brandSecondaryLight;
  static const Color roleTechnicianDark = brandSecondaryDark;

  /// Manager role - Brand tertiary (Deep Orange)
  static const Color roleManager = brandTertiary;
  static const Color roleManagerLight = brandTertiaryLight;
  static const Color roleManagerDark = brandTertiaryDark;

  // ============================================================================
  // NEUTRAL COLORS - Greys, Blacks, Whites
  // ============================================================================

  /// Pure white
  static const Color white = Color(0xFFFFFFFF);

  /// Pure black
  static const Color black = Color(0xFF000000);

  /// Grey scale (Material Design grey palette)
  static const Color grey50 = Color(0xFFFAFAFA);
  static const Color grey100 = Color(0xFFF5F5F5);
  static const Color grey200 = Color(0xFFEEEEEE);
  static const Color grey300 = Color(0xFFE0E0E0);
  static const Color grey400 = Color(0xFFBDBDBD);
  static const Color grey500 = Color(0xFF9E9E9E);
  static const Color grey600 = Color(0xFF757575);
  static const Color grey700 = Color(0xFF616161);
  static const Color grey800 = Color(0xFF424242);
  static const Color grey900 = Color(0xFF212121);

  // ============================================================================
  // TEXT COLORS - For readability
  // ============================================================================

  /// Primary text color (dark text on light background)
  static const Color textPrimary = Color(0xFF212121);

  /// Secondary text color (lighter, less emphasis)
  static const Color textSecondary = Color(0xFF757575);

  /// Disabled text color
  static const Color textDisabled = Color(0xFFBDBDBD);

  /// Text on dark backgrounds
  static const Color textOnDark = Color(0xFFFFFFFF);

  /// Text on colored backgrounds (brand colors)
  static const Color textOnBrand = Color(0xFFFFFFFF);

  // ============================================================================
  // BACKGROUND COLORS
  // ============================================================================

  /// Default background (light theme)
  static const Color backgroundLight = Color(0xFFFFFFFF);

  /// Surface background (light theme)
  static const Color surfaceLight = Color(0xFFFAFAFA);

  /// Default background (dark theme)
  static const Color backgroundDark = Color(0xFF121212);

  /// Surface background (dark theme)
  static const Color surfaceDark = Color(0xFF1E1E1E);

  // ============================================================================
  // BORDER & DIVIDER COLORS
  // ============================================================================

  /// Default border color
  static const Color border = Color(0xFFE0E0E0);

  /// Divider color
  static const Color divider = Color(0xFFBDBDBD);

  /// Border on focus/active states
  static const Color borderActive = brandPrimary;

  // ============================================================================
  // OVERLAY COLORS - For overlays, dialogs, modals
  // ============================================================================

  /// Scrim overlay (dark overlay over content)
  static const Color scrim = Color(0x80000000); // 50% black

  /// Light overlay
  static const Color overlayLight = Color(0x1A000000); // 10% black

  /// Dark overlay
  static const Color overlayDark = Color(0x4D000000); // 30% black

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Get color with custom opacity
  ///
  /// Example: `AppColors.withOpacity(AppColors.brandPrimary, 0.5)`
  static Color withOpacity(Color color, double opacity) {
    return color.withValues(alpha: opacity);
  }

  /// Check if color is light or dark (for text contrast)
  static bool isLight(Color color) {
    final double luminance = color.computeLuminance();
    return luminance > 0.5;
  }

  /// Get contrasting text color for given background
  static Color getTextColor(Color backgroundColor) {
    return isLight(backgroundColor) ? textPrimary : textOnDark;
  }
}
