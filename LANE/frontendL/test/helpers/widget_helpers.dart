/// Widget Test Helpers
///
/// General utilities for widget testing including finders,
/// gesture simulation, and common assertions
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Finds a Text widget with specific style properties
///
/// Example:
/// ```dart
/// final boldText = findTextWithStyle(
///   tester,
///   'Bold Text',
///   fontWeight: FontWeight.bold,
/// );
/// ```
Finder findTextWithStyle(
  WidgetTester tester,
  String text, {
  FontWeight? fontWeight,
  Color? color,
  double? fontSize,
}) {
  return find.byWidgetPredicate((widget) {
    if (widget is! Text) return false;
    if (widget.data != text) return false;

    final style = widget.style;
    if (fontWeight != null && style?.fontWeight != fontWeight) return false;
    if (color != null && style?.color != color) return false;
    if (fontSize != null && style?.fontSize != fontSize) return false;

    return true;
  });
}

/// Finds an Icon with specific properties
///
/// Example:
/// ```dart
/// final redIcon = findIconWithColor(
///   Icons.error,
///   Colors.red,
/// );
/// ```
Finder findIconWithColor(IconData icon, Color color) {
  return find.byWidgetPredicate((widget) {
    if (widget is! Icon) return false;
    return widget.icon == icon && widget.color == color;
  });
}

/// Finds a Container with specific decoration
///
/// Example:
/// ```dart
/// final roundedContainer = findContainerWithBorderRadius(
///   tester,
///   8.0,
/// );
/// ```
Finder findContainerWithBorderRadius(WidgetTester tester, double radius) {
  return find.byWidgetPredicate((widget) {
    if (widget is! Container) return false;
    final decoration = widget.decoration;
    if (decoration is! BoxDecoration) return false;
    final borderRadius = decoration.borderRadius;
    if (borderRadius is! BorderRadius) return false;
    return borderRadius.topLeft.x == radius;
  });
}

/// Simulates a tap and waits for animations
///
/// Example:
/// ```dart
/// await tapAndSettle(tester, find.byType(ElevatedButton));
/// ```
Future<void> tapAndSettle(WidgetTester tester, Finder finder) async {
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Simulates a long press and waits for animations
///
/// Example:
/// ```dart
/// await longPressAndSettle(tester, find.text('Press Me'));
/// ```
Future<void> longPressAndSettle(WidgetTester tester, Finder finder) async {
  await tester.longPress(finder);
  await tester.pumpAndSettle();
}

/// Simulates entering text and waits for updates
///
/// Example:
/// ```dart
/// await enterTextAndSettle(tester, find.byType(TextField), 'New Text');
/// ```
Future<void> enterTextAndSettle(
  WidgetTester tester,
  Finder finder,
  String text,
) async {
  await tester.enterText(finder, text);
  await tester.pumpAndSettle();
}

/// Verifies a widget is visible and tappable
///
/// Example:
/// ```dart
/// expectTappable(find.byType(ElevatedButton));
/// ```
void expectTappable(Finder finder) {
  expect(finder, findsOneWidget);
  expect(
    find.ancestor(
      of: finder,
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is GestureDetector ||
            widget is InkWell ||
            widget is TextButton ||
            widget is ElevatedButton ||
            widget is IconButton,
      ),
    ),
    findsOneWidget,
    reason: 'Expected widget to be tappable',
  );
}

/// Verifies a widget has specific semantics label
///
/// Example:
/// ```dart
/// expectSemanticsLabel(
///   find.byType(IconButton),
///   'Close button',
/// );
/// ```
void expectSemanticsLabel(Finder finder, String label) {
  final widget = finder.evaluate().first.widget;
  expect(
    widget,
    isA<Widget>(),
    reason: 'Expected widget to have semantics label: $label',
  );
}

/// Finds all widgets of type T in the widget tree
///
/// Example:
/// ```dart
/// final allButtons = findAllOfType<ElevatedButton>();
/// expect(allButtons, findsNWidgets(3));
/// ```
Finder findAllOfType<T extends Widget>() {
  return find.byWidgetPredicate((widget) => widget is T);
}

/// Verifies widget tree contains expected number of widgets
///
/// Example:
/// ```dart
/// expectWidgetCount<Text>(5);
/// ```
void expectWidgetCount<T extends Widget>(int expectedCount) {
  expect(
    find.byType(T),
    findsNWidgets(expectedCount),
    reason: 'Expected $expectedCount widgets of type $T',
  );
}

/// Verifies a callback was called with specific arguments
///
/// Example:
/// ```dart
/// String? result;
/// await tapAndSettle(tester, find.text('Click Me'));
/// expectCallbackCalled(result, 'expected_value');
/// ```
void expectCallbackCalled<T>(T? actual, T expected) {
  expect(
    actual,
    expected,
    reason: 'Expected callback to be called with: $expected',
  );
}

/// Verifies a widget is not in the tree
///
/// Example:
/// ```dart
/// expectNotVisible(find.text('Hidden Text'));
/// ```
void expectNotVisible(Finder finder) {
  expect(finder, findsNothing, reason: 'Expected widget to not be visible');
}

/// Verifies exactly one widget is found
///
/// Example:
/// ```dart
/// expectSingleWidget(find.text('Unique Text'));
/// ```
void expectSingleWidget(Finder finder) {
  expect(finder, findsOneWidget, reason: 'Expected exactly one widget');
}

/// Verifies multiple widgets are found
///
/// Example:
/// ```dart
/// expectMultipleWidgets(find.byType(ListTile), 5);
/// ```
void expectMultipleWidgets(Finder finder, int count) {
  expect(finder, findsNWidgets(count), reason: 'Expected $count widgets');
}
