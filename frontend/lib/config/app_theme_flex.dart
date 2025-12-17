/// Application Theme with FlexColorScheme
///
/// Uses flex_color_scheme for professional Material 3 theming with:
/// - Automatic dark mode generation
/// - Consistent color harmonization
/// - Proper surface tints and elevations
///
/// Integrates with PreferencesProvider for theme switching.
library;

import 'package:flutter/material.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'preference_keys.dart';

/// Application theme configuration using FlexColorScheme
class AppThemeConfig {
  AppThemeConfig._();

  // ══════════════════════════════════════════════════════════════════════════
  // BRAND COLORS - Tross Bronze & Honey
  // ══════════════════════════════════════════════════════════════════════════

  /// Primary brand color - Tross Bronze
  static const Color brandPrimary = Color(0xFFCD7F32);

  /// Secondary brand color - Honey Yellow
  static const Color brandSecondary = Color(0xFFFFB90F);

  /// Tertiary brand color - Deep Orange
  static const Color brandTertiary = Color(0xFFFF6F00);

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOM FLEX COLOR SCHEME
  // ══════════════════════════════════════════════════════════════════════════

  /// Custom Tross color scheme for light mode
  static const FlexSchemeColor _lightColors = FlexSchemeColor(
    primary: brandPrimary,
    primaryContainer: Color(0xFFFFE0B2), // Light bronze container
    secondary: brandSecondary,
    secondaryContainer: Color(0xFFFFF3E0), // Light honey container
    tertiary: brandTertiary,
    tertiaryContainer: Color(0xFFFFE0B2), // Light orange container
    appBarColor: brandPrimary,
    error: Color(0xFFB00020),
  );

  /// Custom Tross color scheme for dark mode
  static const FlexSchemeColor _darkColors = FlexSchemeColor(
    primary: Color(0xFFE5A868), // Lighter bronze for dark mode
    primaryContainer: Color(0xFF6D4C23), // Dark bronze container
    secondary: Color(0xFFFFD54F), // Lighter honey for dark mode
    secondaryContainer: Color(0xFF5C4300), // Dark honey container
    tertiary: Color(0xFFFF9E40), // Lighter orange for dark mode
    tertiaryContainer: Color(0xFF5C2E00), // Dark orange container
    appBarColor: Color(0xFF2D2013), // Dark bronze app bar
    error: Color(0xFFCF6679),
  );

  /// Custom scheme definition
  static const FlexSchemeData _trossScheme = FlexSchemeData(
    name: 'Tross Bronze',
    description: 'Professional bronze and honey color scheme for Tross',
    light: _lightColors,
    dark: _darkColors,
  );

  // ══════════════════════════════════════════════════════════════════════════
  // THEME GETTERS
  // ══════════════════════════════════════════════════════════════════════════

  /// Light theme using FlexColorScheme
  static ThemeData get lightTheme => FlexThemeData.light(
    colors: _trossScheme.light,
    useMaterial3: true,
    // Surface mode for better elevation handling
    surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
    // Blend level for surface color harmonization
    blendLevel: 10,
    // App bar style
    appBarStyle: FlexAppBarStyle.primary,
    appBarElevation: 2,
    // Bottom app bar uses surface
    bottomAppBarElevation: 2,
    // Tab bar style
    tabBarStyle: FlexTabBarStyle.forAppBar,
    // Light is primary color based
    lightIsWhite: false,
    // Swap colors for secondary swapped with primary
    swapColors: false,
    // Visual density
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    // Font family (optional - can integrate Google Fonts here)
    fontFamily: null,
    // Sub-themes for component styling
    subThemesData: const FlexSubThemesData(
      // Use Material 3 defaults
      useM2StyleDividerInM3: false,
      // Radius
      defaultRadius: 12.0,
      // Buttons
      elevatedButtonSchemeColor: SchemeColor.primary,
      elevatedButtonSecondarySchemeColor: SchemeColor.onPrimary,
      outlinedButtonOutlineSchemeColor: SchemeColor.primary,
      // Text fields
      inputDecoratorSchemeColor: SchemeColor.primary,
      inputDecoratorBorderType: FlexInputBorderType.outline,
      inputDecoratorRadius: 8.0,
      inputDecoratorUnfocusedBorderIsColored: false,
      // Cards
      cardRadius: 12.0,
      // Dialogs
      dialogRadius: 16.0,
      // Chips
      chipRadius: 8.0,
      // FAB
      fabRadius: 16.0,
      fabUseShape: true,
      // Navigation
      navigationBarIndicatorSchemeColor: SchemeColor.primaryContainer,
      navigationRailIndicatorSchemeColor: SchemeColor.primaryContainer,
      navigationBarSelectedLabelSchemeColor: SchemeColor.primary,
      navigationBarSelectedIconSchemeColor: SchemeColor.primary,
    ),
  );

  /// Dark theme using FlexColorScheme
  static ThemeData get darkTheme => FlexThemeData.dark(
    colors: _trossScheme.dark,
    useMaterial3: true,
    surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
    blendLevel: 15,
    appBarStyle: FlexAppBarStyle.surface,
    appBarElevation: 2,
    bottomAppBarElevation: 2,
    tabBarStyle: FlexTabBarStyle.forAppBar,
    darkIsTrueBlack: false,
    swapColors: false,
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    fontFamily: null,
    subThemesData: const FlexSubThemesData(
      useM2StyleDividerInM3: false,
      defaultRadius: 12.0,
      elevatedButtonSchemeColor: SchemeColor.primary,
      elevatedButtonSecondarySchemeColor: SchemeColor.onPrimary,
      outlinedButtonOutlineSchemeColor: SchemeColor.primary,
      inputDecoratorSchemeColor: SchemeColor.primary,
      inputDecoratorBorderType: FlexInputBorderType.outline,
      inputDecoratorRadius: 8.0,
      inputDecoratorUnfocusedBorderIsColored: false,
      cardRadius: 12.0,
      dialogRadius: 16.0,
      chipRadius: 8.0,
      fabRadius: 16.0,
      fabUseShape: true,
      navigationBarIndicatorSchemeColor: SchemeColor.primaryContainer,
      navigationRailIndicatorSchemeColor: SchemeColor.primaryContainer,
      navigationBarSelectedLabelSchemeColor: SchemeColor.primary,
      navigationBarSelectedIconSchemeColor: SchemeColor.primary,
    ),
  );

  /// Get theme data based on preference
  static ThemeData getTheme(
    ThemePreference preference,
    Brightness platformBrightness,
  ) {
    switch (preference) {
      case ThemePreference.light:
        return lightTheme;
      case ThemePreference.dark:
        return darkTheme;
      case ThemePreference.system:
        return platformBrightness == Brightness.dark ? darkTheme : lightTheme;
    }
  }

  /// Get theme mode from preference
  static ThemeMode getThemeMode(ThemePreference preference) {
    switch (preference) {
      case ThemePreference.light:
        return ThemeMode.light;
      case ThemePreference.dark:
        return ThemeMode.dark;
      case ThemePreference.system:
        return ThemeMode.system;
    }
  }
}
