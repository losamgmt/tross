# ADR 005: Testing Strategy & Coverage Approach

**Status:** Accepted  
**Decision Makers:** Development Team  
**Outcome:** Comprehensive Multi-Layer Testing with 90%+ Coverage Target

---

## Context

TrossApp needs a testing strategy that:

- Ensures code quality and reliability
- Catches bugs before production
- Supports rapid development with confidence
- Validates business logic, UI, and integrations
- Maintains high coverage without testing the framework

Flutter provides excellent testing tools, but we need a clear strategy for WHAT to test and HOW MUCH.

---

## Decision

**Use a multi-layer testing pyramid with pragmatic coverage targets.**

### Testing Layers

1. **Unit Tests** - Fast, isolated business logic
   - Providers (state management)
   - Services (API clients, auth logic)
   - Models (data validation)
   - Target: 100% coverage

2. **Widget Tests** - Component validation
   - Atoms (buttons, inputs, cards)
   - Molecules (forms, navigation bars)
   - Organisms (complex components)
   - Target: 90%+ coverage

3. **Integration Tests** - End-to-end user journeys
   - Complete workflows (login → dashboard → logout)
   - Multi-step interactions
   - Target: Critical paths covered

4. **Concurrent/Load Tests** - Performance validation
   - Multiple simultaneous operations
   - State consistency under load
   - Target: Key scenarios tested

### Coverage Philosophy

**Test what matters, not what's easy:**

- ✅ Business logic, state management, data flow
- ✅ User interactions and navigation
- ✅ Error handling and edge cases
- ❌ Flutter framework code (widgets, rendering)
- ❌ Third-party packages (trust but verify integration)

---

## Implementation

**Current Status:**

- 625 tests, all passing ✅
- ~99% coverage achieved
- Test execution: ~15 seconds

**Example Structure:**

```dart
// Unit test: Provider logic
test('AuthProvider logs in successfully', () async {
  when(mockAuthService.login(email, password))
    .thenAnswer((_) async => mockUser);

  await authProvider.login(email, password);

  expect(authProvider.isAuthenticated, true);
  expect(authProvider.user, mockUser);
});

// Widget test: Component
testWidgets('PrimaryButton shows loading state', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: PrimaryButton(
        text: 'Submit',
        onPressed: () {},
        isLoading: true,
      ),
    ),
  );

  expect(find.byType(CircularProgressIndicator), findsOneWidget);
  expect(find.text('Submit'), findsNothing);
});

// Integration test: E2E flow
testWidgets('User can complete login flow', (tester) async {
  await tester.pumpWidget(MyApp());

  // Navigate to login
  await tester.tap(find.text('Login'));
  await tester.pumpAndSettle();

  // Enter credentials
  await tester.enterText(find.byKey(Key('email')), 'test@example.com');
  await tester.enterText(find.byKey(Key('password')), 'password123');

  // Submit
  await tester.tap(find.text('Sign In'));
  await tester.pumpAndSettle();

  // Verify dashboard reached
  expect(find.text('Dashboard'), findsOneWidget);
});
```

---

## Alternatives Considered

### 1. **100% Coverage Mandate**

- ❌ Testing framework code wastes time
- ❌ False sense of security
- ❌ Slows development

### 2. **No Testing / Manual Only**

- ❌ Regression bugs
- ❌ Slow feedback loop
- ❌ Fear of refactoring

### 3. **E2E Tests Only**

- ❌ Slow execution
- ❌ Brittle, hard to debug
- ❌ Misses unit-level edge cases

**Our approach balances speed, coverage, and confidence.**

---

## Validation

**Metrics:**

- ✅ Comprehensive test coverage across all layers
- ✅ High code coverage (target: 90%+)
- ✅ Fast test execution
- ✅ Zero flaky tests
- ✅ 100% coverage on critical paths:
  - Authentication flows
  - Role-based access control
  - API error handling
  - State management

**Test Distribution:**

- Unit: ~400 tests (providers, services, models)
- Widget: ~200 tests (atomic design components)
- Integration: 13 tests (E2E journeys)
- Concurrent: 18 tests (load scenarios)

---

## Consequences

### Positive ✅

- High confidence in refactoring
- Fast feedback loop (15s)
- Catches bugs early
- Documents expected behavior

### Negative ❌

- Test maintenance overhead
- Slows initial feature development slightly

### Neutral ⚖️

- Coverage target is a guideline, not a rule
- Skip testing obvious getters/setters
- Focus on business value

---

## References

- [Flutter Testing Documentation](https://docs.flutter.dev/testing)
- Internal: `frontend/test/` (test suite)
- Internal: `frontend/coverage/COVERAGE_ANALYSIS.md` (detailed metrics)
