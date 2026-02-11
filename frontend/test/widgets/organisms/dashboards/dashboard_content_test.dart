/// Tests for DashboardContent Organism
///
/// **Testing Strategy:**
/// - Widget composition and structure (testable)
/// - Loading state rendering (testable)
/// - Error state rendering (testable)
/// - Chart display with mock provider (testable)
/// - Config-driven entity rendering (testable)
///
/// **Note:** Integration with real backend is tested separately
/// in integration tests with running server.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/models/dashboard_config.dart';
import 'package:tross/providers/dashboard_provider.dart';
import 'package:tross/services/dashboard_config_loader.dart';
import 'package:tross/services/stats_service.dart';
import 'package:tross/widgets/organisms/dashboard_content.dart';

/// Test dashboard config matching the new minimal format
final _testDashboardConfig = {
  'entities': [
    {
      'entity': 'work_order',
      'minRole': 'customer',
      'groupBy': 'status',
      'order': 1,
    },
    {
      'entity': 'invoice',
      'minRole': 'manager',
      'groupBy': 'status',
      'order': 2,
    },
    {
      'entity': 'technician',
      'minRole': 'admin',
      'groupBy': 'status',
      'order': 3,
    },
  ],
};

/// Creates a widget wrapped with required providers
Widget createTestWidget({
  required DashboardProvider dashboardProvider,
  String userName = 'Test User',
}) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<DashboardProvider>.value(
          value: dashboardProvider,
        ),
      ],
      child: Scaffold(body: DashboardContent(userName: userName)),
    ),
  );
}

void main() {
  setUp(() {
    DashboardConfigService.loadFromJson(_testDashboardConfig);
  });

  tearDown(() {
    DashboardConfigService.reset();
  });

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
      });
    });

    group('Entity Charts', () {
      testWidgets('displays charts based on visible entities', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          visibleEntities: [
            const DashboardEntityConfig(
              entity: 'work_order',
              minRole: 'customer',
              groupBy: 'status',
              order: 1,
            ),
          ],
          chartData: {
            'work_order': [
              const GroupedCount(value: 'pending', count: 10),
              const GroupedCount(value: 'completed', count: 20),
            ],
          },
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));
        await tester.pumpAndSettle();

        // Should find a chart section (pie chart rendered)
        expect(find.byType(Card), findsAtLeast(1));
      });

      testWidgets('shows total count for entity', (tester) async {
        final provider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
          visibleEntities: [
            const DashboardEntityConfig(
              entity: 'work_order',
              minRole: 'customer',
              groupBy: 'status',
              order: 1,
            ),
          ],
          chartData: {
            'work_order': [
              const GroupedCount(value: 'pending', count: 10),
              const GroupedCount(value: 'completed', count: 20),
            ],
          },
        );

        await tester.pumpWidget(createTestWidget(dashboardProvider: provider));
        await tester.pumpAndSettle();

        // Total should be displayed as 'Total: 30'
        expect(find.text('Total: 30'), findsOneWidget);
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
  final List<DashboardEntityConfig> _visibleEntities;
  final Map<String, List<GroupedCount>> _chartData;

  _TestDashboardProvider({
    bool isLoading = false,
    DateTime? lastUpdated,
    String? error,
    List<DashboardEntityConfig>? visibleEntities,
    Map<String, List<GroupedCount>>? chartData,
  }) : _isLoading = isLoading,
       _lastUpdated = lastUpdated,
       _error = error,
       _visibleEntities = visibleEntities ?? [],
       _chartData = chartData ?? {};

  @override
  bool get isLoading => _isLoading;

  @override
  bool get isLoaded => _lastUpdated != null;

  @override
  DateTime? get lastUpdated => _lastUpdated;

  @override
  String? get error => _error;

  @override
  List<DashboardEntityConfig> getVisibleEntities() {
    return _visibleEntities;
  }

  @override
  List<GroupedCount> getChartData(String entity) {
    return _chartData[entity] ?? [];
  }

  @override
  int getTotalCount(String entity) {
    final data = _chartData[entity] ?? [];
    return data.fold(0, (sum, item) => sum + item.count);
  }
}
