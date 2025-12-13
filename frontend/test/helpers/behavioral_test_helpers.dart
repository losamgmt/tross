/// Behavioral Test Helpers - Test WHAT not HOW
///
/// These helpers encourage testing observable behavior over implementation:
/// - User can see X → find.text exists
/// - User can tap X → callback fires
/// - User sees feedback → state changes appropriately
///
/// Anti-patterns these helpers help AVOID:
/// - ❌ Widget count assertions (findsNWidgets)
/// - ❌ Exact pixel/size assertions
/// - ❌ Internal widget structure (find.descendant chains)
/// - ❌ Implementation details (testing Padding, Container, etc.)
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// =============================================================================
// BEHAVIORAL FINDERS - Find by what user sees, not by implementation
// =============================================================================

/// Finds any widget displaying the given text (flexible - doesn't care about count)
///
/// ✅ GOOD: Use when you care that text IS visible, not HOW MANY times
/// ❌ BAD: findsOneWidget - breaks on sticky headers, overlays, etc.
Finder findTextExists(String text) => find.text(text);

/// Asserts text is visible to user (exists in widget tree)
///
/// Example:
/// ```dart
/// assertTextVisible('Welcome, John!');
/// ```
void assertTextVisible(String text) {
  expect(
    find.text(text),
    findsWidgets,
    reason: 'Expected "$text" to be visible',
  );
}

/// Asserts text is NOT visible to user
void assertTextNotVisible(String text) {
  expect(
    find.text(text),
    findsNothing,
    reason: 'Expected "$text" to NOT be visible',
  );
}

/// Asserts an icon is visible
void assertIconVisible(IconData icon) {
  expect(
    find.byIcon(icon),
    findsWidgets,
    reason: 'Expected icon ${icon.codePoint} to be visible',
  );
}

/// Asserts widget type exists (doesn't care about count)
void assertWidgetExists<T extends Widget>() {
  expect(
    find.byType(T),
    findsWidgets,
    reason: 'Expected ${T.runtimeType} widget to exist',
  );
}

// =============================================================================
// BEHAVIORAL INTERACTIONS - Test user actions and their effects
// =============================================================================

/// Taps a button with the given label and pumps
///
/// Example:
/// ```dart
/// await tapButtonWithLabel(tester, 'Save');
/// expect(saveCalled, isTrue);
/// ```
Future<void> tapButtonWithLabel(WidgetTester tester, String label) async {
  final button = find.text(label);
  expect(button, findsWidgets, reason: 'Button "$label" should exist');
  await tester.tap(button.first);
  await tester.pump();
}

/// Taps an icon button and pumps
Future<void> tapIconButton(WidgetTester tester, IconData icon) async {
  final button = find.byIcon(icon);
  expect(button, findsWidgets, reason: 'Icon button should exist');
  await tester.tap(button.first);
  await tester.pump();
}

/// Enters text in a text field and pumps
///
/// Example:
/// ```dart
/// await enterTextInField(tester, 'Email', 'test@example.com');
/// ```
Future<void> enterTextInField(
  WidgetTester tester,
  String fieldLabel,
  String text,
) async {
  // Find TextField by looking for TextFormField or TextField
  final textField = find.byType(TextField);
  expect(textField, findsWidgets, reason: 'TextField should exist');
  await tester.enterText(textField.first, text);
  await tester.pump();
}

// =============================================================================
// STATE ASSERTIONS - Test outcomes, not implementation
// =============================================================================

/// Asserts a callback was called
///
/// Example:
/// ```dart
/// bool saveCalled = false;
/// // ... pump widget with onSave: () => saveCalled = true
/// await tapButtonWithLabel(tester, 'Save');
/// assertCallbackCalled(saveCalled, 'onSave');
/// ```
void assertCallbackCalled(bool called, String callbackName) {
  expect(called, isTrue, reason: '$callbackName should have been called');
}

/// Asserts a callback was NOT called
void assertCallbackNotCalled(bool called, String callbackName) {
  expect(called, isFalse, reason: '$callbackName should NOT have been called');
}

/// Asserts a value was received by callback
///
/// Example:
/// ```dart
/// String? receivedValue;
/// // ... pump widget with onSubmit: (v) => receivedValue = v
/// assertCallbackReceivedValue(receivedValue, 'test input', 'onSubmit');
/// ```
void assertCallbackReceivedValue<T>(
  T? received,
  T expected,
  String callbackName,
) {
  expect(
    received,
    equals(expected),
    reason: '$callbackName should have received $expected',
  );
}

// =============================================================================
// LOADING/ERROR STATE ASSERTIONS - Test user-facing states
// =============================================================================

/// Asserts loading indicator is visible
void assertLoadingVisible(WidgetTester tester) {
  // Check for common loading indicators
  final hasCircular = find
      .byType(CircularProgressIndicator)
      .evaluate()
      .isNotEmpty;
  final hasLinear = find.byType(LinearProgressIndicator).evaluate().isNotEmpty;
  final hasLoadingText = find.textContaining('Loading').evaluate().isNotEmpty;

  expect(
    hasCircular || hasLinear || hasLoadingText,
    isTrue,
    reason: 'Loading indicator should be visible',
  );
}

/// Asserts error message is visible (contains "error" or "failed")
void assertErrorVisible(WidgetTester tester) {
  final hasError = find
      .textContaining(
        RegExp(r'error|failed|Error|Failed', caseSensitive: false),
      )
      .evaluate()
      .isNotEmpty;
  expect(hasError, isTrue, reason: 'Error message should be visible');
}

// =============================================================================
// WIDGET CONFIG TESTING - Test that config values are displayed
// =============================================================================

/// Creates a standard test for: "given config X, widget displays X"
///
/// Example:
/// ```dart
/// testConfigDisplayed(
///   description: 'displays user name',
///   configValue: 'John Doe',
///   buildWidget: () => UserCard(name: 'John Doe'),
/// );
/// ```
void testConfigDisplayed({
  required String description,
  required String configValue,
  required Widget Function() buildWidget,
}) {
  testWidgets(description, (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: buildWidget())));
    assertTextVisible(configValue);
  });
}

// =============================================================================
// FLEXIBLE MATCHERS - Don't break on UI changes
// =============================================================================

/// Matcher that finds at least one widget (use instead of findsOneWidget)
const Matcher findsAtLeastOne = _FindsAtLeastN(1);

/// Matcher that finds at least N widgets
Matcher findsAtLeast(int n) => _FindsAtLeastN(n);

class _FindsAtLeastN extends Matcher {
  final int n;
  const _FindsAtLeastN(this.n);

  @override
  bool matches(dynamic item, Map<dynamic, dynamic> matchState) {
    return (item as Finder).evaluate().length >= n;
  }

  @override
  Description describe(Description description) {
    return description.add('finds at least $n widget(s)');
  }
}
