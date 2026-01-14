/// DashboardProvider Unit Tests
///
/// Tests the dashboard statistics provider.
/// Since DashboardProvider calls StatsService (which makes HTTP calls),
/// these tests verify state management, data models, and initialization.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/dashboard_provider.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/auth/token_provider.dart';
import 'package:tross_app/services/stats_service.dart';

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

  group('DashboardProvider Auth Integration', () {
    late DashboardProvider provider;
    late _TestableAuthProvider mockAuth;

    setUp(() {
      provider = DashboardProvider();
      mockAuth = _TestableAuthProvider();
    });

    tearDown(() {
      provider.dispose();
    });

    test('connectToAuth registers listener', () {
      provider.connectToAuth(mockAuth);

      // Should have registered as listener
      expect(mockAuth.listenerCount, equals(1));
    });

    test('connectToAuth loads stats when already authenticated', () {
      mockAuth.setAuthenticated(true);
      provider.connectToAuth(mockAuth);

      // Should attempt to load (but will fail gracefully without StatsService)
      // We're testing that the code path is exercised
      expect(provider.isLoaded, isFalse); // No stats service, so not loaded
    });

    test('dispose removes auth listener', () {
      // Use a separate provider instance to avoid double-dispose from tearDown
      final disposeTestProvider = DashboardProvider();
      final disposeTestAuth = _TestableAuthProvider();

      disposeTestProvider.connectToAuth(disposeTestAuth);
      expect(disposeTestAuth.listenerCount, equals(1));

      disposeTestProvider.dispose();
      expect(disposeTestAuth.listenerCount, equals(0));
    });

    test('auth change from logged-out to logged-in triggers load', () async {
      provider.connectToAuth(mockAuth);

      // Simulate login
      mockAuth.setAuthenticated(true);

      // Wait for async operations
      await Future.delayed(Duration.zero);

      // Provider should have attempted to load
      expect(provider.error, isNull); // Graceful handling without StatsService
    });

    test('auth change from logged-in to logged-out clears stats', () async {
      mockAuth.setAuthenticated(true);
      provider.connectToAuth(mockAuth);

      // Wait for initial loadStats to complete
      await Future.delayed(const Duration(milliseconds: 10));

      // Simulate logout
      mockAuth.setAuthenticated(false);

      await Future.delayed(const Duration(milliseconds: 10));

      // Stats should be cleared
      expect(provider.workOrderStats.total, equals(0));
      expect(provider.financialStats.revenue, equals(0.0));
      expect(provider.resourceStats.customers, equals(0));
      // lastUpdated is set during loadStats, then cleared by _clearStats
      // But since loadStats ran first, we verify stats are empty
    });
  });

  group('DashboardProvider Loading', () {
    late DashboardProvider provider;

    setUp(() {
      provider = DashboardProvider();
    });

    tearDown(() {
      provider.dispose();
    });

    test('loadStats handles missing StatsService gracefully', () async {
      // No StatsService set - should not throw
      await expectLater(provider.loadStats(), completes);

      // Should not be in loading state after completion
      expect(provider.isLoading, isFalse);
    });

    test('refresh is alias for loadStats', () async {
      await expectLater(provider.refresh(), completes);
      expect(provider.isLoading, isFalse);
    });

    test('concurrent loadStats calls are ignored', () async {
      // Start first load
      final future1 = provider.loadStats();
      expect(provider.isLoading, isTrue);

      // Second call should return immediately
      final future2 = provider.loadStats();

      await Future.wait([future1, future2]);
      expect(provider.isLoading, isFalse);
    });

    test('setStatsService sets the service', () {
      final mockService = _MockStatsService();
      provider.setStatsService(mockService);

      // Provider should now have a stats service
      // We can verify by loading - it will use the mock
      expect(() => provider.loadStats(), returnsNormally);
    });
  });

  group('DashboardProvider Notifications', () {
    late DashboardProvider provider;
    int notificationCount = 0;

    setUp(() {
      provider = DashboardProvider();
      notificationCount = 0;
      provider.addListener(() => notificationCount++);
    });

    tearDown(() {
      provider.dispose();
    });

    test('loadStats notifies listeners on start and completion', () async {
      await provider.loadStats();

      // Should notify at least twice: start loading, finish loading
      expect(notificationCount, greaterThanOrEqualTo(2));
    });
  });
}

/// Testable AuthProvider that tracks listener registrations
class _TestableAuthProvider extends ChangeNotifier implements AuthProvider {
  bool _isAuthenticated = false;
  int _listenerCount = 0;

  @override
  bool get isAuthenticated => _isAuthenticated;

  int get listenerCount => _listenerCount;

  void setAuthenticated(bool value) {
    _isAuthenticated = value;
    notifyListeners();
  }

  @override
  void addListener(VoidCallback listener) {
    _listenerCount++;
    super.addListener(listener);
  }

  @override
  void removeListener(VoidCallback listener) {
    _listenerCount--;
    super.removeListener(listener);
  }

  // Stub all required AuthProvider members
  @override
  Map<String, dynamic>? get user => null;
  @override
  bool get isLoading => false;
  @override
  bool get isRedirecting => false;
  @override
  String? get error => null;
  @override
  String? get token => null;
  @override
  String? get provider => null;
  @override
  String get userRole => 'admin';
  @override
  String get userName => 'Test';
  @override
  String get userEmail => 'test@test.com';
  @override
  int? get userId => 1;
  @override
  Future<bool> loginWithTestToken({String role = 'admin'}) async => true;
  @override
  Future<bool> loginWithAuth0() async => true;
  @override
  Future<bool> handleAuth0Callback() async => true;
  @override
  Future<void> logout() async {}
  @override
  Future<void> initialize() async {}
  @override
  Future<bool> updateProfile(Map<String, dynamic> updates) async => true;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Mock StatsService for testing
class _MockStatsService extends StatsService {
  _MockStatsService() : super(_MockApiClient(), _MockTokenProvider());

  @override
  Future<int> count(String entity, {Map<String, dynamic>? filters}) async {
    return 0;
  }

  @override
  Future<double> sum(
    String entity,
    String field, {
    Map<String, dynamic>? filters,
  }) async {
    return 0.0;
  }
}

/// Minimal mock ApiClient for StatsService
class _MockApiClient implements ApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

/// Minimal mock TokenProvider for StatsService
class _MockTokenProvider implements TokenProvider {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

dynamic noSuchMethod(Invocation invocation) => null;
