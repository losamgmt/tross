/// Tests for ColorHelpers
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/color_helpers.dart';
import 'package:tross_app/config/app_colors.dart';

void main() {
  group('ColorHelpers.responseTimeColor', () {
    test('returns success color for fast response (< 100ms)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(milliseconds: 45)),
        AppColors.success,
      );
    });

    test('returns warning color for medium response (100-500ms)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(milliseconds: 250)),
        AppColors.warning,
      );
    });

    test('returns error color for slow response (> 500ms)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(milliseconds: 750)),
        AppColors.error,
      );
    });

    test('handles exactly 100ms (boundary - warning starts)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(milliseconds: 100)),
        AppColors.warning,
      );
    });

    test('handles exactly 500ms (boundary - error starts)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(milliseconds: 500)),
        AppColors.error, // 500ms is >= 500, so it's ERROR not WARNING
      );
    });

    test('handles zero duration (fast)', () {
      expect(ColorHelpers.responseTimeColor(Duration.zero), AppColors.success);
    });

    test('handles very slow response (> 1 second)', () {
      expect(
        ColorHelpers.responseTimeColor(const Duration(seconds: 5)),
        AppColors.error,
      );
    });
  });

  group('ColorHelpers.withOpacity', () {
    test('creates color with specified opacity', () {
      final result = ColorHelpers.withOpacity(AppColors.brandPrimary, 0.5);
      expect((result.a * 255.0).round(), closeTo(127, 1)); // 0.5 * 255 = 127.5
    });

    test('handles fully opaque (1.0)', () {
      final result = ColorHelpers.withOpacity(AppColors.error, 1.0);
      expect((result.a * 255.0).round(), 255);
    });

    test('handles fully transparent (0.0)', () {
      final result = ColorHelpers.withOpacity(AppColors.success, 0.0);
      expect((result.a * 255.0).round(), 0);
    });

    test('preserves RGB values', () {
      final original = const Color(0xFF112233);
      final result = ColorHelpers.withOpacity(original, 0.5);
      expect((result.r * 255.0).round(), (original.r * 255.0).round());
      expect((result.g * 255.0).round(), (original.g * 255.0).round());
      expect((result.b * 255.0).round(), (original.b * 255.0).round());
    });

    test('throws assertion error for opacity < 0', () {
      expect(
        () => ColorHelpers.withOpacity(Colors.blue, -0.1),
        throwsA(isA<AssertionError>()),
      );
    });

    test('throws assertion error for opacity > 1', () {
      expect(
        () => ColorHelpers.withOpacity(Colors.blue, 1.1),
        throwsA(isA<AssertionError>()),
      );
    });
  });

  group('ColorHelpers.isLight', () {
    test('returns true for white', () {
      expect(ColorHelpers.isLight(Colors.white), isTrue);
    });

    test('returns false for black', () {
      expect(ColorHelpers.isLight(Colors.black), isFalse);
    });

    test('returns true for light gray', () {
      expect(ColorHelpers.isLight(Colors.grey[300]!), isTrue);
    });

    test('returns false for dark gray', () {
      expect(ColorHelpers.isLight(Colors.grey[700]!), isFalse);
    });

    test('returns true for brand secondary (high luminance)', () {
      expect(ColorHelpers.isLight(AppColors.brandSecondary), isTrue);
    });

    test('returns false for brand primary dark (low luminance)', () {
      expect(ColorHelpers.isLight(AppColors.brandPrimaryDark), isFalse);
    });
  });

  group('ColorHelpers.contrastingTextColor', () {
    test('returns black for white background', () {
      expect(ColorHelpers.contrastingTextColor(Colors.white), Colors.black);
    });

    test('returns white for black background', () {
      expect(ColorHelpers.contrastingTextColor(Colors.black), Colors.white);
    });

    test('returns black for light background', () {
      expect(ColorHelpers.contrastingTextColor(Colors.yellow), Colors.black);
    });

    test('returns white for dark background', () {
      expect(ColorHelpers.contrastingTextColor(Colors.blue), Colors.white);
    });
  });

  group('ColorHelpers.lighten', () {
    test('lightens color by specified amount', () {
      final result = ColorHelpers.lighten(Colors.blue, 0.5);
      expect(ColorHelpers.isLight(result), isTrue);
      expect(result, isNot(Colors.blue));
      expect(result, isNot(Colors.white));
    });

    test('returns white when amount is 1.0', () {
      final result = ColorHelpers.lighten(Colors.blue, 1.0);
      expect(result, Colors.white);
    });

    test('returns original color when amount is 0.0', () {
      final result = ColorHelpers.lighten(AppColors.brandPrimary, 0.0);
      expect(result, AppColors.brandPrimary); // Should return identical color
    });

    test('throws assertion error for amount < 0', () {
      expect(
        () => ColorHelpers.lighten(AppColors.brandPrimary, -0.1),
        throwsA(isA<AssertionError>()),
      );
    });

    test('throws assertion error for amount > 1', () {
      expect(
        () => ColorHelpers.lighten(AppColors.brandPrimary, 1.1),
        throwsA(isA<AssertionError>()),
      );
    });
  });

  group('ColorHelpers.darken', () {
    test('darkens color by specified amount', () {
      final result = ColorHelpers.darken(AppColors.brandSecondary, 0.5);
      expect(ColorHelpers.isLight(result), isFalse);
      expect(result, isNot(AppColors.brandSecondary));
      expect(result, isNot(Colors.black));
    });

    test('returns black when amount is 1.0', () {
      final result = ColorHelpers.darken(AppColors.brandSecondary, 1.0);
      expect(result, Colors.black);
    });

    test('returns original color when amount is 0.0', () {
      final result = ColorHelpers.darken(AppColors.brandSecondary, 0.0);
      expect(result, AppColors.brandSecondary);
    });

    test('throws assertion error for amount < 0', () {
      expect(
        () => ColorHelpers.darken(AppColors.brandPrimary, -0.1),
        throwsA(isA<AssertionError>()),
      );
    });

    test('throws assertion error for amount > 1', () {
      expect(
        () => ColorHelpers.darken(AppColors.brandPrimary, 1.1),
        throwsA(isA<AssertionError>()),
      );
    });
  });
}
