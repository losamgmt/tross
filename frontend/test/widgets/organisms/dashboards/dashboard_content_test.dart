/// Tests for DashboardContent Organism
///
/// **Testing Strategy:**
/// - Widget composition and structure (testable)
/// - Loading state rendering (testable)
/// - Error state rendering (testable)
/// - Stats display with mock provider (testable)
/// - Responsive layout behavior (testable)
///
/// **Note:** Integration with real backend is tested separately
/// in integration tests with running server.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/dashboard_provider.dart';
import 'package:tross_app/widgets/organisms/dashboard_content.dart';

/// Creates a widget wrapped with required providers
Widget createTestWidget({
  required DashboardProvider dashboardProvider,
  AuthProvider? authProvider,
}) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<DashboardProvider>.value(
          value: dashboardProvider,
        ),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => authProvider ?? AuthProvider(),
        ),
      ],
      child: const Scaffold(body: DashboardContent()),
    ),
  );
}

void main() {
  group('DashboardContent Widget', () {
    group('Loading State', () {
      testWidgets('shows loading indicator when loading and not yet loaded', (
        tester,
      ) async {
        final provider = _TestDashboardProvider(isLoading: true);

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('shows content when loaded even if refreshing', (
        tester,
      ) async {
        final provider = _TestDashboardProvider(
          isLoading: true,
          lastUpdated: DateTime.now(),
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        // Should show content, not loading indicator
        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(find.text('Work Orders'), findsOneWidget);
      });
    });

    group('Content Display', () {
      testWidgets('shows welcome banner', (tester) async {
        final provider = _TestDashboardProvider(lastUpdated: DateTime.now());

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));
        await tester.pumpAndSettle();

        expect(find.textContaining('Welcome back'), findsOneWidget);
      });

      testWidgets('shows work orders section', (tester) async {
        final provider = _TestDashboardProvider(lastUpdated: DateTime.now());

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('Work Orders'), findsOneWidget);
      });

      testWidgets('shows financial section', (tester) async {
        final provider = _TestDashboardProvider(lastUpdated: DateTime.now());

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('Financial Overview'), findsOneWidget);
      });

      testWidgets('shows resources section', (tester) async {
        final provider = _TestDashboardProvider(lastUpdated: DateTime.now());

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('Resources'), findsOneWidget);
      });
    });

    group('Stats Display', () {
      testWidgets('displays work order counts', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          workOrderStats: const WorkOrderStats(
            total: 100,
            pending: 25,
            inProgress: 30,
            completed: 45,
          ),
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('100'), findsOneWidget);
        expect(find.text('25'), findsOneWidget);
        expect(find.text('30'), findsOneWidget);
        expect(find.text('45'), findsOneWidget);
      });

      testWidgets('displays financial stats with currency formatting', (
        tester,
      ) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          financialStats: const FinancialStats(
            revenue: 500.00,
            outstanding: 100.00,
            activeContracts: 5,
          ),
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text(r'$500.00'), findsOneWidget);
        expect(find.text(r'$100.00'), findsOneWidget);
        expect(find.text('5'), findsOneWidget);
      });

      testWidgets('displays resource counts', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          resourceStats: const ResourceStats(
            customers: 200,
            availableTechnicians: 10,
            lowStockItems: 3,
            activeUsers: 50,
          ),
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('200'), findsOneWidget);
        expect(find.text('10'), findsOneWidget);
        expect(find.text('3'), findsOneWidget);
        expect(find.text('50'), findsOneWidget);
      });
    });

    group('Error State', () {
      testWidgets('shows error banner when error exists', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          error: 'Failed to load stats',
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.text('Failed to load stats'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
      });
    });

    group('Last Updated', () {
      testWidgets('shows last updated time when available', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime(2025, 12, 22, 14, 30),
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.textContaining('Updated'), findsOneWidget);
        expect(find.byIcon(Icons.sync), findsOneWidget);
      });
    });

    group('Pull to Refresh', () {
      testWidgets('wraps content in RefreshIndicator', (tester) async {
        final provider = _TestDashboardProvider(lastUpdated: DateTime.now());

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));

        expect(find.byType(RefreshIndicator), findsOneWidget);
      });
    });
  });
}

/// Test-only DashboardProvider with controllable state
class _TestDashboardProvider extends DashboardProvider {
  final bool _isLoading;
  final DateTime? _lastUpdated;
  final String? _error;
  final WorkOrderStats _workOrderStats;
  final FinancialStats _financialStats;
  final ResourceStats _resourceStats;

  _TestDashboardProvider({
    bool isLoading = false,
    DateTime? lastUpdated,
    String? error,
    WorkOrderStats? workOrderStats,
    FinancialStats? financialStats,
    ResourceStats? resourceStats,
  }) : _isLoading = isLoading,
       _lastUpdated = lastUpdated,
       _error = error,
       _workOrderStats = workOrderStats ?? WorkOrderStats.empty,
       _financialStats = financialStats ?? FinancialStats.empty,
       _resourceStats = resourceStats ?? ResourceStats.empty;

  @override
  bool get isLoading => _isLoading;

  @override
  bool get isLoaded => _lastUpdated != null;

  @override
  DateTime? get lastUpdated => _lastUpdated;

  @override
  String? get error => _error;

  @override
  WorkOrderStats get workOrderStats => _workOrderStats;

  @override
  FinancialStats get financialStats => _financialStats;

  @override
  ResourceStats get resourceStats => _resourceStats;
}
