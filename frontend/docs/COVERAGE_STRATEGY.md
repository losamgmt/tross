# Coverage Strategy: Path to 80%+

## Current State Analysis (74.78%)

| Metric | Value |
|--------|-------|
| Total Lines | 10,181 |
| Covered Lines | 7,613 |
| Uncovered Lines | 2,568 |
| Current Coverage | 74.78% |

### Uncovered Lines by Category

| Category | Uncovered | Files | Priority |
|----------|-----------|-------|----------|
| SERVICES | 933 | 26 | 🔴 HIGH |
| WIDGETS | 865 | 61 | 🔴 HIGH |
| PROVIDERS | 284 | 7 | 🟡 MEDIUM |
| SCREENS | 215 | 5 | 🟡 MEDIUM |
| UTILS | 159 | 12 | 🟢 LOW |
| OTHER | 112 | 22 | 🟢 LOW |

### Top 15 Coverage Gaps

| File | Uncovered | Total | % Gap |
|------|-----------|-------|-------|
| `nav_menu_builder.dart` | 148 | 201 | 74% |
| `auth_service.dart` | 138 | 199 | 69% |
| `generic_table_action_builders.dart` | 114 | 152 | 75% |
| `data_table.dart` | 102 | 279 | 37% |
| `admin_screen.dart` | 89 | 144 | 62% |
| `auth_provider.dart` | 87 | 135 | 64% |
| `file_service.dart` | 85 | 99 | 86% |
| `dashboard_provider.dart` | 84 | 97 | 87% |
| `adaptive_shell.dart` | 78 | 194 | 40% |
| `form_field.dart` | 75 | 203 | 37% |
| `auth_profile_service.dart` | 75 | 82 | 91% |
| `entity_detail_screen.dart` | 68 | 139 | 49% |
| `preferences_provider.dart` | 68 | 99 | 69% |
| `entity_metadata.dart` | 59 | 93 | 63% |

---

## Coverage Targets

| Target | Lines Needed | Delta from Current |
|--------|-------------|-------------------|
| 75% | 7,636 | +23 lines |
| 77% | 7,839 | +226 lines |
| 80% | 8,145 | +532 lines |
| 85% | 8,654 | +1,041 lines |

---

## Architectural Analysis

### Existing Infrastructure Strengths

1. **Factory Pattern** (`test/factory/`)
   - `EntityTestRegistry` - 11 entities with metadata
   - `EntityDataGenerator` - Fluent test data generation
   - `allKnownEntities` - Centralized entity list

2. **Scenario Tests** (`test/scenarios/`)
   - 14 factory-driven tests with ZERO per-entity code
   - Pattern: Loop over `allKnownEntities`, generate tests

3. **Service Test Contract** (`test/templates/service_test_contract.dart`)
   - `serviceConstructionTests()` - DI verification
   - `verifyMethodSignature()` - API contract
   - `serviceSuccessTest()` / `serviceErrorTest()` - AAA pattern

4. **Mock Infrastructure** (`test/mocks/`)
   - `MockApiClient` with fluent mocking
   - `MockAuthProvider` with role simulation

### Infrastructure Gaps

| Gap | Impact | Solution |
|-----|--------|----------|
| No provider test contract | PROVIDERS have 284 uncovered | Create `ProviderTestContract` |
| No screen test generator | SCREENS have 215 uncovered | Extend scenario pattern |
| Existing tests don't cover branches | Many files have tests but gaps | Add edge case scenarios |
| Auth-related code untestable | 300+ lines in auth stack | `coverage:ignore-file` or mock deeper |

---

## Strategic Approach: 3-Phase Plan

### Phase 1: Quick Win to 75% (+23 lines)
**Strategy**: Target smallest gaps in already-tested files

Files where adding 1-2 test cases covers 5-10 more lines:
- `app_config.dart` - 10 uncovered, partially tested
- `permission.dart` - 7 uncovered, partially tested  
- `loading_indicator.dart` - 27 uncovered, no edge cases tested

### Phase 2: Service Coverage Blitz (+400 lines → 78%)
**Strategy**: Apply ServiceTestContract pattern to all services

Top service targets:
1. `nav_menu_builder.dart` - 148 uncovered, has test but missing branches
2. `auth_service.dart` - 138 uncovered, security-focused tests only
3. `generic_table_action_builders.dart` - 114 uncovered, NO TESTS
4. `file_service.dart` - 85 uncovered, basic test exists
5. `entity_metadata.dart` - 59 uncovered, scenario test exists but gaps

### Phase 3: Widget/Screen Factory Tests (+130 lines → 80%)
**Strategy**: Extend scenario pattern to widgets

Create factory-generated widget tests for:
- `data_table.dart` - Already has scenario test, needs edge cases
- `form_field.dart` - Needs comprehensive field type tests
- `adaptive_shell.dart` - Needs responsive/auth state tests
- `admin_screen.dart` - Needs permission-based rendering tests

---

## Implementation Patterns

### Pattern 1: Branch Coverage Scenario

```dart
/// Extends existing tests with branch coverage
group('Edge Cases', () {
  for (final scenario in [
    {'input': null, 'expected': 'default'},
    {'input': '', 'expected': 'empty'},
    {'input': 'value', 'expected': 'value'},
  ]) {
    test('handles ${scenario['input']}', () {
      // Test branch
    });
  }
});
```

### Pattern 2: Provider Test Contract

```dart
void providerConstructionTests<T extends ChangeNotifier>(
  T Function() createProvider,
) {
  group('Construction', () {
    test('can be constructed', () {
      final provider = createProvider();
      expect(provider, isNotNull);
    });
    
    test('has initial state', () {
      final provider = createProvider();
      // Verify initial state
    });
  });
  
  group('Lifecycle', () {
    test('disposes cleanly', () {
      final provider = createProvider();
      expect(() => provider.dispose(), returnsNormally);
    });
  });
}
```

### Pattern 3: Screen Scenario Factory

```dart
for (final entityName in allKnownEntities) {
  testWidgets('$entityName detail screen renders', (tester) async {
    final testData = entityName.testData();
    await pumpDetailScreen(tester, entityName, testData);
    
    // Verify entity-specific fields render
    for (final field in EntityMetadataRegistry.getFields(entityName)) {
      expect(find.text(field.label), findsOneWidget);
    }
  });
}
```

---

## Files to Exclude from Coverage

Add `// coverage:ignore-file` to truly untestable files:

| File | Reason |
|------|--------|
| `auth0_*.dart` | Platform-specific browser code |
| `*_stub.dart` | Conditional import stubs |

---

## Execution Priority

1. ✅ **Immediate** (5 min): Hit 75% with 1-2 quick tests
2. 🔜 **Today**: Create `generic_table_action_builders_test.dart` (+114 lines)
3. 🔜 **Today**: Enhance `nav_menu_builder_strategy_test.dart` (+100 lines)
4. 📅 **This Week**: Provider test contract + apply to all providers (+200 lines)
5. 📅 **This Week**: Screen scenario factory (+150 lines)

---

## Metrics Tracking

Track progress with:
```bash
flutter test --coverage && \
awk '/^LF:/{t+=$2}/^LH:/{h+=$2}END{printf "%.2f%% (%d/%d)\n",h/t*100,h,t}' coverage/lcov.info
```
