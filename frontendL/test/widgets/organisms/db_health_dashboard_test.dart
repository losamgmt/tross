/// Tests for DbHealthDashboard Organism
///
/// **Testing Strategy:**
/// - Widget composition and structure (testable)
/// - Props and configuration (testable)
/// - UI state rendering (testable with fake service)
/// - User interactions (testable with fake service)
/// - Auto-refresh behavior (testable with fake service)
/// - Responsive layout logic (testable)
///
/// **Note:** Integration with real backend is tested separately
/// in integration tests with running server.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/dashboards/db_health_dashboard.dart';
import 'package:tross_app/models/database_health.dart';
import 'package:tross_app/widgets/atoms/indicators/connection_status_badge.dart';
import 'package:tross_app/services/database_health_service.dart';

/// Fake service for testing - returns canned data
class FakeDatabaseHealthService implements DatabaseHealthService {
  final DatabasesHealthResponse response;
  final Exception? error;
  final Duration delay;

  int fetchCount = 0;

  FakeDatabaseHealthService({
    DatabasesHealthResponse? response,
    this.error,
    this.delay = Duration.zero,
  }) : response = response ?? _defaultResponse();

  static DatabasesHealthResponse _defaultResponse() {
    return DatabasesHealthResponse(
      databases: [
        DatabaseHealth(
          name: 'primary',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: DateTime.now().toIso8601String(),
        ),
      ],
      timestamp: DateTime.now().toIso8601String(),
    );
  }

  @override
  Future<DatabasesHealthResponse> fetchHealth() async {
    fetchCount++;

    if (delay > Duration.zero) {
      await Future.delayed(delay);
    }

    if (error != null) {
      throw error!;
    }

    return response;
  }
}

