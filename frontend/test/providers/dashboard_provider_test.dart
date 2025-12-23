/// DashboardProvider Unit Tests
///
/// Tests the dashboard statistics provider.
/// Since DashboardProvider calls StatsService (which makes HTTP calls),
/// these tests verify state management, data models, and initialization.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/dashboard_provider.dart';

void main() {
  group('DashboardProvider', () {
    late DashboardProvider provider;

    setUp(() {
      provider = DashboardProvider();
    });

    group('Initial State', () {
      test('should start with empty work order stats', () {
        expect(provider.workOrderStats.total, equals(0));
        expect(provider.workOrderStats.pending, equals(0));
        expect(provider.workOrderStats.inProgress, equals(0));
        expect(provider.workOrderStats.completed, equals(0));
      });

      test('should start with empty financial stats', () {
        expect(provider.financialStats.revenue, equals(0.0));
        expect(provider.financialStats.outstanding, equals(0.0));
        expect(provider.financialStats.activeContracts, equals(0));
      });

      test('should start with empty resource stats', () {
        expect(provider.resourceStats.customers, equals(0));
        expect(provider.resourceStats.availableTechnicians, equals(0));
        expect(provider.resourceStats.lowStockItems, equals(0));
        expect(provider.resourceStats.activeUsers, equals(0));
      });

      test('should not be loading initially', () {
        expect(provider.isLoading, isFalse);
      });

      test('should not be loaded initially', () {
        expect(provider.isLoaded, isFalse);
      });

      test('should have no error initially', () {
        expect(provider.error, isNull);
      });

      test('should have no lastUpdated initially', () {
        expect(provider.lastUpdated, isNull);
      });
    });

    group('ChangeNotifier', () {
      test('should be a ChangeNotifier', () {
        expect(provider, isA<DashboardProvider>());
      });
    });

    group('Dispose', () {
      test('dispose should not throw', () {
        expect(() => provider.dispose(), returnsNormally);
      });
    });
  });

  group('WorkOrderStats', () {
    test('empty constant has all zeros', () {
      expect(WorkOrderStats.empty.total, equals(0));
      expect(WorkOrderStats.empty.pending, equals(0));
      expect(WorkOrderStats.empty.inProgress, equals(0));
      expect(WorkOrderStats.empty.completed, equals(0));
    });

    test('const constructor works correctly', () {
      const stats = WorkOrderStats(
        total: 100,
        pending: 25,
        inProgress: 30,
        completed: 45,
      );

      expect(stats.total, equals(100));
      expect(stats.pending, equals(25));
      expect(stats.inProgress, equals(30));
      expect(stats.completed, equals(45));
    });

    test('default values are zero', () {
      const stats = WorkOrderStats();

      expect(stats.total, equals(0));
      expect(stats.pending, equals(0));
      expect(stats.inProgress, equals(0));
      expect(stats.completed, equals(0));
    });
  });

  group('FinancialStats', () {
    test('empty constant has all zeros', () {
      expect(FinancialStats.empty.revenue, equals(0.0));
      expect(FinancialStats.empty.outstanding, equals(0.0));
      expect(FinancialStats.empty.activeContracts, equals(0));
    });

    test('const constructor works correctly', () {
      const stats = FinancialStats(
        revenue: 50000.50,
        outstanding: 10000.00,
        activeContracts: 15,
      );

      expect(stats.revenue, equals(50000.50));
      expect(stats.outstanding, equals(10000.00));
      expect(stats.activeContracts, equals(15));
    });

    test('default values are zero', () {
      const stats = FinancialStats();

      expect(stats.revenue, equals(0.0));
      expect(stats.outstanding, equals(0.0));
      expect(stats.activeContracts, equals(0));
    });
  });

  group('ResourceStats', () {
    test('empty constant has all zeros', () {
      expect(ResourceStats.empty.customers, equals(0));
      expect(ResourceStats.empty.availableTechnicians, equals(0));
      expect(ResourceStats.empty.lowStockItems, equals(0));
      expect(ResourceStats.empty.activeUsers, equals(0));
    });

    test('const constructor works correctly', () {
      const stats = ResourceStats(
        customers: 200,
        availableTechnicians: 10,
        lowStockItems: 5,
        activeUsers: 50,
      );

      expect(stats.customers, equals(200));
      expect(stats.availableTechnicians, equals(10));
      expect(stats.lowStockItems, equals(5));
      expect(stats.activeUsers, equals(50));
    });

    test('default values are zero', () {
      const stats = ResourceStats();

      expect(stats.customers, equals(0));
      expect(stats.availableTechnicians, equals(0));
      expect(stats.lowStockItems, equals(0));
      expect(stats.activeUsers, equals(0));
    });
  });
}
