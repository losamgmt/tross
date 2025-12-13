/// Test helper extensions for WidgetTester
/// Provides reusable utilities for widget testing without platform dependencies
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Extension methods for WidgetTester to simplify common test operations
extension WidgetTesterExtensions on WidgetTester {
  /// Pumps a widget wrapped in MaterialApp with theme support
  ///
  /// This is the standard way to test widgets in isolation without
  /// requiring platform plugins or system-level dependencies.
  ///
  /// Example:
  /// ```dart
  /// await tester.pumpTestWidget(MyWidget());
  /// ```
  Future<void> pumpTestWidget(
    Widget widget, {
    ThemeData? theme,
    NavigatorObserver? navigatorObserver,
    Locale? locale,
  }) async {
    await pumpWidget(
      MaterialApp(
        theme: theme,
        locale: locale,
        navigatorObservers: navigatorObserver != null
            ? [navigatorObserver]
            : [],
        home: Scaffold(body: widget),
      ),
    );
  }

  /// Pumps a widget with theme context (spacing, colors, etc.)
  /// without full MaterialApp scaffolding
  Future<void> pumpWidgetWithTheme(Widget widget, {ThemeData? theme}) async {
    await pumpWidget(MaterialApp(theme: theme, home: widget));
  }

  /// Pumps a widget and settles all animations
  /// Useful for async operations that need to complete
  Future<void> pumpTestWidgetAndSettle(
    Widget widget, {
    ThemeData? theme,
    Duration? timeout,
  }) async {
    await pumpTestWidget(widget, theme: theme);
    await pumpAndSettle(timeout ?? const Duration(seconds: 10));
  }

  /// Finds a widget by its text content
  /// More readable alias for find.text()
  Finder findText(String text) => find.text(text);

  /// Finds a widget by its type
  /// More readable alias for find.byType()
  Finder findWidgetByType<T extends Widget>() => find.byType(T);

  /// Finds a widget by its key
  /// More readable alias for find.byKey()
  Finder findByKey(Key key) => find.byKey(key);

  /// Taps a widget and settles
  Future<void> tapAndSettle(Finder finder) async {
    await tap(finder);
    await pumpAndSettle();
  }

  /// Enters text and settles
  Future<void> enterTextAndSettle(Finder finder, String text) async {
    await enterText(finder, text);
    await pumpAndSettle();
  }
}