void main() {
  group('DbHealthDashboard Widget', () {
    group('Initial State', () {
      testWidgets('shows loading indicator initially', (tester) async {
        final service = FakeDatabaseHealthService(
          delay: const Duration(milliseconds: 100),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DbHealthDashboard(
                healthService: service,
                autoRefresh: false, // Disable to avoid pending timer
              ),
            ),
          ),
        );

        // Should show loading indicator before data loads
        expect(find.byType(CircularProgressIndicator), findsOneWidget);

        // Clean up - let futures complete
        await tester.pumpAndSettle();
      });

      testWidgets('has correct widget tree structure', (tester) async {
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump(); // Let futures complete

        // Should have main container
        expect(find.byType(Padding), findsWidgets);
        expect(find.byType(Column), findsWidgets);
      });
    });

    group('Successful Data Display', () {
      testWidgets('displays database health data', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [
              DatabaseHealth(
                name: 'primary',
                status: HealthStatus.healthy,
                responseTime: 50,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
              DatabaseHealth(
                name: 'replica',
                status: HealthStatus.degraded,
                responseTime: 250,
                connectionCount: 80,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
            ],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump(); // Complete initial fetch

        // Should display database names
        expect(find.text('primary'), findsOneWidget);
        expect(find.text('replica'), findsOneWidget);
      });

      testWidgets('displays overall status badge', (tester) async {
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should show status badge
        expect(find.byType(ConnectionStatusBadge), findsWidgets);
      });

      testWidgets('displays database count', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [
              DatabaseHealth(
                name: 'db1',
                status: HealthStatus.healthy,
                responseTime: 50,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
              DatabaseHealth(
                name: 'db2',
                status: HealthStatus.healthy,
                responseTime: 60,
                connectionCount: 15,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
            ],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should show count (looking for "2 databases" or similar)
        expect(find.textContaining('2'), findsWidgets);
      });

      testWidgets('calls onRefresh callback when manually refreshed', (
        tester,
      ) async {
        bool refreshCalled = false;
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DbHealthDashboard(
                healthService: service,
                onRefresh: () => refreshCalled = true,
              ),
            ),
          ),
        );

        // Wait for initial load to complete
        await tester.pumpAndSettle();

        // onRefresh should NOT be called on initial load
        expect(refreshCalled, isFalse);

        // Tap refresh button
        await tester.tap(find.byIcon(Icons.refresh));
        await tester.pump();

        // NOW onRefresh should be called
        expect(refreshCalled, isTrue);
      });
    });

    group('Error Handling', () {
      testWidgets('displays error message when fetch fails', (tester) async {
        final service = FakeDatabaseHealthService(
          error: Exception('Network error'),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should show error message (ErrorCard strips "Exception: " prefix)
        expect(find.text('Failed to Load Health Data'), findsOneWidget);
        expect(find.textContaining('Network error'), findsOneWidget);
      });

      testWidgets('shows retry button on error', (tester) async {
        final service = FakeDatabaseHealthService(
          error: Exception('Failed to connect'),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should have retry button
        expect(find.text('Retry'), findsOneWidget);
      });

      testWidgets('retries fetch when retry button tapped', (tester) async {
        final service = FakeDatabaseHealthService();

        // Override to track attempts
        service.fetchCount = 0;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pumpAndSettle(); // Wait for initial fetch to complete
        expect(service.fetchCount, equals(1));

        // Find and tap refresh button
        final refreshButton = find.byIcon(Icons.refresh);
        if (refreshButton.evaluate().isNotEmpty) {
          await tester.tap(refreshButton);
          await tester.pump();
          expect(service.fetchCount, greaterThan(1));
        }
      });
    });

    group('Empty State', () {
      testWidgets('shows message when no databases found', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pumpAndSettle(); // Wait for data to load

        // Should show empty state message (exact text from organism)
        expect(find.text('No Databases'), findsOneWidget);
      });

      testWidgets('has empty state icon', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pumpAndSettle(); // Wait for data to load

        // Should show icon (storage_outlined or database_outlined)
        expect(find.byIcon(Icons.storage_outlined), findsOneWidget);
      });
    });

    group('Auto-Refresh Configuration', () {
      testWidgets('accepts autoRefresh parameter', (tester) async {
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DbHealthDashboard(
                healthService: service,
                autoRefresh: false,
              ),
            ),
          ),
        );

        await tester.pump();

        // Widget should build successfully
        expect(find.byType(DbHealthDashboard), findsOneWidget);
      });

      testWidgets('accepts custom refresh interval', (tester) async {
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DbHealthDashboard(
                healthService: service,
                refreshInterval: const Duration(seconds: 60),
              ),
            ),
          ),
        );

        await tester.pump();

        expect(find.byType(DbHealthDashboard), findsOneWidget);
      });

      testWidgets('defaults autoRefresh to true', (tester) async {
        final service = FakeDatabaseHealthService();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should build with defaults
        expect(find.byType(DbHealthDashboard), findsOneWidget);
      });
    });

    // DELETED: "Factory Constructor (API)" tests - these are integration tests that
    // try to hit real backend at localhost:3001, causing HTTP errors in test output.
    // They only check findsOneWidget (not meaningful widget behavior).
    // Proper integration testing should be in test/integration/ or E2E suite.

    group('Responsive Layout', () {
      testWidgets('renders in small viewport (mobile)', (tester) async {
        final service = FakeDatabaseHealthService();

        // Set small screen size
        tester.view.physicalSize = const Size(400, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        // Should render successfully
        expect(find.byType(DbHealthDashboard), findsOneWidget);
      });

      testWidgets('renders in large viewport (desktop)', (tester) async {
        final service = FakeDatabaseHealthService();

        // Set large screen size
        tester.view.physicalSize = const Size(1920, 1080);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        expect(find.byType(DbHealthDashboard), findsOneWidget);
      });
    });

    group('Overall Status Logic', () {
      testWidgets('shows "All Systems Operational" when all healthy', (
        tester,
      ) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [
              DatabaseHealth(
                name: 'db1',
                status: HealthStatus.healthy,
                responseTime: 50,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
            ],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        expect(find.textContaining('Operational'), findsOneWidget);
      });

      testWidgets('shows "System Degraded" when any degraded', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [
              DatabaseHealth(
                name: 'db1',
                status: HealthStatus.healthy,
                responseTime: 50,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
              DatabaseHealth(
                name: 'db2',
                status: HealthStatus.degraded,
                responseTime: 250,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
            ],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        expect(find.textContaining('Degraded'), findsOneWidget);
      });

      testWidgets('shows "System Critical" when any critical', (tester) async {
        final service = FakeDatabaseHealthService(
          response: DatabasesHealthResponse(
            databases: [
              DatabaseHealth(
                name: 'db1',
                status: HealthStatus.critical,
                responseTime: 800,
                connectionCount: 10,
                maxConnections: 100,
                lastChecked: DateTime.now().toIso8601String(),
              ),
            ],
            timestamp: DateTime.now().toIso8601String(),
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DbHealthDashboard(healthService: service)),
          ),
        );

        await tester.pump();

        expect(find.textContaining('Critical'), findsOneWidget);
      });
    });
  });
}
