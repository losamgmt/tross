# Frontend Test Infrastructure

This directory contains the comprehensive test infrastructure for the TrossApp frontend, designed to mirror the backend's testing approach with centralized, reusable, and modular testing utilities.

## 🎯 Philosophy

**Zero Platform Dependencies**: All tests run without requiring system-level configuration (no Developer Mode, no symlinks, no platform-specific setup).

**Atomic & Composable**: Test utilities follow the same SRP-literal, generic, context-insensitive principles as our production code.

**DRY Testing**: Mock once, use everywhere. Build once, test everywhere.

## 📁 Directory Structure

```
test/
├── mocks/               # Mock services (auth, API, storage, connectivity)
├── helpers/             # Reusable test utilities (widget pumping, extensions)
├── fixtures/            # Test data builders and fixtures
├── widgets/             # Widget tests (atoms, molecules, organisms)
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── services/            # Service tests
├── providers/           # Provider tests
└── integration/         # Integration tests
```

## 🔧 Core Components

### 1. Widget Tester Extensions (`helpers/widget_tester_extensions.dart`)

Reusable methods for common widget testing operations:

```dart
import 'package:flutter_test/flutter_test.dart';
import '../../helpers/helpers.dart';  // Barrel file for all helpers

testWidgets('example test', (tester) async {
  // Pump a widget with MaterialApp wrapper
  await tester.pumpTestWidget(MyWidget());
  
  // Pump and wait for animations to settle
  await tester.pumpTestWidgetAndSettle(MyWidget());
  
  // Readable finders
  expect(tester.findText('Hello'), findsOneWidget);
  expect(tester.findWidgetByType<MyButton>(), findsOneWidget);
});
```

### 2. Mock Services (`mocks/mock_services.dart`)

Test doubles for services that normally require platform code:

```dart
import '../../mocks/mock_services.dart';
import '../../mocks/mock_api_client.dart';

// Mock secure storage
final storage = MockSecureStorage();
await storage.write(key: 'token', value: 'test123');
final token = await storage.read(key: 'token');

// Mock connectivity
final connectivity = MockConnectivityService();
connectivity.simulateDisconnect();
expect(connectivity.isConnected, false);

// Mock API client
final apiClient = MockApiClient();
apiClient.setResponse('/api/users', response: {'users': []});
```

### 3. Test Fixtures (`fixtures/test_data.dart`)

Builders for consistent test data:

```dart
import '../../fixtures/test_data.dart';

// Simple test data - uses TestData static methods
final user = TestData.user(email: 'test@example.com');
final users = TestData.userList(count: 5);
final response = TestData.apiResponse(data: users);
```

### 4. Test Helpers (`helpers/helpers.dart`)

Centralized barrel file + config and matchers:

```dart
import '../../helpers/helpers.dart';  // All helpers in one import

// Usage
await tester.pumpTestWidget(MyWidget());
final mockStorage = MockSecureStorage();
final testUser = TestData.user();

// Test config
const delay = TestConfig.animationDuration;

// Custom matchers
expect(result, TestMatchers.isNotEmptyString);
```

## 📝 Usage Guidelines

### Writing Widget Tests

**✅ DO:**
```dart
import 'package:flutter_test/flutter_test.dart';
import '../../helpers/helpers.dart';  // Barrel file

void main() {
  group('MyWidget Tests', () {
    testWidgets('renders correctly', (tester) async {
      await tester.pumpTestWidget(MyWidget());
      expect(tester.findText('Expected Text'), findsOneWidget);
    });
  });
}
```

**❌ DON'T:**
```dart
// Don't manually wrap in MaterialApp every time
await tester.pumpWidget(
  MaterialApp(home: Scaffold(body: MyWidget())),
);

// Don't use platform-dependent services directly in tests
final storage = FlutterSecureStorage(); // ❌ Requires platform code
```

### Mocking Services

