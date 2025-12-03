import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_colors.dart';

void main() {
  group('AppColors - Brand Colors', () {
    test('brandPrimary should be Bronze (0xFFCD7F32)', () {
      expect(AppColors.brandPrimary, const Color(0xFFCD7F32));
    });

    test('brandSecondary should be Honey Yellow (0xFFFFB90F)', () {
      expect(AppColors.brandSecondary, const Color(0xFFFFB90F));
    });

    test('brand color variants should be defined', () {
      expect(AppColors.brandPrimaryLight, isA<Color>());
      expect(AppColors.brandPrimaryDark, isA<Color>());
    });
  });

  group('AppColors - Semantic Colors', () {
    test('success should be warm green (on-brand)', () {
      expect(AppColors.success, const Color(0xFF66BB6A)); // Warm green
    });

    test('warning should be brand secondary (Honey Yellow)', () {
      expect(AppColors.warning, const Color(0xFFFFB90F)); // Honey Yellow
    });

    test('error should be warm red (on-brand)', () {
      expect(AppColors.error, const Color(0xFFE53935)); // Material Red 600
    });

    test('info should be warm blue (lighter)', () {
      expect(AppColors.info, const Color(0xFF42A5F5)); // Material Blue 400
    });

    test('semantic color variants should be defined', () {
      // Success variants
      expect(AppColors.successLight, isA<Color>());
      expect(AppColors.successDark, isA<Color>());

      // Warning variants
      expect(AppColors.warningLight, isA<Color>());
      expect(AppColors.warningDark, isA<Color>());

      // Error variants
      expect(AppColors.errorLight, isA<Color>());
      expect(AppColors.errorDark, isA<Color>());

      // Info variants
      expect(AppColors.infoLight, isA<Color>());
      expect(AppColors.infoDark, isA<Color>());
    });
  });

  group('AppColors - Neutral Colors', () {
    test('white should be pure white', () {
      expect(AppColors.white, const Color(0xFFFFFFFF));
    });

    test('black should be pure black', () {
      expect(AppColors.black, const Color(0xFF000000));
    });

    test('grey scale should have correct values', () {
      expect(AppColors.grey50, const Color(0xFFFAFAFA));
      expect(AppColors.grey100, const Color(0xFFF5F5F5));
      expect(AppColors.grey200, const Color(0xFFEEEEEE));
      expect(AppColors.grey300, const Color(0xFFE0E0E0));
      expect(AppColors.grey400, const Color(0xFFBDBDBD));
      expect(AppColors.grey500, const Color(0xFF9E9E9E));
      expect(AppColors.grey600, const Color(0xFF757575));
      expect(AppColors.grey700, const Color(0xFF616161));
      expect(AppColors.grey800, const Color(0xFF424242));
      expect(AppColors.grey900, const Color(0xFF212121));
    });

    test('grey scale should be ordered from lightest to darkest', () {
      expect(
        AppColors.grey50.computeLuminance() >
            AppColors.grey100.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey100.computeLuminance() >
            AppColors.grey200.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey200.computeLuminance() >
            AppColors.grey300.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey300.computeLuminance() >
            AppColors.grey400.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey400.computeLuminance() >
            AppColors.grey500.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey500.computeLuminance() >
            AppColors.grey600.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey600.computeLuminance() >
            AppColors.grey700.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey700.computeLuminance() >
            AppColors.grey800.computeLuminance(),
        isTrue,
      );
      expect(
        AppColors.grey800.computeLuminance() >
            AppColors.grey900.computeLuminance(),
        isTrue,
      );
    });
  });

  group('AppColors - Text Colors', () {
    test('text colors should be defined', () {
      expect(AppColors.textPrimary, isA<Color>());
      expect(AppColors.textSecondary, isA<Color>());
      expect(AppColors.textDisabled, isA<Color>());
      expect(AppColors.textOnDark, isA<Color>());
      expect(AppColors.textOnBrand, isA<Color>());
    });

    test('textPrimary should be dark for readability', () {
      expect(AppColors.textPrimary.computeLuminance() < 0.5, isTrue);
    });

    test('textOnDark should be light for readability', () {
      expect(AppColors.textOnDark.computeLuminance() > 0.5, isTrue);
    });

    test('textSecondary should be lighter than textPrimary', () {
      expect(
        AppColors.textSecondary.computeLuminance() >
            AppColors.textPrimary.computeLuminance(),
        isTrue,
      );
    });
  });

  group('AppColors - Background Colors', () {
    test('background colors should be defined', () {
      expect(AppColors.backgroundLight, isA<Color>());
      expect(AppColors.surfaceLight, isA<Color>());
      expect(AppColors.backgroundDark, isA<Color>());
      expect(AppColors.surfaceDark, isA<Color>());
    });

    test('light backgrounds should be light', () {
      expect(AppColors.backgroundLight.computeLuminance() > 0.5, isTrue);
      expect(AppColors.surfaceLight.computeLuminance() > 0.5, isTrue);
    });

    test('dark backgrounds should be dark', () {
      expect(AppColors.backgroundDark.computeLuminance() < 0.5, isTrue);
      expect(AppColors.surfaceDark.computeLuminance() < 0.5, isTrue);
    });
  });

  group('AppColors - Border & Divider Colors', () {
    test('border and divider colors should be defined', () {
      expect(AppColors.border, isA<Color>());
      expect(AppColors.divider, isA<Color>());
      expect(AppColors.borderActive, isA<Color>());
    });

    test('borderActive should be brandPrimary', () {
      expect(AppColors.borderActive, AppColors.brandPrimary);
    });
  });

  group('AppColors - Overlay Colors', () {
    test('overlay colors should be defined', () {
      expect(AppColors.scrim, isA<Color>());
      expect(AppColors.overlayLight, isA<Color>());
      expect(AppColors.overlayDark, isA<Color>());
    });

    test('scrim should be semi-transparent black', () {
      expect((AppColors.scrim.a * 255.0).round() & 0xff < 255, isTrue);
      expect((AppColors.scrim.r * 255.0).round() & 0xff, 0);
      expect((AppColors.scrim.g * 255.0).round() & 0xff, 0);
      expect((AppColors.scrim.b * 255.0).round() & 0xff, 0);
    });
  });

  group('AppColors - Helper Methods', () {
    test('withOpacity should create color with custom opacity', () {
      final transparent = AppColors.withOpacity(AppColors.brandPrimary, 0.5);
      expect((transparent.a * 255.0).round() & 0xff, 128); // 0.5 * 255 ≈ 128
    });

    test('isLight should correctly identify light colors', () {
      expect(AppColors.isLight(AppColors.white), isTrue);
      expect(AppColors.isLight(AppColors.grey50), isTrue);
      expect(AppColors.isLight(AppColors.black), isFalse);
      expect(AppColors.isLight(AppColors.grey900), isFalse);
    });

    test(
      'getTextColor should return appropriate text color for background',
      () {
        // Light background should get dark text
        expect(AppColors.getTextColor(AppColors.white), AppColors.textPrimary);

        // Dark background should get light text
        expect(AppColors.getTextColor(AppColors.black), AppColors.textOnDark);
      },
    );

    test('getTextColor should handle edge cases', () {
      // Brand colors should get light text (bronze is relatively dark)
      final textOnBrand = AppColors.getTextColor(AppColors.brandPrimary);
      expect(textOnBrand, isA<Color>());
    });
  });

  group('AppColors - Accessibility', () {
    test('brand colors should have sufficient contrast with white text', () {
      // Contrast ratio should be at least 3:1 for large text (AA)
      final brandLuminance = AppColors.brandPrimary.computeLuminance();
      final whiteLuminance = AppColors.white.computeLuminance();
      final contrastRatio = (whiteLuminance + 0.05) / (brandLuminance + 0.05);

      expect(
        contrastRatio >= 3.0,
        isTrue,
        reason: 'Brand primary should have sufficient contrast with white text',
      );
    });

    test('semantic colors should be distinguishable', () {
      // Success, warning, and error should have different hues
      expect(AppColors.success != AppColors.warning, isTrue);
      expect(AppColors.warning != AppColors.error, isTrue);
      expect(AppColors.error != AppColors.success, isTrue);
    });
  });
}
