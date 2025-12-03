/// Test Harness - Reusable Widget Testing Utilities
///
/// Provides standardized setup for widget tests with Material theme,
/// MediaQuery, and navigation context. Reduces boilerplate in tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pumps a widget wrapped in MaterialApp with proper test environment
///
/// Provides:
/// - MaterialApp context
/// - Scaffold for proper Material styling
/// - Home route for navigation testing
/// - Consistent theme across all tests
///
/// Example:
/// ```dart
/// await pumpTestWidget(
///   tester,
///   const MyWidget(),
/// );
/// ```
Future<void> pumpTestWidget(
  WidgetTester tester,
  Widget child, {
  ThemeData? theme,
  NavigatorObserver? navigatorObserver,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme,
      navigatorObservers: navigatorObserver != null ? [navigatorObserver] : [],
      home: Scaffold(body: child),
    ),
  );
}

/// Pumps a widget with explicit MediaQuery settings
///
/// Useful for testing responsive behavior and text scaling
///
/// Example:
/// ```dart
/// await pumpTestWidgetWithMediaQuery(
///   tester,
///   const MyWidget(),
///   textScaleFactor: 1.5,
/// );
/// ```
Future<void> pumpTestWidgetWithMediaQuery(
  WidgetTester tester,
  Widget child, {
  double textScaleFactor = 1.0,
  Size? size,
  ThemeData? theme,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme,
      home: MediaQuery(
        data: MediaQueryData(
          textScaler: TextScaler.linear(textScaleFactor),
          size: size ?? const Size(800, 600),
        ),
        child: Scaffold(body: child),
      ),
    ),
  );
}

/// Pumps a widget multiple times to complete animations
///
/// Useful for testing animated components
///
/// Example:
/// ```dart
/// await pumpAndSettleWidget(
///   tester,
///   const AnimatedWidget(),
/// );
/// ```
Future<void> pumpAndSettleWidget(
  WidgetTester tester,
  Widget child, {
  ThemeData? theme,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme,
      home: Scaffold(body: child),
    ),
  );
  await tester.pumpAndSettle();
}

/// Finds a widget by type within a specific ancestor
///
/// Useful for finding nested widgets in complex hierarchies
///
/// Example:
/// ```dart
/// final container = findWidgetInAncestor<Container>(
///   tester,
///   ancestorType: Row,
///   descendantFinder: find.text('Label'),
/// );
/// ```
T findWidgetInAncestor<T extends Widget>(
  WidgetTester tester, {
  required Type ancestorType,
  required Finder descendantFinder,
}) {
  return tester.widget<T>(
    find.ancestor(of: descendantFinder, matching: find.byType(ancestorType)),
  );
}

/// Verifies widget has specific padding
///
/// Example:
/// ```dart
/// expectWidgetPadding(
///   tester,
///   find.text('Label'),
///   const EdgeInsets.all(8.0),
/// );
/// ```
void expectWidgetPadding(
  WidgetTester tester,
  Finder finder,
  EdgeInsetsGeometry expectedPadding,
) {
  final padding = tester.widget<Padding>(
    find.ancestor(of: finder, matching: find.byType(Padding)),
  );
  expect(padding.padding, expectedPadding);
}

/// Verifies Container has specific padding
///
/// Example:
/// ```dart
/// expectContainerPadding(
///   tester,
///   find.text('Label'),
///   const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
/// );
/// ```
void expectContainerPadding(
  WidgetTester tester,
  Finder finder,
  EdgeInsetsGeometry expectedPadding,
) {
  final container = tester.widget<Container>(
    find.ancestor(of: finder, matching: find.byType(Container)),
  );
  expect(container.padding, expectedPadding);
}
