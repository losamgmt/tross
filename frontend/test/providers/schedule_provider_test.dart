/// ScheduleProvider Unit Tests
///
/// Tests schedule data loading, filter state, auth lifecycle, and error handling.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
library;

import '../mocks/mock_failure_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/models/date_range_unit.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/providers/schedule_provider.dart';
import 'package:tross/services/dashboard_config_loader.dart';
import '../mocks/mock_services.dart';

void main() {
  // Initialize mock dashboard config before all tests
  setUpAll(() {
    DashboardConfigService.loadFromJson({
      'version': '1.4.0',
      'roleViews': {
        'customer': {
          'type': 'log',
          'title': 'Work Order History',
          'timeframes': [30, 90, 365, null],
          'defaultTimeframe': 30,
        },
        'technician': {'type': 'schedule', 'title': 'My Schedule'},
        'dispatcher': {'type': 'operations', 'title': 'Operations Center'},
        'manager': {'type': 'operations', 'title': 'Operations Center'},
        'admin': {'type': 'operations', 'title': 'Operations Center'},
      },
      'attentionBanner': {'stalePendingHours': 48, 'minRole': 'dispatcher'},
      'unscheduledQueue': {
        'minRole': 'dispatcher',
        'maxItems': 20,
        'pageSize': 20,
        'paginated': true,
        'title': 'Unscheduled',
      },
      'schedule': {
        'defaultDateRangeUnit': 'week',
        'minRole': 'customer',
        'filters': [
          {
            'field': 'property_id',
            'label': 'Property',
            'roles': ['customer'],
          },
          {
            'field': 'assigned_technician_id',
            'label': 'Technician',
            'minRole': 'dispatcher',
          },
        ],
      },
      'entities': [
        {
          'entity': 'work_order',
          'minRole': 'customer',
          'groupBy': 'status',
          'order': 1,
        },
      ],
    });
  });

  tearDownAll(() {
    DashboardConfigService.reset();
  });

  group('ScheduleProvider', () {
    late MockGenericEntityService mockService;
    late ScheduleProvider provider;

    setUp(() {
      mockService = MockGenericEntityService();
      provider = ScheduleProvider(mockService);
    });

    tearDown(() {
      provider.dispose();
      mockService.reset();
    });

    group('initialization', () {
      test('is ChangeNotifier', () {
        expect(provider, isA<ChangeNotifier>());
      });

      test('isLoading is false initially', () {
        expect(provider.isLoading, false);
      });

      test('error is null initially', () {
        expect(provider.error, isNull);
      });

      test('lastUpdated is null initially', () {
        expect(provider.lastUpdated, isNull);
      });

      test('workOrders is empty initially', () {
        expect(provider.workOrders, isEmpty);
      });

      test('technicians is empty initially', () {
        expect(provider.technicians, isEmpty);
      });

      test('dateRangeUnit defaults to week', () {
        expect(provider.dateRangeUnit, DateRangeUnit.week);
      });

      test('selectedTechnicianId is null initially', () {
        expect(provider.selectedTechnicianId, isNull);
      });

      test('userRole defaults to customer', () {
        expect(provider.userRole, 'customer');
      });
    });

    group('filter setters', () {
      test('setWindowStart updates windowStart', () async {
        mockService.mockEntities('work_order', []);
        final newDate = DateTime(2026, 4, 1);

        await provider.setWindowStart(newDate);

        expect(provider.windowStart, newDate);
      });

      test('setWindowStart triggers load', () async {
        mockService.mockEntities('work_order', [
          {'id': 1, 'name': 'Test WO'},
        ]);

        await provider.setWindowStart(DateTime(2026, 4, 1));

        expect(mockService.wasCalled('getAll:work_order'), true);
      });

      test('setDateRangeUnit updates dateRangeUnit', () async {
        mockService.mockEntities('work_order', []);

        await provider.setDateRangeUnit(DateRangeUnit.month);

        expect(provider.dateRangeUnit, DateRangeUnit.month);
      });

      test('setDateRangeUnit triggers load', () async {
        mockService.mockEntities('work_order', []);

        await provider.setDateRangeUnit(DateRangeUnit.day);

        expect(mockService.wasCalled('getAll:work_order'), true);
      });

      test('setSelectedTechnician updates selectedTechnicianId', () async {
        mockService.mockEntities('work_order', []);

        await provider.setSelectedTechnician(42);

        expect(provider.selectedTechnicianId, 42);
      });

      test('setSelectedTechnician triggers load', () async {
        mockService.mockEntities('work_order', []);

        await provider.setSelectedTechnician(42);

        expect(mockService.wasCalled('getAll:work_order'), true);
      });

      test('setSelectedTechnician accepts null', () async {
        mockService.mockEntities('work_order', []);
        await provider.setSelectedTechnician(42);

        await provider.setSelectedTechnician(null);

        expect(provider.selectedTechnicianId, isNull);
      });
    });

    group('loadSchedule', () {
      test('populates workOrders', () async {
        mockService.mockEntities('work_order', [
          {'id': 1, 'name': 'WO 1', 'scheduled_start': '2026-03-15T09:00:00'},
          {'id': 2, 'name': 'WO 2', 'scheduled_start': '2026-03-16T10:00:00'},
        ]);

        await provider.loadSchedule();

        expect(provider.workOrders.length, 2);
        expect(provider.workOrders[0]['name'], 'WO 1');
      });

      test('sets lastUpdated on success', () async {
        mockService.mockEntities('work_order', []);

        await provider.loadSchedule();

        expect(provider.lastUpdated, isNotNull);
      });

      test('sets error on failure', () async {
        mockService.setFailure(MockFailureConfig.exception('Network error', persistent: false));

        await provider.loadSchedule();

        expect(provider.error, 'Failed to load schedule');
        expect(provider.isLoading, false);
      });

      test('notifies listeners', () async {
        mockService.mockEntities('work_order', []);
        int notifyCount = 0;
        provider.addListener(() => notifyCount++);

        await provider.loadSchedule();

        // startLoading + completeSuccess = 2 notifications
        expect(notifyCount, 2);
      });

      test('workOrders list is unmodifiable', () async {
        mockService.mockEntities('work_order', [
          {'id': 1, 'name': 'Test'},
        ]);
        await provider.loadSchedule();

        // Attempting to modify should throw
        expect(
          () => provider.workOrders.add({'id': 2}),
          throwsUnsupportedError,
        );
      });
    });

    group('auth integration', () {
      test('connectToAuth subscribes to auth changes', () async {
        final auth = TestableAuthProvider();

        expect(auth.listenerCount, 0);
        await provider.connectToAuth(auth);

        expect(auth.listenerCount, 1);
      });

      test('loads schedule on login', () async {
        final auth = TestableAuthProvider();
        mockService.mockEntities('work_order', []);
        mockService.mockEntities('technician', []);

        await provider.connectToAuth(auth);
        auth.setAuthenticated(true);

        // Allow async listener to complete
        await Future.delayed(Duration.zero);

        expect(mockService.wasCalled('getAll:work_order'), true);
      });

      test('loads technicians on login for dispatcher+ roles', () async {
        final auth = TestableAuthProvider()..setRole('dispatcher');
        mockService.mockEntities('work_order', []);
        mockService.mockEntities('technician', [
          {'id': 1, 'first_name': 'John', 'last_name': 'Tech'},
        ]);

        await provider.connectToAuth(auth);
        auth.setAuthenticated(true);

        await Future.delayed(Duration.zero);

        expect(mockService.wasCalled('getAll:technician'), true);
        expect(provider.technicians.length, 1);
      });

      test('does not load technicians for customer role', () async {
        final auth = TestableAuthProvider()..setRole('customer');
        mockService.mockEntities('work_order', []);
        mockService.mockEntities('technician', [
          {'id': 1, 'first_name': 'John', 'last_name': 'Tech'},
        ]);

        await provider.connectToAuth(auth);
        auth.setAuthenticated(true);

        await Future.delayed(Duration.zero);

        // Technician filter not visible to customer, so techs not loaded
        expect(mockService.wasCalled('getAll:technician'), false);
        expect(provider.technicians, isEmpty);
      });

      test('clears data on logout', () async {
        final auth = TestableAuthProvider()..setAuthenticated(true);
        mockService.mockEntities('work_order', [
          {'id': 1, 'name': 'Test'},
        ]);
        mockService.mockEntities('technician', []);

        await provider.connectToAuth(auth);
        expect(provider.workOrders.length, 1);

        auth.setAuthenticated(false);
        await Future.delayed(Duration.zero);

        expect(provider.workOrders, isEmpty);
        expect(provider.technicians, isEmpty);
      });

      test('dispose removes auth listener', () async {
        // Use local provider to avoid tearDown double-dispose
        final localProvider = ScheduleProvider(mockService);
        final auth = TestableAuthProvider();
        await localProvider.connectToAuth(auth);

        expect(auth.listenerCount, 1);
        localProvider.dispose();

        expect(auth.listenerCount, 0);
      });

      test('userRole reflects auth provider', () async {
        final auth = TestableAuthProvider()..setRole('dispatcher');
        await provider.connectToAuth(auth);

        expect(provider.userRole, 'dispatcher');
      });
    });

    group('concurrent load protection', () {
      test('ignores load while already loading', () async {
        mockService.mockEntities('work_order', []);

        // Start first load (don't await)
        final first = provider.loadSchedule();

        // Try to start second load
        await provider.loadSchedule();

        // Wait for first to complete
        await first;

        // Only one call should have been made
        expect(
          mockService.callHistory.where((c) => c == 'getAll:work_order').length,
          1,
        );
      });
    });
  });
}

/// Re-export TestableAuthProvider for use in schedule tests
///
/// This is the same implementation from auth_connection_manager_test.dart.
/// Using library-level export rather than duplicating.
class TestableAuthProvider extends ChangeNotifier implements AuthProvider {
  bool _isAuthenticated = false;
  String _role = 'customer';
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
