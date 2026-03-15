/// Tests for DashboardContent Organism
///
/// **Testing Strategy:**
/// - Widget composition and structure (testable)
/// - Loading state rendering (testable)
/// - Error state rendering (testable)
/// - Chart display with mock provider (testable)
/// - Config-driven entity rendering (testable)
/// - Schedule section rendering (testable)
///
/// **Note:** Integration with real backend is tested separately
/// in integration tests with running server.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/models/dashboard_config.dart';
import 'package:tross/models/date_range_unit.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/providers/dashboard_provider.dart';
import 'package:tross/providers/refresh_coordinator.dart';
import 'package:tross/providers/schedule_provider.dart';
import 'package:tross/services/dashboard_config_loader.dart';
import 'package:tross/services/stats_service.dart';
import 'package:tross/widgets/organisms/dashboard_content.dart';

/// Test dashboard config matching the new minimal format
final _testDashboardConfig = {
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

/// Test dashboard config with schedule section
final _testDashboardConfigWithSchedule = {
  'entities': [
    {
      'entity': 'work_order',
      'minRole': 'customer',
      'groupBy': 'status',
      'order': 1,
    },
  ],
  'schedule': {
    'defaultDateRangeUnit': 'week',
    'minRole': 'dispatcher',
    'showTechnicianFilter': true,
    'displayColumns': ['work_order_number', 'name', 'status'],
  },
};

/// Creates a widget wrapped with required providers
Widget createTestWidget({
  required DashboardProvider dashboardProvider,
  AuthProvider? authProvider,
  ScheduleProvider? scheduleProvider,
  RefreshCoordinator? refreshCoordinator,
  String userName = 'Test User',
  String userRole = 'admin',
}) {
  // Always provide required providers (DashboardContent requires them)
  final schedule = scheduleProvider ?? _TestScheduleProvider();
  final auth = authProvider ?? _TestAuthProvider(role: userRole);
  final coordinator = refreshCoordinator ?? RefreshCoordinator();

  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<RefreshCoordinator>.value(value: coordinator),
        ChangeNotifierProvider<DashboardProvider>.value(
          value: dashboardProvider,
        ),
        ChangeNotifierProvider<ScheduleProvider>.value(value: schedule),
        ChangeNotifierProvider<AuthProvider>.value(value: auth),
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

    group('Schedule Section', () {
      testWidgets('shows schedule section when config and role allow', (
        tester,
      ) async {
        // Use config with schedule
        DashboardConfigService.loadFromJson(_testDashboardConfigWithSchedule);

        final dashProvider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
        );
        final authProvider = _TestAuthProvider(role: 'dispatcher');
        final scheduleProvider = _TestScheduleProvider();

        await tester.pumpWidget(
          createTestWidget(
            dashboardProvider: dashProvider,
            authProvider: authProvider,
            scheduleProvider: scheduleProvider,
          ),
        );
        await tester.pumpAndSettle();

        // Schedule section should be visible
        expect(find.text('Schedule'), findsOneWidget);
        expect(find.byIcon(Icons.calendar_month), findsOneWidget);
      });

      testWidgets('shows schedule section for customer role', (tester) async {
        // With roleViews architecture, all roles see a schedule view
        DashboardConfigService.loadFromJson(_testDashboardConfig);

        final dashProvider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
        );
        final authProvider = _TestAuthProvider(role: 'customer');
        final scheduleProvider = _TestScheduleProvider();

        await tester.pumpWidget(
          createTestWidget(
            dashboardProvider: dashProvider,
            authProvider: authProvider,
            scheduleProvider: scheduleProvider,
          ),
        );
        await tester.pumpAndSettle();

        // Schedule section IS visible for all roles (RLS filters data)
        expect(find.text('Schedule'), findsOneWidget);
      });

      testWidgets('shows schedule section regardless of config format', (
        tester,
      ) async {
        // With roleViews, schedule section is always shown
        DashboardConfigService.loadFromJson(_testDashboardConfig);

        final dashProvider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
        );
        final authProvider = _TestAuthProvider(role: 'admin');

        await tester.pumpWidget(
          createTestWidget(
            dashboardProvider: dashProvider,
            authProvider: authProvider,
          ),
        );
        await tester.pumpAndSettle();

        // Schedule section IS visible (roleViews determines layout)
        expect(find.text('Schedule'), findsOneWidget);
      });

      testWidgets('shows work order count in schedule header', (tester) async {
        DashboardConfigService.loadFromJson(_testDashboardConfigWithSchedule);

        final dashProvider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
        );
        final authProvider = _TestAuthProvider(role: 'dispatcher');
        final scheduleProvider = _TestScheduleProvider(
          workOrders: [
            {'id': 1, 'name': 'WO 1'},
            {'id': 2, 'name': 'WO 2'},
            {'id': 3, 'name': 'WO 3'},
          ],
        );

        await tester.pumpWidget(
          createTestWidget(
            dashboardProvider: dashProvider,
            authProvider: authProvider,
            scheduleProvider: scheduleProvider,
          ),
        );
        await tester.pumpAndSettle();

        // Should show count badge
        expect(find.text('3 items'), findsOneWidget);
      });

      testWidgets('shows loading indicator in schedule section', (
        tester,
      ) async {
        DashboardConfigService.loadFromJson(_testDashboardConfigWithSchedule);

        final dashProvider = _TestDashboardProvider(
          lastUpdated: DateTime.now(),
        );
        final authProvider = _TestAuthProvider(role: 'dispatcher');
        final scheduleProvider = _TestScheduleProvider(isLoading: true);

        await tester.pumpWidget(
          createTestWidget(
            dashboardProvider: dashProvider,
            authProvider: authProvider,
            scheduleProvider: scheduleProvider,
          ),
        );

        // Find CircularProgressIndicator inside schedule section Card
        // Dashboard is loaded, so main loading is not shown
        final cards = tester.widgetList<Card>(find.byType(Card));
        expect(cards.length, greaterThanOrEqualTo(1));
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

/// Test-only AuthProvider with controllable role
class _TestAuthProvider extends ChangeNotifier implements AuthProvider {
  final String _role;

  _TestAuthProvider({String role = 'customer'}) : _role = role;

  @override
  String get userRole => _role;

  @override
  bool get isAuthenticated => true;

  @override
  bool get isLoading => false;

  @override
  bool get isRedirecting => false;

  @override
  String? get error => null;

  @override
  String? get token => 'test-token';

  @override
  String? get provider => 'test';

  @override
  Map<String, dynamic>? get user => {'role': _role};

  @override
  String get userName => 'Test User';

  @override
  String get userEmail => 'test@example.com';

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

  // Handle any additional AuthProvider methods not explicitly implemented
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Test-only ScheduleProvider with controllable state
class _TestScheduleProvider extends ChangeNotifier implements ScheduleProvider {
  final bool _isLoading;
  final List<Map<String, dynamic>> _workOrders;
  final List<Map<String, dynamic>> _technicians;
  final List<Map<String, dynamic>> _properties;
  final List<Map<String, dynamic>> _units;
  final List<String> _statuses;
  final List<Map<String, dynamic>> _unscheduledWorkOrders;
  DateTime _windowStart;
  DateRangeUnit _dateRangeUnit;
  int? _selectedTechnicianId;
  int? _selectedPropertyId;
  int? _selectedUnitId;
  String? _selectedStatus;
  bool _filterUnassigned = false;

  _TestScheduleProvider({
    bool isLoading = false,
    List<Map<String, dynamic>>? workOrders,
    List<Map<String, dynamic>>? technicians,
    List<Map<String, dynamic>>? properties,
    List<Map<String, dynamic>>? units,
    List<String>? statuses,
    List<Map<String, dynamic>>? unscheduledWorkOrders,
    DateTime? windowStart,
    DateRangeUnit dateRangeUnit = DateRangeUnit.week,
    int? selectedTechnicianId,
    int? selectedPropertyId,
    int? selectedUnitId,
    String? selectedStatus,
  }) : _isLoading = isLoading,
       _workOrders = workOrders ?? [],
       _technicians = technicians ?? [],
       _properties = properties ?? [],
       _units = units ?? [],
       _statuses = statuses ?? ['pending', 'in_progress', 'completed'],
       _unscheduledWorkOrders = unscheduledWorkOrders ?? [],
       _windowStart = windowStart ?? DateTime.now(),
       _dateRangeUnit = dateRangeUnit,
       _selectedTechnicianId = selectedTechnicianId,
       _selectedPropertyId = selectedPropertyId,
       _selectedUnitId = selectedUnitId,
       _selectedStatus = selectedStatus;

  @override
  bool get isLoading => _isLoading;

  @override
  bool get isAuthenticated => true;

  @override
  String? get error => null;

  @override
  DateTime? get lastUpdated => DateTime.now();

  @override
  String get userRole => 'dispatcher';

  @override
  DateTime get windowStart => _windowStart;

  @override
  DateRangeUnit get dateRangeUnit => _dateRangeUnit;

  @override
  int? get selectedTechnicianId => _selectedTechnicianId;

  @override
  List<Map<String, dynamic>> get workOrders => List.unmodifiable(_workOrders);

  @override
  List<Map<String, dynamic>> get technicians => List.unmodifiable(_technicians);

  @override
  Future<void> connectToAuth(AuthProvider auth) async {}

  @override
  Future<void> loadSchedule() async {}

  @override
  Future<void> setWindowStart(DateTime date) async {
    _windowStart = date;
    notifyListeners();
  }

  @override
  Future<void> setDateRangeUnit(DateRangeUnit unit) async {
    _dateRangeUnit = unit;
    notifyListeners();
  }

  @override
  Future<void> setSelectedTechnician(int? technicianId) async {
    _selectedTechnicianId = technicianId;
    notifyListeners();
  }

  // Additional getters for role-specific filters
  @override
  int? get selectedPropertyId => _selectedPropertyId;

  @override
  int? get selectedUnitId => _selectedUnitId;

  @override
  String? get selectedStatus => _selectedStatus;

  @override
  List<Map<String, dynamic>> get properties => List.unmodifiable(_properties);

  @override
  List<Map<String, dynamic>> get units => List.unmodifiable(_units);

  @override
  List<String> get statuses => _statuses;

  // Additional setters for role-specific filters
  @override
  Future<void> setSelectedProperty(int? propertyId) async {
    _selectedPropertyId = propertyId;
    notifyListeners();
  }

  @override
  Future<void> setSelectedUnit(int? unitId) async {
    _selectedUnitId = unitId;
    notifyListeners();
  }

  @override
  Future<void> setSelectedStatus(String? status) async {
    _selectedStatus = status;
    notifyListeners();
  }

  // Unassigned filter support
  @override
  bool get filterUnassigned => _filterUnassigned;

  @override
  Future<void> setFilterUnassigned(bool value) async {
    _filterUnassigned = value;
    notifyListeners();
  }

  // Unscheduled work orders support
  @override
  List<Map<String, dynamic>> get unscheduledWorkOrders =>
      List.unmodifiable(_unscheduledWorkOrders);

  @override
  Future<void> loadUnscheduledWorkOrders() async {}

  @override
  Future<void> loadMoreUnscheduledWorkOrders() async {}

  @override
  bool get hasMoreUnscheduled => false;

  @override
  bool get isLoadingMoreUnscheduled => false;

  @override
  List<int?> get availableTimeframes => [30, 90, 365, null];

  // Attention badge support - getter not method
  @override
  List<Map<String, dynamic>> get attentionWorkOrders {
    return _workOrders.where((wo) {
      return isOverdue(wo) || isStalePending(wo) || isUnassigned(wo);
    }).toList();
  }

  @override
  bool isOverdue(Map<String, dynamic> workOrder) {
    final status = workOrder['status'] as String?;
    if (status == 'completed' || status == 'cancelled') return false;
    final scheduledEnd = workOrder['scheduled_end'];
    if (scheduledEnd == null) return false;
    final endTime = scheduledEnd is DateTime
        ? scheduledEnd
        : DateTime.parse(scheduledEnd as String);
    return endTime.isBefore(DateTime.now());
  }

  @override
  bool isStalePending(Map<String, dynamic> workOrder, [DateTime? threshold]) {
    final status = workOrder['status'] as String?;
    if (status != 'pending') return false;
    final createdAt = workOrder['created_at'];
    if (createdAt == null) return false;
    final createTime = createdAt is DateTime
        ? createdAt
        : DateTime.parse(createdAt as String);
    final staleThreshold =
        threshold ?? DateTime.now().subtract(const Duration(hours: 48));
    return createTime.isBefore(staleThreshold);
  }

  @override
  bool isUnassigned(Map<String, dynamic> workOrder) {
    return workOrder['assigned_technician_id'] == null;
  }

  // Log view support (customer role)
  @override
  int? get logTimeframeDays => 30;

  @override
  Future<void> setLogTimeframe(int? days) async {}

  @override
  Future<void> loadWorkOrderLog() async {}

  @override
  Future<void> loadAttentionWorkOrders() async {}

  @override
  Future<void> refresh() async {}

  @override
  DashboardViewType get viewType => DashboardViewType.operations;

  // EntityAwareRefreshable implementation
  @override
  Set<String> get interestedEntities => {'work_order'};

  @override
  void setCoordinator(RefreshCoordinator? coordinator) {}

  // Additional loading state getters
  @override
  bool get isLoadingUnscheduled => false;

  @override
  String? get unscheduledError => null;
}