**✅ DO:**
```dart
// Use dependency injection
class MyWidget extends StatelessWidget {
  final MockSecureStorage? storage; // Inject for testing
  
  const MyWidget({this.storage});
  
  @override
  Widget build(BuildContext context) {
    final actualStorage = storage ?? realStorageService;
    // Use actualStorage
  }
}

// In tests
testWidgets('test with mock', (tester) async {
  final mockStorage = MockSecureStorage();
  await tester.pumpTestWidget(MyWidget(storage: mockStorage));
});
```

**❌ DON'T:**
```dart
// Don't hard-code dependencies
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final storage = FlutterSecureStorage(); // ❌ Can't inject mock
  }
}
```

## 🚀 Running Tests

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/widgets/atoms/my_atom_test.dart

# Run tests with coverage
flutter test --coverage

# Run tests in a specific directory
flutter test test/widgets/organisms/

# Run with verbose output
flutter test --reporter=expanded
```

## 🎨 Test Patterns

### Pattern 1: Pure Widget Tests (No Dependencies)

```dart
testWidgets('atom renders correctly', (tester) async {
  await tester.pumpTestWidget(
    MyAtom(text: 'Test'),
  );
  
  expect(tester.findText('Test'), findsOneWidget);
});
```

### Pattern 2: Widget with Mock Dependencies

```dart
testWidgets('organism uses mock service', (tester) async {
  final mockClient = MockApiClient();
  mockClient.setResponse('/api/data', 
    response: {'data': []},
  );
  
  await tester.pumpTestWidget(
    MyOrganism(apiClient: mockClient),
  );
  
  await tester.pumpAndSettle();
});
```

### Pattern 3: Async State Testing

```dart
testWidgets('handles async data loading', (tester) async {
  await tester.pumpTestWidget(
    FutureBuilder<String>(
      future: Future.delayed(
        TestConfig.animationDuration,
        () => 'Loaded',
      ),
      builder: (context, snapshot) => 
        snapshot.hasData ? Text(snapshot.data!) : CircularProgressIndicator(),
    ),
  );
  
  // Initial state - loading
  expect(find.byType(CircularProgressIndicator), findsOneWidget);
  
  // After data loads
  await tester.pumpAndSettle();
  expect(find.text('Loaded'), findsOneWidget);
});
```

## 🔄 Migration from Old Tests

If you have existing tests that use platform dependencies:

1. **Replace platform services with mocks**:
   ```dart
   // Old
   final storage = FlutterSecureStorage();
   
   // New
   final storage = MockSecureStorage();
   ```

2. **Use widget tester extensions**:
   ```dart
   // Old
   await tester.pumpWidget(MaterialApp(home: Scaffold(body: MyWidget())));
   
   // New
   await tester.pumpTestWidget(MyWidget());
   ```

3. **Use test fixtures for data**:
   ```dart
   // Old
   final user = {'id': 1, 'email': 'test@example.com', ...};
   
   // New
   final user = TestData.user(email: 'test@example.com');
   ```

## 📚 Best Practices

1. **One import for all helpers**: `import '../../helpers/helpers.dart';`
2. **Use TestData for test fixtures**: `TestData.user(email: 'admin@example.com')`
3. **Mock at the boundary**: Mock services, not internal logic
4. **Test behavior, not implementation**: Focus on what users see/do
5. **Keep tests fast**: Use `TestConfig.animationDuration` for consistent timing
6. **Clean up resources**: Dispose controllers, close streams in `tearDown`

## 🎯 Goals Achieved

- ✅ **Zero platform dependencies** - Tests run anywhere, no system config needed
- ✅ **Centralized mocking** - Mirrors backend's approach
- ✅ **Reusable utilities** - DRY testing
- ✅ **Atomic design** - Test infrastructure follows same principles as production code
- ✅ **Fast & reliable** - No flaky tests from platform quirks

---

**Note**: This infrastructure makes tests independent of Flutter's platform channel system, meaning they'll run consistently across all environments without requiring Developer Mode, symlinks, or other system-level configuration.
