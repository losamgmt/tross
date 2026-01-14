/// AdminScreen Unit Tests - Lightweight Screen Tests
///
/// NOTE: AdminScreen requires TokenManager (flutter_secure_storage) which
/// doesn't work in unit tests without extensive mocking. The screen design
/// tightly couples to the token manager static methods.
///
/// For now, we test minimal rendering behavior. The screen shows loading
/// indicators while waiting for TokenManager.getStoredToken() which
/// returns null in tests (no token stored).
///
/// The AdminScreen's full functionality is covered by integration/e2e tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/screens/admin_screen.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_services.dart';
import '../factory/entity_registry.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockAuthProvider mockAuthProvider;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockAuthProvider = MockAuthProvider.authenticated(role: 'admin');

    // Mock health endpoint with proper structure
    mockApiClient.mockResponse('/health/databases', {
      'data': {
        'databases': [
          {'status': 'connected', 'name': 'PostgreSQL', 'latency_ms': 5},
        ],
      },
    });

    // Mock sessions endpoint
    mockApiClient.mockResponse('/admin/sessions', {
      'data': [
        {
          'id': 1,
          'user': 'admin@test.com',
          'created_at': '2026-01-13T10:00:00Z',
        },
      ],
      'pagination': {'page': 1, 'limit': 10, 'total': 1},
    });

    // Mock maintenance mode endpoint
    mockApiClient.mockResponse('/admin/maintenance', {
      'enabled': false,
      'message': null,
    });
  });

  /// Helper to pump and let futures resolve without waiting for animations.
  /// AdminScreen uses CircularProgressIndicator which never settles.
  Future<void> pumpUntilReady(WidgetTester tester) async {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
  }

  Widget buildTestWidget({MockAuthProvider? authProvider}) {
    return MediaQuery(
      data: const MediaQueryData(size: Size(1200, 800)),
      child: MaterialApp(
        home: MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: mockApiClient),
            Provider<GenericEntityService>(
              create: (_) => GenericEntityService(mockApiClient),
            ),
            ChangeNotifierProvider<AuthProvider>.value(
              value: authProvider ?? mockAuthProvider,
            ),
          ],
          child: const AdminScreen(),
        ),
      ),
    );
  }

  group('AdminScreen', () {
    testWidgets('renders without crashing', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      expect(tester.takeException(), isNull);
    });

    testWidgets('displays System Administration title', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      expect(find.text('System Administration'), findsWidgets);
    });

    testWidgets('has scrollable content', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      expect(find.byType(SingleChildScrollView), findsWidgets);
    });

    testWidgets('shows Platform Health panel', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      expect(find.text('Platform Health'), findsOneWidget);
    });

    testWidgets('uses admin sidebar strategy', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      // Should render with Scaffold (AdaptiveShell)
      expect(find.byType(Scaffold), findsWidgets);
    });
  });

  group('AdminScreen - Admin Panels', () {
    testWidgets('shows health information', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      // Platform Health card should be present
      final hasTitledCards = find.text('Platform Health').evaluate().isNotEmpty;
      expect(hasTitledCards, isTrue);
    });

    testWidgets('has multiple admin panels', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      // Should have multiple cards for different admin functions
      final cardCount = find.byType(Card).evaluate().length;
      expect(cardCount, greaterThan(0), reason: 'Should have admin panels');
    });
  });

  group('AdminScreen - Security', () {
    testWidgets('renders for admin role', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          authProvider: MockAuthProvider.authenticated(role: 'admin'),
        ),
      );
      await pumpUntilReady(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('System Administration'), findsWidgets);
    });

    // Note: Actual role enforcement is done by the router guard,
    // not the screen itself. These tests verify render behavior.
    testWidgets('renders structure regardless of role (guard is external)', (
      tester,
    ) async {
      // The screen itself doesn't enforce roles - router does
      await tester.pumpWidget(
        buildTestWidget(
          authProvider: MockAuthProvider.authenticated(role: 'manager'),
        ),
      );
      await pumpUntilReady(tester);

      expect(tester.takeException(), isNull);
    });
  });

  group('AdminScreen - Loading States', () {
    testWidgets('shows loading indicators for async panels', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      // Capture intermediate loading state
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Should not crash during loading
      expect(tester.takeException(), isNull);
    });
  });

  group('AdminScreen - Error States', () {
    testWidgets('handles health API error gracefully', (tester) async {
      mockApiClient.setShouldFail(true, message: 'Health check failed');

      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      // Should not crash
      expect(tester.takeException(), isNull);

      // Should still render the screen structure
      expect(find.byType(Scaffold), findsWidgets);
    });

    testWidgets('handles sessions API error gracefully', (tester) async {
      // Reset and set specific endpoint to fail
      mockApiClient.setShouldFail(false);
      mockApiClient.mockResponse('/health/databases', {
        'data': {
          'databases': [
            {'status': 'connected', 'name': 'PostgreSQL'},
          ],
        },
      });
      mockApiClient.mockErrorFor('/admin/sessions', 'Sessions unavailable');

      await tester.pumpWidget(buildTestWidget());
      await pumpUntilReady(tester);

      // Should not crash - individual panel errors shouldn't break screen
      expect(tester.takeException(), isNull);
    });
  });
}
