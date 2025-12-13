# Test Philosophy - Anti-Pattern Elimination

## Core Principle
**Tests should verify USER-FACING BEHAVIOR, not implementation details.**

## Anti-Patterns to ELIMINATE

### ❌ Anti-Pattern 1: Widget Count Assertions
```dart
// BAD - Breaks when UI structure changes
expect(find.text('Name'), findsOneWidget);
expect(find.byType(Container), findsNWidgets(2));

// GOOD - Tests actual behavior
expect(find.text('Name'), findsWidgets);  // It exists
final table = find.byType(DataTable);
expect(tester.widget<DataTable>(table).columns.length, 3);  // Data is correct
```

**Why it's bad:** Sticky headers, overlays, and composition patterns create duplicate widgets. Tests should NOT care.

### ❌ Anti-Pattern 2: Exact Sizing Assertions
```dart
// BAD - Breaks when spacing constants change
expect(sizedBox.width, 12.0);
expect(padding.left, 8.0);

// GOOD - Tests relative relationships
expect(sizedBox.width, greaterThan(0));  // Has space
expect(padding.left, equals(padding.right));  // Symmetric
```

**Why it's bad:** Spacing is a design decision. Tests should verify layout BEHAVIOR, not pixel perfection.

### ❌ Anti-Pattern 3: Internal Widget Structure
```dart
// BAD - Tests composition details
expect(find.descendant(of: find.byType(Card), matching: find.byType(Padding)), findsOneWidget);

// GOOD - Tests user-visible content
expect(find.text('User Details'), findsWidgets);
await tester.tap(find.text('Save'));
expect(saveCallbackCalled, isTrue);
```

## What TO Test ✅

### User Interactions
```dart
testWidgets('save button calls onSave callback', (tester) async {
  bool called = false;
  await tester.pumpWidget(MyForm(onSave: () => called = true));
  
  await tester.tap(find.text('Save'));
  expect(called, isTrue);
});
```

### Data Display
```dart
testWidgets('displays user data correctly', (tester) async {
  await tester.pumpWidget(UserProfile(user: testUser));
  
  expect(find.text(testUser.name), findsWidgets);
  expect(find.text(testUser.email), findsWidgets);
});
```

### State Changes
```dart
testWidgets('toggles between edit and view mode', (tester) async {
  await tester.pumpWidget(EditableField(value: 'test'));
  
  await tester.tap(find.byIcon(Icons.edit));
  expect(find.byType(TextField), findsWidgets);  // Edit mode active
});
```

### Error Handling
```dart
testWidgets('shows error message on validation failure', (tester) async {
  await tester.pumpWidget(LoginForm());
  
  await tester.tap(find.text('Submit'));
  expect(find.textContaining('required'), findsWidgets);
});
```

## Behavioral Test Helpers

We've created `behavioral_test_helpers.dart` with patterns that encourage good testing:

```dart
import '../../helpers/helpers.dart';

testWidgets('save button triggers callback', (tester) async {
  bool saveCalled = false;
  await pumpTestWidget(tester, MyForm(onSave: () => saveCalled = true));
  
  // Use behavioral helpers
  await tapButtonWithLabel(tester, 'Save');
  assertCallbackCalled(saveCalled, 'onSave');
});

testWidgets('displays user name from config', (tester) async {
  const userName = 'John Doe';
  await pumpTestWidget(tester, UserCard(name: userName));
  
  // Assert the config value is displayed (not hardcoded string)
  assertTextVisible(userName);
});
```

## String Literals: When They're OK vs NOT OK

### ✅ OK: Testing that config values are displayed
```dart
// The test provides the value, widget displays it
const testTitle = 'My Title';
await pumpTestWidget(tester, Card(title: testTitle));
expect(find.text(testTitle), findsWidgets);  // ✅ Tests config->display
```

### ❌ NOT OK: Hardcoding implementation UI strings
```dart
// Brittle - breaks if we change button label
expect(find.text('Developer Login'), findsOneWidget);  // ❌

// Better - use constants from the widget or accept brittleness
expect(find.text(AppConstants.devLoginButton), findsWidgets);  // ✅
```

## Migration Status

### ✅ Completed (Audit Fixes Applied)
- Created `behavioral_test_helpers.dart` with good patterns
- Documented philosophy and examples
- Established test infrastructure
- **Removed `findsNWidgets` from widget tests** (generic_form, detail_panel, data_table)
- **Migrated `login_screen_test.dart` to use AppConstants**
- **Added UI string constants to AppConstants** (devLoginCardTitle, etc.)
- **All 1,427 tests passing** (60% line coverage)

### 📋 Remaining Anti-Patterns (Low Priority)
Some tests still use:
- `findsOneWidget` where `findsWidgets` would be safer (acceptable in most cases)
- Hardcoded strings for test fixture values (acceptable - these ARE test values)
- Implementation detail assertions in design system tests (acceptable - testing config)

### 📋 Guidelines for New Tests
1. Use `findsWidgets` instead of `findsOneWidget` unless count matters
2. Test callbacks fire, not internal state
3. Use constants for UI strings when possible
4. Test user-visible behavior, not widget composition
5. Prefer `pumpTestWidget()` helper over raw `tester.pumpWidget(MaterialApp(...))`
6. Use `TestData` builders for test fixtures

