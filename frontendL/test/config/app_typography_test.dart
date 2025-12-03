import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_typography.dart';

void main() {
  group('AppTypography - Font Families', () {
    test('fontFamilyPrimary should be Roboto', () {
      expect(AppTypography.fontFamilyPrimary, 'Roboto');
    });

    test('fontFamilyMono should be Roboto Mono', () {
      expect(AppTypography.fontFamilyMono, 'Roboto Mono');
    });
  });

  group('AppTypography - Font Weights', () {
    test('font weight constants should be defined', () {
      expect(AppTypography.thin, FontWeight.w100);
      expect(AppTypography.extraLight, FontWeight.w200);
      expect(AppTypography.light, FontWeight.w300);
      expect(AppTypography.regular, FontWeight.w400);
      expect(AppTypography.medium, FontWeight.w500);
      expect(AppTypography.semiBold, FontWeight.w600);
      expect(AppTypography.bold, FontWeight.w700);
      expect(AppTypography.extraBold, FontWeight.w800);
      expect(AppTypography.black, FontWeight.w900);
    });
  });

  group('AppTypography - Display Styles', () {
    test('displayLarge should have correct properties', () {
      expect(
        AppTypography.displayLarge.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.displayLarge.fontSize, 57.0);
      expect(AppTypography.displayLarge.fontWeight, AppTypography.regular);
    });

    test('displayMedium should have correct properties', () {
      expect(
        AppTypography.displayMedium.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.displayMedium.fontSize, 45.0);
      expect(AppTypography.displayMedium.fontWeight, AppTypography.regular);
    });

    test('displaySmall should have correct properties', () {
      expect(
        AppTypography.displaySmall.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.displaySmall.fontSize, 36.0);
      expect(AppTypography.displaySmall.fontWeight, AppTypography.regular);
    });

    test('display styles should decrease in size', () {
      expect(
        AppTypography.displayLarge.fontSize! >
            AppTypography.displayMedium.fontSize!,
        isTrue,
      );
      expect(
        AppTypography.displayMedium.fontSize! >
            AppTypography.displaySmall.fontSize!,
        isTrue,
      );
    });
  });

  group('AppTypography - Headline Styles', () {
    test('headlineLarge should have correct properties', () {
      expect(
        AppTypography.headlineLarge.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.headlineLarge.fontSize, 32.0);
      expect(AppTypography.headlineLarge.fontWeight, AppTypography.regular);
    });

    test('headlineMedium should have correct properties', () {
      expect(
        AppTypography.headlineMedium.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.headlineMedium.fontSize, 28.0);
      expect(AppTypography.headlineMedium.fontWeight, AppTypography.regular);
    });

    test('headlineSmall should have correct properties', () {
      expect(
        AppTypography.headlineSmall.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.headlineSmall.fontSize, 24.0);
      expect(AppTypography.headlineSmall.fontWeight, AppTypography.regular);
    });

    test('headline styles should decrease in size', () {
      expect(
        AppTypography.headlineLarge.fontSize! >
            AppTypography.headlineMedium.fontSize!,
        isTrue,
      );
      expect(
        AppTypography.headlineMedium.fontSize! >
            AppTypography.headlineSmall.fontSize!,
        isTrue,
      );
    });
  });

  group('AppTypography - Title Styles', () {
    test('titleLarge should have correct properties', () {
      expect(
        AppTypography.titleLarge.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.titleLarge.fontSize, 22.0);
      expect(AppTypography.titleLarge.fontWeight, AppTypography.regular);
    });

    test('titleMedium should have correct properties', () {
      expect(
        AppTypography.titleMedium.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.titleMedium.fontSize, 16.0);
      expect(AppTypography.titleMedium.fontWeight, AppTypography.medium);
    });

    test('titleSmall should have correct properties', () {
      expect(
        AppTypography.titleSmall.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.titleSmall.fontSize, 14.0);
      expect(AppTypography.titleSmall.fontWeight, AppTypography.medium);
    });

    test('title styles should decrease in size', () {
      expect(
        AppTypography.titleLarge.fontSize! >
            AppTypography.titleMedium.fontSize!,
        isTrue,
      );
      expect(
        AppTypography.titleMedium.fontSize! >
            AppTypography.titleSmall.fontSize!,
        isTrue,
      );
    });
  });

  group('AppTypography - Body Styles', () {
    test('bodyLarge should have correct properties', () {
      expect(
        AppTypography.bodyLarge.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.bodyLarge.fontSize, 16.0);
      expect(AppTypography.bodyLarge.fontWeight, AppTypography.regular);
    });

    test('bodyMedium should have correct properties', () {
      expect(
        AppTypography.bodyMedium.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.bodyMedium.fontSize, 14.0);
      expect(AppTypography.bodyMedium.fontWeight, AppTypography.regular);
    });

    test('bodySmall should have correct properties', () {
      expect(
        AppTypography.bodySmall.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.bodySmall.fontSize, 12.0);
      expect(AppTypography.bodySmall.fontWeight, AppTypography.regular);
    });

    test('body styles should decrease in size', () {
      expect(
        AppTypography.bodyLarge.fontSize! > AppTypography.bodyMedium.fontSize!,
        isTrue,
      );
      expect(
        AppTypography.bodyMedium.fontSize! > AppTypography.bodySmall.fontSize!,
        isTrue,
      );
    });
  });

  group('AppTypography - Label Styles', () {
    test('labelLarge should have correct properties', () {
      expect(
        AppTypography.labelLarge.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.labelLarge.fontSize, 14.0);
      expect(AppTypography.labelLarge.fontWeight, AppTypography.medium);
    });

    test('labelMedium should have correct properties', () {
      expect(
        AppTypography.labelMedium.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.labelMedium.fontSize, 12.0);
      expect(AppTypography.labelMedium.fontWeight, AppTypography.medium);
    });

    test('labelSmall should have correct properties', () {
      expect(
        AppTypography.labelSmall.fontFamily,
        AppTypography.fontFamilyPrimary,
      );
      expect(AppTypography.labelSmall.fontSize, 11.0);
      expect(AppTypography.labelSmall.fontWeight, AppTypography.medium);
    });

    test('label styles should decrease in size', () {
      expect(
        AppTypography.labelLarge.fontSize! >
            AppTypography.labelMedium.fontSize!,
        isTrue,
      );
      expect(
        AppTypography.labelMedium.fontSize! >
            AppTypography.labelSmall.fontSize!,
        isTrue,
      );
    });

    test('label styles should use medium weight', () {
      expect(AppTypography.labelLarge.fontWeight, AppTypography.medium);
      expect(AppTypography.labelMedium.fontWeight, AppTypography.medium);
      expect(AppTypography.labelSmall.fontWeight, AppTypography.medium);
    });
  });

  group('AppTypography - Custom Styles', () {
    test('code style should use monospace font', () {
      expect(AppTypography.code.fontFamily, AppTypography.fontFamilyMono);
      expect(AppTypography.code.fontSize, 14.0);
    });

    test('number style should have tabular figures', () {
      expect(AppTypography.number.fontFeatures, isNotNull);
      expect(AppTypography.number.fontFeatures!.isNotEmpty, isTrue);
    });

    test('overline style should be uppercase-friendly', () {
      expect(AppTypography.overline.fontSize, 10.0);
      expect(
        AppTypography.overline.letterSpacing! > 1.0,
        isTrue,
        reason: 'Overline should have wide letter spacing for uppercase text',
      );
    });

    test('caption style should have correct properties', () {
      expect(AppTypography.caption.fontSize, 12.0);
      expect(AppTypography.caption.fontWeight, AppTypography.regular);
    });
  });

  group('AppTypography - Helper Methods', () {
    test('withColor should apply color to text style', () {
      const testColor = Color(0xFFFF0000);
      final styled = AppTypography.withColor(
        AppTypography.bodyLarge,
        testColor,
      );

      expect(styled.color, testColor);
      expect(styled.fontSize, AppTypography.bodyLarge.fontSize);
      expect(styled.fontWeight, AppTypography.bodyLarge.fontWeight);
    });

    test('withWeight should apply weight to text style', () {
      final styled = AppTypography.withWeight(
        AppTypography.bodyLarge,
        FontWeight.bold,
      );

      expect(styled.fontWeight, FontWeight.bold);
      expect(styled.fontSize, AppTypography.bodyLarge.fontSize);
      expect(styled.fontFamily, AppTypography.bodyLarge.fontFamily);
    });

    test('scaled should multiply font size by scale factor', () {
      final scaled = AppTypography.scaled(AppTypography.bodyLarge, 1.5);

      expect(scaled.fontSize, AppTypography.bodyLarge.fontSize! * 1.5);
      expect(scaled.fontWeight, AppTypography.bodyLarge.fontWeight);
    });

    test('italic should apply italic style', () {
      final styled = AppTypography.italic(AppTypography.bodyLarge);

      expect(styled.fontStyle, FontStyle.italic);
      expect(styled.fontSize, AppTypography.bodyLarge.fontSize);
    });

    test('underline should apply underline decoration', () {
      final styled = AppTypography.underline(AppTypography.bodyLarge);

      expect(styled.decoration, TextDecoration.underline);
      expect(styled.fontSize, AppTypography.bodyLarge.fontSize);
    });
  });

  group('AppTypography - Material 3 Compliance', () {
    test('all styles should have line height defined', () {
      expect(AppTypography.displayLarge.height, isNotNull);
      expect(AppTypography.headlineLarge.height, isNotNull);
      expect(AppTypography.titleLarge.height, isNotNull);
      expect(AppTypography.bodyLarge.height, isNotNull);
      expect(AppTypography.labelLarge.height, isNotNull);
    });

    test('all styles should have letter spacing defined', () {
      expect(AppTypography.displayLarge.letterSpacing, isNotNull);
      expect(AppTypography.headlineLarge.letterSpacing, isNotNull);
      expect(AppTypography.titleLarge.letterSpacing, isNotNull);
      expect(AppTypography.bodyLarge.letterSpacing, isNotNull);
      expect(AppTypography.labelLarge.letterSpacing, isNotNull);
    });

    test('display styles should follow Material 3 size scale', () {
      // Material 3 Display sizes: 57, 45, 36
      expect(AppTypography.displayLarge.fontSize, 57.0);
      expect(AppTypography.displayMedium.fontSize, 45.0);
      expect(AppTypography.displaySmall.fontSize, 36.0);
    });

    test('headline styles should follow Material 3 size scale', () {
      // Material 3 Headline sizes: 32, 28, 24
      expect(AppTypography.headlineLarge.fontSize, 32.0);
      expect(AppTypography.headlineMedium.fontSize, 28.0);
      expect(AppTypography.headlineSmall.fontSize, 24.0);
    });

    test('body styles should follow Material 3 size scale', () {
      // Material 3 Body sizes: 16, 14, 12
      expect(AppTypography.bodyLarge.fontSize, 16.0);
      expect(AppTypography.bodyMedium.fontSize, 14.0);
      expect(AppTypography.bodySmall.fontSize, 12.0);
    });
  });

  group('AppTypography - Accessibility', () {
    test('minimum font size should be readable', () {
      // Smallest font should be at least 11px
      expect(
        AppTypography.labelSmall.fontSize! >= 11.0,
        isTrue,
        reason: 'Smallest text should meet minimum readable size',
      );
    });

    test('line heights should be appropriate for readability', () {
      // Line height should generally be 1.2-1.6 for readability
      expect(AppTypography.bodyLarge.height! >= 1.2, isTrue);
      expect(AppTypography.bodyLarge.height! <= 1.6, isTrue);
    });
  });
}
