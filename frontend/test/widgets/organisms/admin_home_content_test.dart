/// AdminHomeContent Tests
///
/// Tests the AdminHomeContent organism that composes admin panels.
/// Validates: platform health, active sessions, maintenance mode panels.
///
/// **PATTERN:** Follows DashboardContent testing pattern
/// **USES GENERIC WIDGETS:** Tests TitledCard, AsyncDataProvider composition
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/widgets/organisms/admin_home_content.dart';
import '../../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;

  setUp(() {
    mockApiClient = MockApiClient();

    // Mock health endpoint
    mockApiClient.mockResponse('/health/databases', {
      'data': {
        'databases': [
          {
            'status': 'connected',
            'name': 'PostgreSQL',
            'responseTime': 5,
            'poolUsage': '2/10',
          },
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

  tearDown(() {
    mockApiClient.reset();
  });

  /// Helper to pump and let futures resolve
  Future<void> pumpUntilReady(WidgetTester tester) async {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
  }

  Widget createTestWidget() {
    return MaterialApp(
      home: Scaffold(
        body: Provider<ApiClient>.value(
          value: mockApiClient,
          child: const AdminHomeContent(),
        ),
      ),
    );
  }

  group('AdminHomeContent Organism', () {
    group('Basic Structure', () {
      testWidgets('renders without crashing', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(tester.takeException(), isNull);
      });

      testWidgets('has scrollable content', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.byType(SingleChildScrollView), findsWidgets);
      });

      testWidgets('uses Column for vertical layout', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.byType(Column), findsWidgets);
      });
    });

    group('Platform Health Panel', () {
      testWidgets('displays Platform Health title', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.text('Platform Health'), findsOneWidget);
      });

      testWidgets('shows database status when loaded', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        // Look for status-related elements
        expect(find.text('Status'), findsWidgets);
        expect(find.text('Database'), findsWidgets);
      });
    });

    group('Active Sessions Panel', () {
      testWidgets('displays Active Sessions title', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.text('Active Sessions'), findsOneWidget);
      });

      testWidgets('sessions panel renders without crashing', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        // Verify sessions panel loads - exact content depends on API response
        expect(find.text('Active Sessions'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    });

    group('Maintenance Mode Panel', () {
      testWidgets('displays Maintenance Mode title', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.text('Maintenance Mode'), findsOneWidget);
      });

      testWidgets('shows maintenance toggle', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        // Look for switch/toggle widget
        expect(find.byType(Switch), findsWidgets);
      });
    });

    group('Loading States', () {
      testWidgets('renders async providers for data loading', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump(); // Initial pump only

        // AsyncDataProvider handles loading state internally
        // Just verify the widget tree renders without error
        expect(tester.takeException(), isNull);
      });
    });

    group('Error States', () {
      testWidgets('handles API errors gracefully', (tester) async {
        // Configure mock to return error status
        mockApiClient.mockStatusCode('/health/databases', 500, {
          'error': 'Server error',
        });

        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        // Should show error card or message - widget shouldn't crash
        expect(tester.takeException(), isNull);
      });
    });

    group('Panel Composition', () {
      testWidgets('has all three panels', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        expect(find.text('Platform Health'), findsOneWidget);
        expect(find.text('Active Sessions'), findsOneWidget);
        expect(find.text('Maintenance Mode'), findsOneWidget);
      });

      testWidgets('panels are properly spaced', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await pumpUntilReady(tester);

        // SizedBox widgets used for spacing between panels
        expect(find.byType(SizedBox), findsWidgets);
      });
    });
  });
}
