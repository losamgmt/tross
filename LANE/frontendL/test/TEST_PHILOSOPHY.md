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

## Migration Plan

### Phase 1: Identify Violations (CURRENT)
- Audit all tests for anti-patterns
- Mark files with `// TODO: Remove implementation detail assertions`
- Document specific violations

### Phase 2: Refactor High-Value Tests
- Organism tests (affects multiple features)
- Integration tests (user journeys)
- Critical path tests (auth, data mutations)

### Phase 3: Update Test Templates
- Add this philosophy to test generation
- Update test helpers to discourage anti-patterns
- Add linting rules if possible

## Violations Identified

### Critical (Blocking refactors)
- ✅ `test/widgets/organisms/data_table_test.dart` - Lines 104-115 (duplicate header assertions)
- ✅ `test/widgets/organisms/data_table_test.dart` - Lines 140-150 (exact widget count)
- ⚠️ `test/widgets/molecules/layout/layer_stack_test.dart` - Line 27 (Container count)

### Medium (Brittle but not blocking)
- 43 exact sizing assertions across test suite
- 693 widget finder assertions (many legitimate, need review)

### Low (Cosmetic)
- Tests checking text styles
- Tests checking theme colors
- Tests checking widget alignment details

## Next Steps
1. Fix data_table_test.dart to test BEHAVIOR not structure
2. Add behavior-focused test helpers
3. Update test templates
4. Gradually refactor remaining tests
