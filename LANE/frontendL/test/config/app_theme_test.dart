import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_theme.dart';
import 'package:tross_app/config/app_colors.dart';
import 'package:tross_app/config/app_typography.dart';
import 'package:tross_app/config/app_borders.dart';
import 'package:tross_app/config/app_shadows.dart';

void main() {
  group('AppTheme - Light Theme', () {
    late ThemeData theme;

    setUp(() {
      theme = AppTheme.lightTheme;
    });

    test('should use Material 3', () {
      expect(theme.useMaterial3, isTrue);
    });

    test('should have correct color scheme', () {
      expect(theme.colorScheme.primary, AppColors.brandPrimary);
      expect(theme.colorScheme.secondary, AppColors.brandSecondary);
      expect(theme.colorScheme.error, AppColors.error);
      expect(theme.colorScheme.surface, AppColors.surfaceLight);
    });

    test('should have correct scaffold background', () {
      expect(theme.scaffoldBackgroundColor, AppColors.backgroundLight);
    });

    test('should have correct primary color', () {
      expect(theme.primaryColor, AppColors.brandPrimary);
    });
  });

  group('AppTheme - Dark Theme', () {
    late ThemeData theme;

    setUp(() {
      theme = AppTheme.darkTheme;
    });

    test('should use Material 3', () {
      expect(theme.useMaterial3, isTrue);
    });

    test('should have dark brightness', () {
      expect(theme.brightness, Brightness.dark);
    });

    test('should have dark scaffold background', () {
      expect(theme.scaffoldBackgroundColor, AppColors.backgroundDark);
    });

    test('should have correct color scheme brightness', () {
      expect(theme.colorScheme.brightness, Brightness.dark);
    });

    test('should have dark surface color', () {
      expect(theme.colorScheme.surface, AppColors.surfaceDark);
    });
  });

  group('AppTheme - AppBar Theme', () {
    late AppBarThemeData appBarTheme;

    setUp(() {
      appBarTheme = AppTheme.lightTheme.appBarTheme;
    });

    test('should have correct elevation', () {
      expect(appBarTheme.elevation, AppShadows.level2);
    });

    test('should be centered', () {
      expect(appBarTheme.centerTitle, isTrue);
    });

    test('should have brand primary background', () {
      expect(appBarTheme.backgroundColor, AppColors.brandPrimary);
    });

    test('should have correct text color', () {
      expect(appBarTheme.foregroundColor, AppColors.textOnBrand);
    });

    test('should have title text style defined', () {
      expect(appBarTheme.titleTextStyle, isNotNull);
      expect(appBarTheme.titleTextStyle!.color, AppColors.textOnBrand);
    });
  });

  group('AppTheme - Card Theme', () {
    late CardThemeData cardTheme;

    setUp(() {
      cardTheme = AppTheme.lightTheme.cardTheme;
    });

    test('should have correct elevation', () {
      expect(cardTheme.elevation, AppShadows.level4);
    });

    test('should have medium border radius', () {
      final shape = cardTheme.shape as RoundedRectangleBorder;
      expect(shape.borderRadius, AppBorders.radiusMedium);
    });

    test('should have shadow color', () {
      expect(cardTheme.shadowColor, AppShadows.shadowColor);
    });

    test('should NOT have margin (defers to AppSpacing)', () {
      expect(cardTheme.margin, isNull);
    });
  });

  group('AppTheme - Button Themes', () {
    test('elevated button should have correct shape', () {
      final buttonStyle = AppTheme.lightTheme.elevatedButtonTheme.style;
      expect(buttonStyle, isNotNull);

      final shape = buttonStyle!.shape!.resolve({});
      expect(shape, isA<RoundedRectangleBorder>());
    });

    test('elevated button should have correct elevation', () {
      final buttonStyle = AppTheme.lightTheme.elevatedButtonTheme.style;
      final elevation = buttonStyle!.elevation!.resolve({});
      expect(elevation, AppShadows.level3);
    });

    test('elevated button should NOT have padding (defers to AppSpacing)', () {
      final buttonStyle = AppTheme.lightTheme.elevatedButtonTheme.style;
      final padding = buttonStyle!.padding?.resolve({});
      expect(padding, isNull);
    });

    test('outlined button should have border', () {
      final buttonStyle = AppTheme.lightTheme.outlinedButtonTheme.style;
      final side = buttonStyle!.side!.resolve({});
      expect(side, isNotNull);
      expect(side!.color, AppColors.brandPrimary);
      expect(side.width, AppBorders.widthThin);
    });

    test('text button should have text style', () {
      final buttonStyle = AppTheme.lightTheme.textButtonTheme.style;
      final textStyle = buttonStyle!.textStyle!.resolve({});
      expect(textStyle, isNotNull);
    });
  });

  group('AppTheme - Input Decoration Theme', () {
    late InputDecorationThemeData inputTheme;

    setUp(() {
      inputTheme = AppTheme.lightTheme.inputDecorationTheme;
    });

    test('should have outlined borders', () {
      expect(inputTheme.border, isA<OutlineInputBorder>());
      expect(inputTheme.enabledBorder, isA<OutlineInputBorder>());
      expect(inputTheme.focusedBorder, isA<OutlineInputBorder>());
    });

    test('focused border should use brand primary', () {
      final border = inputTheme.focusedBorder as OutlineInputBorder;
      expect(border.borderSide.color, AppColors.brandPrimary);
      expect(border.borderSide.width, AppBorders.widthMedium);
    });

    test('error border should use error color', () {
      final border = inputTheme.errorBorder as OutlineInputBorder;
      expect(border.borderSide.color, AppColors.error);
    });

    test('should have small border radius', () {
      final border = inputTheme.border as OutlineInputBorder;
      expect(border.borderRadius, AppBorders.radiusSmall);
    });

    test('should NOT have content padding (defers to AppSpacing)', () {
      expect(inputTheme.contentPadding, isNull);
    });
  });

  group('AppTheme - Dialog Theme', () {
    late DialogThemeData dialogTheme;

    setUp(() {
      dialogTheme = AppTheme.lightTheme.dialogTheme;
    });

    test('should have highest elevation', () {
      expect(dialogTheme.elevation, AppShadows.level5);
    });

    test('should have large border radius', () {
      final shape = dialogTheme.shape as RoundedRectangleBorder;
      expect(shape.borderRadius, AppBorders.radiusLarge);
    });

    test('should have shadow color', () {
      expect(dialogTheme.shadowColor, AppShadows.shadowColor);
    });

    test('should have title text style', () {
      expect(dialogTheme.titleTextStyle, isNotNull);
      expect(dialogTheme.titleTextStyle!.color, AppColors.textPrimary);
    });

    test('should have content text style', () {
      expect(dialogTheme.contentTextStyle, isNotNull);
      expect(dialogTheme.contentTextStyle!.color, AppColors.textPrimary);
    });
  });

  group('AppTheme - FAB Theme', () {
    late FloatingActionButtonThemeData fabTheme;

    setUp(() {
      fabTheme = AppTheme.lightTheme.floatingActionButtonTheme;
    });

    test('should have medium elevation', () {
      expect(fabTheme.elevation, AppShadows.level3);
    });

    test('should have medium border radius', () {
      final shape = fabTheme.shape as RoundedRectangleBorder;
      expect(shape.borderRadius, AppBorders.radiusMedium);
    });
  });

  group('AppTheme - Chip Theme', () {
    late ChipThemeData chipTheme;

    setUp(() {
      chipTheme = AppTheme.lightTheme.chipTheme;
    });

    test('should have minimal elevation', () {
      expect(chipTheme.elevation, AppShadows.level1);
    });

    test('should have small border radius', () {
      final shape = chipTheme.shape as RoundedRectangleBorder;
      expect(shape.borderRadius, AppBorders.radiusSmall);
    });

    test('should have label style', () {
      expect(chipTheme.labelStyle, isNotNull);
    });

    test('should NOT have padding (defers to AppSpacing)', () {
      expect(chipTheme.padding, isNull);
    });
  });

  group('AppTheme - Divider Theme', () {
    late DividerThemeData dividerTheme;

    setUp(() {
      dividerTheme = AppTheme.lightTheme.dividerTheme;
    });

    test('should have correct color', () {
      expect(dividerTheme.color, AppColors.divider);
    });

    test('should have hairline thickness', () {
      expect(dividerTheme.thickness, AppBorders.widthHairline);
    });

    test('should NOT have space (defers to AppSpacing)', () {
      expect(dividerTheme.space, isNull);
    });
  });

  group('AppTheme - Text Theme', () {
    late TextTheme textTheme;

    setUp(() {
      textTheme = AppTheme.lightTheme.textTheme;
    });

    test('should include all display styles', () {
      // Check key properties rather than exact equality (Theme adds color/decoration)
      expect(
        textTheme.displayLarge!.fontSize,
        AppTypography.displayLarge.fontSize,
      );
      expect(
        textTheme.displayLarge!.fontWeight,
        AppTypography.displayLarge.fontWeight,
      );
      expect(
        textTheme.displayLarge!.fontFamily,
        AppTypography.displayLarge.fontFamily,
      );

      expect(
        textTheme.displayMedium!.fontSize,
        AppTypography.displayMedium.fontSize,
      );
      expect(
        textTheme.displaySmall!.fontSize,
        AppTypography.displaySmall.fontSize,
      );
    });

    test('should include all headline styles', () {
      expect(
        textTheme.headlineLarge!.fontSize,
        AppTypography.headlineLarge.fontSize,
      );
      expect(
        textTheme.headlineLarge!.fontWeight,
        AppTypography.headlineLarge.fontWeight,
      );
      expect(
        textTheme.headlineLarge!.fontFamily,
        AppTypography.headlineLarge.fontFamily,
      );

      expect(
        textTheme.headlineMedium!.fontSize,
        AppTypography.headlineMedium.fontSize,
      );
      expect(
        textTheme.headlineSmall!.fontSize,
        AppTypography.headlineSmall.fontSize,
      );
    });

    test('should include all title styles', () {
      expect(textTheme.titleLarge!.fontSize, AppTypography.titleLarge.fontSize);
      expect(
        textTheme.titleLarge!.fontWeight,
        AppTypography.titleLarge.fontWeight,
      );
      expect(
        textTheme.titleLarge!.fontFamily,
        AppTypography.titleLarge.fontFamily,
      );

      expect(
        textTheme.titleMedium!.fontSize,
        AppTypography.titleMedium.fontSize,
      );
      expect(textTheme.titleSmall!.fontSize, AppTypography.titleSmall.fontSize);
    });

    test('should include all body styles', () {
      expect(textTheme.bodyLarge!.fontSize, AppTypography.bodyLarge.fontSize);
      expect(
        textTheme.bodyLarge!.fontWeight,
        AppTypography.bodyLarge.fontWeight,
      );
      expect(
        textTheme.bodyLarge!.fontFamily,
        AppTypography.bodyLarge.fontFamily,
      );

      expect(textTheme.bodyMedium!.fontSize, AppTypography.bodyMedium.fontSize);
      expect(textTheme.bodySmall!.fontSize, AppTypography.bodySmall.fontSize);
    });

    test('should include all label styles', () {
      expect(textTheme.labelLarge!.fontSize, AppTypography.labelLarge.fontSize);
      expect(
        textTheme.labelLarge!.fontWeight,
        AppTypography.labelLarge.fontWeight,
      );
      expect(
        textTheme.labelLarge!.fontFamily,
        AppTypography.labelLarge.fontFamily,
      );

      expect(
        textTheme.labelMedium!.fontSize,
        AppTypography.labelMedium.fontSize,
      );
      expect(textTheme.labelSmall!.fontSize, AppTypography.labelSmall.fontSize);
    });
  });

  group('AppTheme - No Spacing Pollution', () {
    test('theme should NOT import AppSpacing', () {
      // This is a conceptual test - we verify by checking that no spacing
      // values are hardcoded in component themes

      // Card should have no margin
      expect(AppTheme.lightTheme.cardTheme.margin, isNull);

      // Buttons should have no padding
      final elevatedPadding = AppTheme
          .lightTheme
          .elevatedButtonTheme
          .style
          ?.padding
          ?.resolve({});
      expect(elevatedPadding, isNull);

      // Input should have no content padding
      expect(AppTheme.lightTheme.inputDecorationTheme.contentPadding, isNull);

      // Chip should have no padding
      expect(AppTheme.lightTheme.chipTheme.padding, isNull);

      // Divider should have no space
      expect(AppTheme.lightTheme.dividerTheme.space, isNull);
    });

    test('theme should only contain visual identity properties', () {
      // Theme should have colors, typography, shapes, shadows
      // but NOT spacing, padding, or margins

      expect(AppTheme.lightTheme.colorScheme, isNotNull);
      expect(AppTheme.lightTheme.textTheme, isNotNull);
      expect(AppTheme.lightTheme.cardTheme.shape, isNotNull);
      expect(AppTheme.lightTheme.cardTheme.elevation, isNotNull);
      expect(AppTheme.lightTheme.cardTheme.shadowColor, isNotNull);
    });
  });

  group('AppTheme - Theme Consistency', () {
    test('light and dark themes should have same component structure', () {
      final light = AppTheme.lightTheme;
      final dark = AppTheme.darkTheme;

      // Both should have all the same theme components
      expect(light.appBarTheme, isNotNull);
      expect(dark.appBarTheme, isNotNull);

      expect(light.cardTheme, isNotNull);
      expect(dark.cardTheme, isNotNull);

      expect(light.elevatedButtonTheme, isNotNull);
      expect(dark.elevatedButtonTheme, isNotNull);
    });

    test('both themes should use Material 3', () {
      expect(AppTheme.lightTheme.useMaterial3, isTrue);
      expect(AppTheme.darkTheme.useMaterial3, isTrue);
    });
  });

  group('AppTheme - Integration', () {
    testWidgets('theme should be usable in MaterialApp', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: const Scaffold(body: Text('Test')),
        ),
      );

      expect(find.text('Test'), findsOneWidget);
    });

    testWidgets('dark theme should be usable in MaterialApp', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.dark,
          home: const Scaffold(body: Text('Test')),
        ),
      );

      expect(find.text('Test'), findsOneWidget);
    });

    testWidgets('theme colors should be accessible in widgets', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Builder(
            builder: (context) {
              final theme = Theme.of(context);
              return Container(
                color: theme.colorScheme.primary,
                child: Text('Test', style: theme.textTheme.bodyLarge),
              );
            },
          ),
        ),
      );

      expect(find.text('Test'), findsOneWidget);
    });
  });
}
