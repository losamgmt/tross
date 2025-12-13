/// Application Theme Assembly
///
/// Assembles complete Material 3 ThemeData from all config files.
/// KISS Principle: Theme assembly only - delegates to config files.
///
/// Imports and combines:
/// - AppColors: Color palette
/// - AppTypography: Text styles
/// - AppBorders: Border radii and widths
/// - AppShadows: Elevation and shadows
///
/// NOTE: This theme does NOT include spacing/padding!
/// Spacing is handled by AppSpacing at the widget level for responsiveness.
/// Material Design defaults are used here; override with context.spacing.* in widgets.
///
/// Usage:
/// ```dart
/// MaterialApp(
///   theme: AppTheme.lightTheme,
///   darkTheme: AppTheme.darkTheme,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_borders.dart';
import 'app_shadows.dart';

/// Application theme configuration
class AppTheme {
  // Private constructor to prevent instantiation
  AppTheme._();

  // ============================================================================
  // LIGHT THEME - Default theme
  // ============================================================================

  /// Light theme configuration
  static ThemeData get lightTheme {
    return ThemeData(
      // Use Material 3
      useMaterial3: true,

      // Color scheme
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.brandPrimary, // Bronze
        primary: AppColors.brandPrimary, // Bronze (Admin)
        secondary: AppColors.brandSecondary, // Honey Yellow (Technician)
        tertiary: AppColors.brandTertiary, // Deep Orange (Manager)
        error: AppColors.error,
        surface: AppColors.surfaceLight,
        onPrimary: AppColors.textOnBrand,
        onSecondary: AppColors.textOnBrand,
        onTertiary: AppColors.white,
        onError: AppColors.white,
        onSurface: AppColors.textPrimary,
      ),

      // App bar theme
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: AppShadows.level2,
        shadowColor: AppColors.black.withValues(alpha: 0.15),
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.textOnBrand,
        titleTextStyle: AppTypography.withColor(
          AppTypography.titleLarge,
          AppColors.textOnBrand,
        ),
      ),

      // Card theme
      cardTheme: CardThemeData(
        elevation: AppShadows.level4,
        shadowColor: AppShadows.shadowColor,
        shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusMedium),
        // NOTE: No margin - use Material default or override at widget level with context.spacing
      ),

      // Elevated button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: AppShadows.level3,
          shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusSmall),
          textStyle: AppTypography.labelLarge,
          // NOTE: No padding - Material default or override at widget level
        ),
      ),

      // Outlined button theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusSmall),
          side: BorderSide(
            width: AppBorders.widthThin,
            color: AppColors.brandPrimary,
          ),
          textStyle: AppTypography.labelLarge,
          // NOTE: No padding - Material default or override at widget level
        ),
      ),

      // Text button theme
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusSmall),
          textStyle: AppTypography.labelLarge,
          // NOTE: No padding - Material default or override at widget level
        ),
      ),

      // Input decoration theme
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: AppBorders.radiusSmall,
          borderSide: BorderSide(
            width: AppBorders.widthThin,
            color: AppColors.border,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppBorders.radiusSmall,
          borderSide: BorderSide(
            width: AppBorders.widthThin,
            color: AppColors.border,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppBorders.radiusSmall,
          borderSide: BorderSide(
            width: AppBorders.widthMedium,
            color: AppColors.brandPrimary,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppBorders.radiusSmall,
          borderSide: BorderSide(
            width: AppBorders.widthThin,
            color: AppColors.error,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppBorders.radiusSmall,
          borderSide: BorderSide(
            width: AppBorders.widthMedium,
            color: AppColors.error,
          ),
        ),
        // NOTE: No contentPadding - Material default or override at widget level
      ),

      // Dialog theme
      dialogTheme: DialogThemeData(
        elevation: AppShadows.level5,
        shadowColor: AppShadows.shadowColor,
        shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusLarge),
        titleTextStyle: AppTypography.withColor(
          AppTypography.headlineSmall,
          AppColors.textPrimary,
        ),
        contentTextStyle: AppTypography.withColor(
          AppTypography.bodyLarge,
          AppColors.textPrimary,
        ),
      ),

      // Floating action button theme
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        elevation: AppShadows.level3,
        shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusMedium),
      ),

      // Chip theme
      chipTheme: ChipThemeData(
        elevation: AppShadows.level1,
        shape: RoundedRectangleBorder(borderRadius: AppBorders.radiusSmall),
        labelStyle: AppTypography.labelMedium,
        // NOTE: No padding - Material default or override at widget level
      ),

      // Divider theme
      dividerTheme: DividerThemeData(
        color: AppColors.divider,
        thickness: AppBorders.widthHairline,
        // NOTE: No space - Material default or override at widget level
      ),

      // Text theme
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge,
        displayMedium: AppTypography.displayMedium,
        displaySmall: AppTypography.displaySmall,
        headlineLarge: AppTypography.headlineLarge,
        headlineMedium: AppTypography.headlineMedium,
        headlineSmall: AppTypography.headlineSmall,
        titleLarge: AppTypography.titleLarge,
        titleMedium: AppTypography.titleMedium,
        titleSmall: AppTypography.titleSmall,
        bodyLarge: AppTypography.bodyLarge,
        bodyMedium: AppTypography.bodyMedium,
        bodySmall: AppTypography.bodySmall,
        labelLarge: AppTypography.labelLarge,
        labelMedium: AppTypography.labelMedium,
        labelSmall: AppTypography.labelSmall,
      ),

      // Scaffold background
      scaffoldBackgroundColor: AppColors.backgroundLight,

      // Default text colors
      primaryColor: AppColors.brandPrimary,
      canvasColor: AppColors.white,
      dividerColor: AppColors.divider,
      disabledColor: AppColors.textDisabled,
    );
  }

  // ============================================================================
  // DARK THEME - For future implementation
  // ============================================================================

  /// Dark theme configuration (currently same as light, to be customized)
  static ThemeData get darkTheme {
    // Future: Implement dark theme with AppColors.backgroundDark, etc.
    // For now, return light theme as fallback
    return lightTheme.copyWith(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.brandPrimary,
        primary: AppColors.brandPrimary, // Bronze (Admin)
        secondary: AppColors.brandSecondary, // Honey Yellow (Technician)
        tertiary: AppColors.brandTertiary, // Deep Orange (Manager)
        error: AppColors.error,
        surface: AppColors.surfaceDark,
        onPrimary: AppColors.textOnBrand,
        onSecondary: AppColors.textOnBrand,
        onTertiary: AppColors.white,
        onError: AppColors.white,
        onSurface: AppColors.textOnDark,
        brightness: Brightness.dark,
      ),
    );
  }
}
