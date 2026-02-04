/// DashboardProvider Unit Tests
///
/// Tests the chart-based dashboard provider.
/// Validates chart data loading, role-based entity filtering, and state management.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/providers/dashboard_provider.dart';
import 'package:tross/services/api/api_client.dart';
import 'package:tross/services/auth/token_provider.dart';
import 'package:tross/services/dashboard_config_loader.dart';
import 'package:tross/services/stats_service.dart';

void main() {
  group('DashboardProvider', () {
    setUp(() {
      // Initialize config service with test config
      DashboardConfigService.loadFromJson({
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
        ],
      });
    });

    tearDown(() {
      DashboardConfigService.reset();
    });

    test('initializes with correct defaults', () {
      final provider = DashboardProvider();

      expect(provider.isLoading, false);
      expect(provider.lastUpdated, isNull);
      // Without auth connected, default role is 'customer' which sees entities with minRole <= customer
      expect(provider.getVisibleEntities().length, 1); // work_order only
      expect(provider.getChartData('work_order'), isEmpty);
      expect(provider.getTotalCount('work_order'), 0);

      provider.dispose();
    });

    test('isChangeNotifier', () {
      final provider = DashboardProvider();
      expect(provider, isA<ChangeNotifier>());
      provider.dispose();
    });

    test('connectToAuth stores provider reference', () {
      final provider = DashboardProvider();
      final authProvider = _TestableAuthProvider();

      // Should not throw
      provider.connectToAuth(authProvider);

      provider.dispose();
    });

    test('dispose cleans up resources', () {
      final provider = DashboardProvider();
      final authProvider = _TestableAuthProvider();

      provider.connectToAuth(authProvider);

      // Should not throw
      expect(() => provider.dispose(), returnsNormally);
    });
  });

  group('DashboardProvider Chart Data', () {
    late DashboardProvider provider;
    late _MockStatsService mockService;

    setUp(() {
      DashboardConfigService.loadFromJson({
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
        ],
      });
      provider = DashboardProvider();
      mockService = _MockStatsService();
      provider.setStatsService(mockService);
    });

    tearDown(() {
      provider.dispose();
      DashboardConfigService.reset();
    });

    test('loadStats populates chart data', () async {
      // Configure mock to return grouped data
      mockService.setGroupedData('work_order', [
        const GroupedCount(value: 'pending', count: 10),
        const GroupedCount(value: 'completed', count: 25),
      ]);

      await provider.loadStats();

      final data = provider.getChartData('work_order');
      expect(data.length, 2);
      expect(data.first.value, 'pending');
      expect(data.first.count, 10);
    });

    test('getTotalCount sums all grouped counts', () async {
      mockService.setGroupedData('work_order', [
        const GroupedCount(value: 'pending', count: 10),
        const GroupedCount(value: 'scheduled', count: 15),
        const GroupedCount(value: 'completed', count: 25),
      ]);

      await provider.loadStats();

      expect(provider.getTotalCount('work_order'), 50);
    });

    test('getChartData returns empty list for unknown entity', () {
      expect(provider.getChartData('unknown_entity'), isEmpty);
    });

    test('getTotalCount returns 0 for unknown entity', () {
      expect(provider.getTotalCount('unknown_entity'), 0);
    });
  });

  group('DashboardProvider Visible Entities', () {
    late DashboardProvider provider;
    late _TestableAuthProvider authProvider;

    setUp(() {
      DashboardConfigService.loadFromJson({
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
      });
      provider = DashboardProvider();
      authProvider = _TestableAuthProvider();
    });

    tearDown(() {
      provider.dispose();
      DashboardConfigService.reset();
    });

    test('getVisibleEntities filters by user role', () {
      // Admin sees all
      authProvider.setRole('admin');
      provider.connectToAuth(authProvider);

      final adminEntities = provider.getVisibleEntities();
      expect(adminEntities.length, 3);
      expect(adminEntities.map((e) => e.entity).toList(), [
        'work_order',
        'invoice',
        'technician',
      ]);
    });

    test('manager sees work_order and invoice', () {
      authProvider.setRole('manager');
      provider.connectToAuth(authProvider);

      final entities = provider.getVisibleEntities();
      expect(entities.length, 2);
      expect(entities.map((e) => e.entity).toList(), ['work_order', 'invoice']);
    });

    test('customer sees only work_order', () {
      authProvider.setRole('customer');
      provider.connectToAuth(authProvider);

      final entities = provider.getVisibleEntities();
      expect(entities.length, 1);
      expect(entities.first.entity, 'work_order');
    });

    test('entities are ordered by order field', () {
      authProvider.setRole('admin');
      provider.connectToAuth(authProvider);

      final entities = provider.getVisibleEntities();
      expect(entities[0].order, 1);
      expect(entities[1].order, 2);
      expect(entities[2].order, 3);
    });
  });

  group('DashboardProvider Auth Integration', () {
    late DashboardProvider provider;
    late _TestableAuthProvider authProvider;

    setUp(() {
      DashboardConfigService.loadFromJson({
        'entities': [
          {
            'entity': 'work_order',
            'minRole': 'customer',
            'groupBy': 'status',
            'order': 1,
          },
        ],
      });
      provider = DashboardProvider();
      authProvider = _TestableAuthProvider();
    });

    tearDown(() {
      provider.dispose();
      DashboardConfigService.reset();
    });

    test('connectToAuth subscribes to auth changes', () {
      final initialListenerCount = authProvider.listenerCount;
      provider.connectToAuth(authProvider);

      expect(authProvider.listenerCount, greaterThan(initialListenerCount));
    });

    test('dispose removes auth listener', () {
      // Use separate provider to avoid double-dispose from tearDown
      final disposeProvider = DashboardProvider();
      final disposeAuth = _TestableAuthProvider();

      disposeProvider.connectToAuth(disposeAuth);
      final listenerCountAfterSet = disposeAuth.listenerCount;

      disposeProvider.dispose();

      expect(disposeAuth.listenerCount, lessThan(listenerCountAfterSet));
    });

    test('chart data is cleared on logout', () async {
      // Set up provider with mock stats service
      final mockService = _MockStatsService();
      mockService.setGroupedData('work_order', [
        const GroupedCount(value: 'pending', count: 10),
      ]);
      provider.setStatsService(mockService);
      provider.connectToAuth(authProvider);

      // Simulate login and load stats
      authProvider.setAuthenticated(true);
      await provider.loadStats();

      expect(provider.getChartData('work_order'), isNotEmpty);

      // Simulate logout
      authProvider.setAuthenticated(false);

      // Chart data should be cleared
      expect(provider.getChartData('work_order'), isEmpty);
    });
  });

  group('DashboardProvider Loading', () {
    late DashboardProvider provider;

    setUp(() {
      DashboardConfigService.loadFromJson({
        'entities': [
          {
            'entity': 'work_order',
            'minRole': 'customer',
            'groupBy': 'status',
            'order': 1,
          },
        ],
      });
      provider = DashboardProvider();
    });

    tearDown(() {
      provider.dispose();
      DashboardConfigService.reset();
    });

    test('loadStats handles missing StatsService gracefully', () async {
      // No StatsService set - should not throw
      await expectLater(provider.loadStats(), completes);

      // Should not be in loading state after completion
      expect(provider.isLoading, isFalse);
    });

    test('refresh is alias for loadStats', () async {
      final mockService = _MockStatsService();
      provider.setStatsService(mockService);
      await expectLater(provider.refresh(), completes);
      expect(provider.isLoading, isFalse);
    });

    test('concurrent loadStats calls are ignored', () async {
      // Set up a slow stats service
      final slowService = _SlowMockStatsService();
      provider.setStatsService(slowService);

      // Start first load
      final future1 = provider.loadStats();
      expect(provider.isLoading, isTrue);

      // Second call should return immediately (ignored since loading)
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

    test('lastUpdated is set after successful load', () async {
      final mockService = _MockStatsService();
      provider.setStatsService(mockService);

      expect(provider.lastUpdated, isNull);

      await provider.loadStats();

      expect(provider.lastUpdated, isNotNull);
    });
  });

  group('DashboardProvider Notifications', () {
    late DashboardProvider provider;
    int notificationCount = 0;

    setUp(() {
      DashboardConfigService.loadFromJson({
        'entities': [
          {
            'entity': 'work_order',
            'minRole': 'customer',
            'groupBy': 'status',
            'order': 1,
          },
        ],
      });
      provider = DashboardProvider();
      provider.setStatsService(_MockStatsService());
      notificationCount = 0;
      provider.addListener(() => notificationCount++);
    });

    tearDown(() {
      provider.dispose();
      DashboardConfigService.reset();
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
  String _role = 'admin';
  int _listenerCount = 0;

  @override
  bool get isAuthenticated => _isAuthenticated;

  int get listenerCount => _listenerCount;

  void setAuthenticated(bool value) {
    _isAuthenticated = value;
    notifyListeners();
  }

  void setRole(String role) {
    _role = role;
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
  String get userRole => _role;
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
  final Map<String, List<GroupedCount>> _groupedData = {};

  _MockStatsService() : super(_MockApiClient(), _MockTokenProvider());

  void setGroupedData(String entity, List<GroupedCount> data) {
    _groupedData[entity] = data;
  }

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

  @override
  Future<List<GroupedCount>> countGrouped(
    String entityName,
    String groupByField, {
    Map<String, dynamic>? filters,
  }) async {
    return _groupedData[entityName] ?? [];
  }
}

/// Slow mock StatsService for testing concurrent calls
class _SlowMockStatsService extends StatsService {
  _SlowMockStatsService() : super(_MockApiClient(), _MockTokenProvider());

  @override
  Future<int> count(String entity, {Map<String, dynamic>? filters}) async {
    await Future.delayed(const Duration(milliseconds: 50));
    return 0;
  }

  @override
  Future<double> sum(
    String entity,
    String field, {
    Map<String, dynamic>? filters,
  }) async {
    await Future.delayed(const Duration(milliseconds: 50));
    return 0.0;
  }

  @override
  Future<List<GroupedCount>> countGrouped(
    String entityName,
    String groupByField, {
    Map<String, dynamic>? filters,
  }) async {
    await Future.delayed(const Duration(milliseconds: 50));
    return [];
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
