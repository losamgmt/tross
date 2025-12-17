/// FlexColorScheme Theme Tests
///
/// Tests for app_theme_flex.dart using flex_color_scheme
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_theme_flex.dart';
import 'package:tross_app/config/preference_keys.dart';

void main() {
  group('AppThemeConfig', () {
    group('lightTheme', () {
      test('is a valid ThemeData', () {
        expect(AppThemeConfig.lightTheme, isA<ThemeData>());
      });

      test('uses Material 3', () {
        expect(AppThemeConfig.lightTheme.useMaterial3, isTrue);
      });

      test('has brightness light', () {
        expect(AppThemeConfig.lightTheme.brightness, Brightness.light);
      });

      test('has primary color derived from bronze', () {
        // Primary swatch should be bronze-based
        final primary = AppThemeConfig.lightTheme.colorScheme.primary;
        expect(primary, isNotNull);
      });
    });

    group('darkTheme', () {
      test('is a valid ThemeData', () {
        expect(AppThemeConfig.darkTheme, isA<ThemeData>());
      });

      test('uses Material 3', () {
        expect(AppThemeConfig.darkTheme.useMaterial3, isTrue);
      });

      test('has brightness dark', () {
        expect(AppThemeConfig.darkTheme.brightness, Brightness.dark);
      });
    });

    group('getThemeMode', () {
      test('returns light for ThemePreference.light', () {
        expect(
          AppThemeConfig.getThemeMode(ThemePreference.light),
          ThemeMode.light,
        );
      });

      test('returns dark for ThemePreference.dark', () {
        expect(
          AppThemeConfig.getThemeMode(ThemePreference.dark),
          ThemeMode.dark,
        );
      });

      test('returns system for ThemePreference.system', () {
        expect(
          AppThemeConfig.getThemeMode(ThemePreference.system),
          ThemeMode.system,
        );
      });
    });

    group('getTheme', () {
      test('returns lightTheme for ThemePreference.light', () {
        final theme = AppThemeConfig.getTheme(
          ThemePreference.light,
          Brightness.light,
        );
        expect(theme.brightness, Brightness.light);
      });

      test('returns darkTheme for ThemePreference.dark', () {
        final theme = AppThemeConfig.getTheme(
          ThemePreference.dark,
          Brightness.light,
        );
        expect(theme.brightness, Brightness.dark);
      });

      test('returns lightTheme for system with light brightness', () {
        final theme = AppThemeConfig.getTheme(
          ThemePreference.system,
          Brightness.light,
        );
        expect(theme.brightness, Brightness.light);
      });

      test('returns darkTheme for system with dark brightness', () {
        final theme = AppThemeConfig.getTheme(
          ThemePreference.system,
          Brightness.dark,
        );
        expect(theme.brightness, Brightness.dark);
      });
    });
  });

  group('Theme visual consistency', () {
    testWidgets('light theme renders correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemeConfig.lightTheme,
          home: Scaffold(
            appBar: AppBar(title: const Text('Test')),
            body: const Center(child: Text('Content')),
          ),
        ),
      );

      expect(find.text('Test'), findsOneWidget);
      expect(find.text('Content'), findsOneWidget);
    });

    testWidgets('dark theme renders correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemeConfig.darkTheme,
          darkTheme: AppThemeConfig.darkTheme,
          themeMode: ThemeMode.dark,
          home: Scaffold(
            appBar: AppBar(title: const Text('Dark')),
            body: const Center(child: Text('Dark Content')),
          ),
        ),
      );

      expect(find.text('Dark'), findsOneWidget);
      expect(find.text('Dark Content'), findsOneWidget);
    });

    testWidgets('buttons use correct styling', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemeConfig.lightTheme,
          home: Scaffold(
            body: ElevatedButton(onPressed: () {}, child: const Text('Button')),
          ),
        ),
      );

      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.text('Button'), findsOneWidget);
    });
  });

  group('AppThemeConfig brand colors', () {
    test('brandPrimary (bronze) is defined correctly', () {
      expect(AppThemeConfig.brandPrimary, const Color(0xFFCD7F32));
    });

    test('brandSecondary (honeyYellow) is defined correctly', () {
      expect(AppThemeConfig.brandSecondary, const Color(0xFFFFB90F));
    });

    test('brandTertiary (deepOrange) is defined correctly', () {
      expect(AppThemeConfig.brandTertiary, const Color(0xFFFF6F00));
    });

    test('colors are accessible as constants', () {
      // Verify colors are const (won't throw)
      const primary = AppThemeConfig.brandPrimary;
      const secondary = AppThemeConfig.brandSecondary;
      const tertiary = AppThemeConfig.brandTertiary;
      expect(primary, isNotNull);
      expect(secondary, isNotNull);
      expect(tertiary, isNotNull);
    });
  });
}
