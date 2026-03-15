/// ScheduleProvider - Schedule/Calendar data management for dashboard
///
/// Manages work order schedule viewing with role-based filter controls.
/// Composes LoadingStateManager and AuthConnectionManager for state/auth lifecycle.
/// Implements EntityAwareRefreshable for coordinated refresh.
///
/// DESIGN:
/// - Embeds in DashboardContent, not a separate screen
/// - Uses GenericEntityService for data (no new service)
/// - Config-driven via ScheduleConfig in dashboard-config.json
/// - Role-based views: Customer=Log, Technician=Schedule, Dispatcher+=Operations
/// - Backend RLS handles data access (customer=own, technician=assigned, dispatcher+=all)
/// - RefreshCoordinator enables coordinated refresh with DashboardProvider
///
/// ATTENTION CONDITIONS (dispatcher+ only):
/// - Overdue: scheduled_end < now AND status NOT IN (completed, cancelled)
/// - Stale: status = pending AND created_at < now - stalePendingHours
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/dashboard_config.dart';
import '../models/date_range_unit.dart';
import '../models/permission.dart';
import '../services/dashboard_config_loader.dart';
import '../services/generic_entity_service.dart';
import 'auth_provider.dart';
import 'interfaces/refreshable.dart';
import 'managers/auth_connection_manager.dart';
import 'managers/loading_state_manager.dart';
import 'refresh_coordinator.dart';

/// Schedule provider for dashboard work order calendar/list view
///
/// Composes:
/// - LoadingStateManager for loading/error/lastUpdated state
/// - AuthConnectionManager for auth lifecycle (login → load, logout → clear)
///
/// Implements EntityAwareRefreshable for coordinated refresh.
///
/// Role-based view support:
/// - Customer: Work order log with timeframe filter
/// - Technician: Assigned schedule (their work orders via RLS)
/// - Dispatcher+: Operations center with attention banner + unscheduled queue
///
/// Usage:
/// ```dart
/// final provider = context.watch<ScheduleProvider>();
/// if (provider.isLoading) return LoadingIndicator();
/// return WorkOrderTable(data: provider.workOrders);
/// ```
class ScheduleProvider extends ChangeNotifier
    implements EntityAwareRefreshable {
  late final LoadingStateManager _loadingManager;
  AuthConnectionManager? _authManager;
  final GenericEntityService _entityService;
  RefreshCoordinator? _coordinator;

  // ===========================================================================
  // FILTER STATE
  // ===========================================================================

  // Date range filters (all roles)
  DateRangeUnit _dateRangeUnit = DateRangeUnit.week;
  late DateTime _windowStart = _dateRangeUnit.naturalStart;

  // Customer log timeframe (days: 7, 30, 90, or null for all)
  int? _logTimeframeDays = 30;

  // Customer filters
  int? _selectedPropertyId;
  int? _selectedUnitId;
  String? _selectedStatus;

  // Dispatcher+ filters
  int? _selectedTechnicianId;
  bool _filterUnassigned = false;

  // ===========================================================================
  // OPTIONS DATA (for filter dropdowns)
  // ===========================================================================

  List<Map<String, dynamic>> _properties = [];
  List<Map<String, dynamic>> _units = [];
  List<Map<String, dynamic>> _technicians = [];

  // Work order statuses (from entity metadata or hardcoded)
  static const List<String> _workOrderStatuses = [
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
  ];

  // ===========================================================================
  // DATA STATE
  // ===========================================================================

  List<Map<String, dynamic>> _workOrders = [];
  List<Map<String, dynamic>> _unscheduledWorkOrders = [];
  List<Map<String, dynamic>> _attentionWorkOrders = [];

  // Pagination state for unscheduled queue
  int _unscheduledPage = 1;
  bool _hasMoreUnscheduled = false;
  bool _isLoadingMoreUnscheduled = false;

  // Separate loading state for unscheduled queue (to allow parallel loading)
  // This is needed because loadSchedule and loadUnscheduledWorkOrders can run
  // in parallel during refresh(), but _loadingManager blocks concurrent calls.
  bool _isLoadingUnscheduled = false;
  String? _unscheduledError;

  // Stale pending threshold from config (default 48 hours)
  int _stalePendingHours = 48;

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  ScheduleProvider(this._entityService) {
    _loadingManager = LoadingStateManager(notifyListeners);
    // AuthConnectionManager created in setCoordinator (deferred initialization)
  }

  /// Set the RefreshCoordinator for coordinated refresh
  ///
  /// Called by ChangeNotifierProxyProvider update function.
  /// Must be called before connectToAuth.
  void setCoordinator(RefreshCoordinator? coordinator) {
    _coordinator = coordinator;
  }

  // ===========================================================================
  // EntityAwareRefreshable IMPLEMENTATION
  // ===========================================================================

  /// Entities this provider cares about
  ///
  /// Currently just work_order - refresh when work orders change.
  @override
  Set<String> get interestedEntities => {'work_order'};

  // ===========================================================================
  // AUTH LIFECYCLE
  // ===========================================================================

  /// Connect to auth provider for lifecycle management
  ///
  /// Creates AuthConnectionManager with coordinator for auto-registration.
  /// Triggers initial load if already authenticated.
  Future<void> connectToAuth(AuthProvider auth) {
    // Create AuthConnectionManager with coordinator for registration
    _authManager = AuthConnectionManager(
      onLogin: _onLogin,
      onLogout: _clearData,
      coordinator: _coordinator,
      refreshable: this,
    );
    return _authManager!.connect(auth);
  }

  Future<void> _onLogin() async {
    // Load config values
    _loadConfigValues();

    // Graceful degradation: option load failures shouldn't block schedule
    try {
      await _loadFilterOptions();
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load filter options: $e');
    }

    // Load data based on role
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role == null) return;

    final viewType = _getViewTypeForRole(role);
    switch (viewType) {
      case DashboardViewType.log:
        await loadWorkOrderLog();
      case DashboardViewType.schedule:
        await loadSchedule();
      case DashboardViewType.operations:
        // Load scheduled, unscheduled, and attention (all parallel)
        await Future.wait([
          loadSchedule(),
          loadUnscheduledWorkOrders(),
          loadAttentionWorkOrders(),
        ]);
    }
  }

  /// Load configuration values from dashboard config
  void _loadConfigValues() {
    final attentionConfig = DashboardConfigService.config.attentionBanner;
    if (attentionConfig != null) {
      _stalePendingHours = attentionConfig.stalePendingHours;
    }

    // Load default timeframe from role view config
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role != null) {
      final roleView = DashboardConfigService.config.getViewForRole(role);
      if (roleView.defaultTimeframe != null) {
        _logTimeframeDays = roleView.defaultTimeframe;
      }
    }
  }

  /// Get the view type for a role from config
  DashboardViewType _getViewTypeForRole(UserRole role) {
    final roleView = DashboardConfigService.config.getViewForRole(role);
    return roleView.type;
  }

  /// Load filter options based on user role
  ///
  /// Only loads options for filters the user can actually see.
  /// This prevents permission errors (e.g., customers can't read technicians).
  Future<void> _loadFilterOptions() async {
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role == null) return;

    final config = DashboardConfigService.config.schedule;
    if (config == null) return;

    final visibleFilters = config.getFiltersForRole(role);
    final futures = <Future<void>>[];

    // Only load options for filters this role can see
    for (final filter in visibleFilters) {
      switch (filter.field) {
        case 'property_id':
          futures.add(_loadProperties());
        case 'assigned_technician_id':
          futures.add(_loadTechnicians());
        // unit_id loaded on-demand when property selected
        // status uses static list, no load needed
      }
    }

    if (futures.isNotEmpty) {
      await Future.wait(futures);
    }
  }

  Future<void> _loadProperties() async {
    try {
      final result = await _entityService.getAll('property', limit: 100);
      _properties = result.data;
      notifyListeners();
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load properties: $e');
    }
  }

  /// Load units for a selected property
  Future<void> _loadUnitsForProperty(int propertyId) async {
    try {
      final result = await _entityService.getAll(
        'unit',
        filters: {'property_id': propertyId},
        limit: 100,
      );
      _units = result.data;
      notifyListeners();
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load units: $e');
    }
  }

  Future<void> _loadTechnicians() async {
    try {
      final result = await _entityService.getAll(
        'technician',
        filters: {'is_active': true},
        limit: 100,
      );
      _technicians = result.data;
      notifyListeners();
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load technicians: $e');
    }
  }

  void _clearData() {
    _workOrders = [];
    _unscheduledWorkOrders = [];
    _attentionWorkOrders = [];
    _unscheduledPage = 1;
    _hasMoreUnscheduled = false;
    _isLoadingMoreUnscheduled = false;
    _isLoadingUnscheduled = false;
    _unscheduledError = null;
    _properties = [];
    _units = [];
    _technicians = [];
    _selectedPropertyId = null;
    _selectedUnitId = null;
    _selectedStatus = null;
    _selectedTechnicianId = null;
    _filterUnassigned = false;
    _logTimeframeDays = 30;
    _loadingManager.reset();
    notifyListeners();
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /// Whether schedule data is currently loading
  bool get isLoading => _loadingManager.isLoading;

  /// Whether unscheduled queue is currently loading (separate from main loading)
  bool get isLoadingUnscheduled => _isLoadingUnscheduled;

  /// Current error message (null if no error)
  String? get error => _loadingManager.error;

  /// Unscheduled queue error message (null if no error)
  String? get unscheduledError => _unscheduledError;

  /// When schedule was last successfully loaded
  DateTime? get lastUpdated => _loadingManager.lastUpdated;

  /// Current user's role from auth provider
  String get userRole => _authManager?.userRole ?? 'customer';

  /// Whether user is authenticated
  bool get isAuthenticated => _authManager?.isAuthenticated ?? false;

  /// Get the view type for current user
  DashboardViewType get viewType {
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role == null) return DashboardViewType.schedule;
    return _getViewTypeForRole(role);
  }

  // ===========================================================================
  // FILTER GETTERS - Date Range (all roles)
  // ===========================================================================

  /// Start date of current view window
  DateTime get windowStart => _windowStart;

  /// Current date range unit (day/week/month)
  DateRangeUnit get dateRangeUnit => _dateRangeUnit;

  /// Log timeframe in days (customer view)
  int? get logTimeframeDays => _logTimeframeDays;

  // ===========================================================================
  // FILTER GETTERS - Customer filters
  // ===========================================================================

  /// Currently selected property ID (null = all)
  int? get selectedPropertyId => _selectedPropertyId;

  /// Currently selected unit ID (null = all)
  int? get selectedUnitId => _selectedUnitId;

  /// Currently selected status (null = all)
  String? get selectedStatus => _selectedStatus;

  // ===========================================================================
  // FILTER GETTERS - Dispatcher+ filters
  // ===========================================================================

  /// Currently selected technician ID filter (null = all)
  int? get selectedTechnicianId => _selectedTechnicianId;

  /// Whether filtering for unassigned work orders only
  bool get filterUnassigned => _filterUnassigned;

  // ===========================================================================
  // OPTIONS GETTERS (for filter dropdowns)
  // ===========================================================================

  /// Available properties for filter dropdown
  List<Map<String, dynamic>> get properties => List.unmodifiable(_properties);

  /// Available units for filter dropdown (filtered by selected property)
  List<Map<String, dynamic>> get units => List.unmodifiable(_units);

  /// Available technicians for filter dropdown
  List<Map<String, dynamic>> get technicians => List.unmodifiable(_technicians);

  /// Available work order statuses for filter dropdown
  List<String> get statuses => _workOrderStatuses;

  // ===========================================================================
  // FILTER SETTERS - Date Range (Async - trigger reload)
  // ===========================================================================

  /// Set start date and reload schedule
  Future<void> setWindowStart(DateTime date) async {
    _windowStart = date;
    await loadSchedule();
  }

  /// Set date range unit and reload schedule.
  /// Also updates windowStart to the new unit's natural start date.
  Future<void> setDateRangeUnit(DateRangeUnit unit) async {
    _dateRangeUnit = unit;
    _windowStart = unit.naturalStart;
    await loadSchedule();
  }

  /// Set log timeframe and reload (customer view)
  Future<void> setLogTimeframe(int? days) async {
    _logTimeframeDays = days;
    await loadWorkOrderLog();
  }

  // ===========================================================================
  // FILTER SETTERS - Customer filters (Async - trigger reload)
  // ===========================================================================

  /// Set property filter and reload schedule
  /// Also clears unit filter (cascading dependency) and loads units for property
  Future<void> setSelectedProperty(int? propertyId) async {
    _selectedPropertyId = propertyId;
    _selectedUnitId = null; // Clear dependent unit filter
    _units = []; // Clear units until loaded

    if (propertyId != null) {
      await _loadUnitsForProperty(propertyId);
    }

    await loadSchedule();
  }

  /// Set unit filter and reload schedule
  Future<void> setSelectedUnit(int? unitId) async {
    _selectedUnitId = unitId;
    await loadSchedule();
  }

  /// Set status filter and reload schedule
  Future<void> setSelectedStatus(String? status) async {
    _selectedStatus = status;
    await loadSchedule();
  }

  // ===========================================================================
  // FILTER SETTERS - Dispatcher+ filters (Async - trigger reload)
  // ===========================================================================

  /// Set technician filter and reload schedule
  Future<void> setSelectedTechnician(int? technicianId) async {
    _selectedTechnicianId = technicianId;
    _filterUnassigned = false; // Clear unassigned when selecting a technician
    await loadSchedule();
  }

  /// Set filter to show only unassigned work orders
  Future<void> setFilterUnassigned(bool value) async {
    _filterUnassigned = value;
    if (value) {
      _selectedTechnicianId =
          null; // Clear technician when filtering unassigned
    }
    await loadSchedule();
  }

  // ===========================================================================
  // DATA GETTERS
  // ===========================================================================

  /// Work orders in current view window (unmodifiable)
  List<Map<String, dynamic>> get workOrders => List.unmodifiable(_workOrders);

  /// Unscheduled work orders (dispatcher+ only)
  List<Map<String, dynamic>> get unscheduledWorkOrders =>
      List.unmodifiable(_unscheduledWorkOrders);

  /// Whether there are more unscheduled work orders to load
  bool get hasMoreUnscheduled => _hasMoreUnscheduled;

  /// Whether currently loading more unscheduled work orders
  bool get isLoadingMoreUnscheduled => _isLoadingMoreUnscheduled;

  /// Available timeframes for log view (from config)
  List<int?> get availableTimeframes {
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role == null) return [30, 90, 365, null];
    final roleView = DashboardConfigService.config.getViewForRole(role);
    return roleView.timeframes.isNotEmpty
        ? roleView.timeframes
        : [30, 90, 365, null];
  }

  /// Work orders that need attention (overdue, stale, or unassigned)
  ///
  /// Loaded independently via loadAttentionWorkOrders() - NOT constrained by
  /// schedule date filters. This ensures the attention banner shows ALL items
  /// needing attention regardless of the current schedule view window.
  ///
  /// Attention conditions:
  /// - Overdue: scheduled_end < now AND status NOT IN (completed, cancelled)
  /// - Stale: status = pending AND created_at < now - stalePendingHours
  /// - Unassigned: scheduled_start is set but assigned_technician_id is null
  List<Map<String, dynamic>> get attentionWorkOrders =>
      List.unmodifiable(_attentionWorkOrders);

  /// Check if a work order is overdue
  bool isOverdue(Map<String, dynamic> workOrder) {
    final status = workOrder['status'] as String?;
    if (status == 'completed' || status == 'cancelled') return false;

    final scheduledEnd = workOrder['scheduled_end'];
    if (scheduledEnd == null) return false;

    final endDate = scheduledEnd is DateTime
        ? scheduledEnd
        : DateTime.tryParse(scheduledEnd.toString());
    if (endDate == null) return false;

    return endDate.isBefore(DateTime.now());
  }

  /// Check if a work order is stale pending
  bool isStalePending(Map<String, dynamic> workOrder, [DateTime? threshold]) {
    final status = workOrder['status'] as String?;
    if (status != 'pending') return false;

    final createdAt = workOrder['created_at'];
    if (createdAt == null) return false;

    final createdDate = createdAt is DateTime
        ? createdAt
        : DateTime.tryParse(createdAt.toString());
    if (createdDate == null) return false;

    final staleThreshold =
        threshold ??
        DateTime.now().subtract(Duration(hours: _stalePendingHours));
    return createdDate.isBefore(staleThreshold);
  }

  /// Check if a scheduled work order is unassigned
  bool isUnassigned(Map<String, dynamic> workOrder) {
    final scheduledStart = workOrder['scheduled_start'];
    if (scheduledStart == null) return false; // Not scheduled

    final technicianId = workOrder['assigned_technician_id'];
    return technicianId == null;
  }

  // ===========================================================================
  // DATA LOADING
  // ===========================================================================

  /// Load schedule data with current filters
  ///
  /// Called automatically on login, filter changes.
  /// Public for manual refresh (pull-to-refresh, refresh button).
  Future<void> loadSchedule() async {
    await _loadingManager.runAsync(() async {
      final filters = _buildScheduleFilters();
      final result = await _entityService.getAll(
        'work_order',
        filters: filters,
        sortBy: 'scheduled_start',
        sortOrder: 'ASC',
      );
      _workOrders = result.data;
    }, errorMessage: 'Failed to load schedule');
  }

  /// Load unscheduled work orders (dispatcher+ only)
  ///
  /// Unscheduled = no scheduled_start set + not completed/cancelled
  /// Resets pagination state.
  ///
  /// NOTE: Uses separate loading state (_isLoadingUnscheduled) instead of
  /// _loadingManager to allow parallel loading with loadSchedule() during
  /// refresh(). The shared _loadingManager.runAsync() blocks concurrent calls.
  Future<void> loadUnscheduledWorkOrders() async {
    // Prevent concurrent loads
    if (_isLoadingUnscheduled) return;

    _isLoadingUnscheduled = true;
    _unscheduledError = null;
    notifyListeners();

    try {
      final config = DashboardConfigService.config.unscheduledQueue;
      final pageSize = config?.pageSize ?? config?.maxItems ?? 20;

      // Reset pagination
      _unscheduledPage = 1;

      final result = await _entityService.getAll(
        'work_order',
        page: 1,
        limit: pageSize,
        filters: {
          'scheduled_start[null]': true,
          'status[in]': ['pending', 'scheduled', 'in_progress'],
        },
        sortBy: 'created_at',
        sortOrder: 'ASC',
      );

      _unscheduledWorkOrders = result.data;
      _hasMoreUnscheduled = result.hasMore;
    } catch (e) {
      _unscheduledError = 'Failed to load unscheduled work orders';
      debugPrint('ScheduleProvider: $_unscheduledError: $e');
    } finally {
      _isLoadingUnscheduled = false;
      notifyListeners();
    }
  }

  /// Load more unscheduled work orders (pagination)
  ///
  /// Appends to existing list. No-op if already loading or no more results.
  Future<void> loadMoreUnscheduledWorkOrders() async {
    if (_isLoadingMoreUnscheduled || !_hasMoreUnscheduled) return;

    _isLoadingMoreUnscheduled = true;
    notifyListeners();

    try {
      final config = DashboardConfigService.config.unscheduledQueue;
      final pageSize = config?.pageSize ?? config?.maxItems ?? 20;

      final result = await _entityService.getAll(
        'work_order',
        page: _unscheduledPage + 1,
        limit: pageSize,
        filters: {
          'scheduled_start[null]': true,
          'status[in]': ['pending', 'scheduled', 'in_progress'],
        },
        sortBy: 'created_at',
        sortOrder: 'ASC',
      );

      _unscheduledWorkOrders = [..._unscheduledWorkOrders, ...result.data];
      _hasMoreUnscheduled = result.hasMore;
      _unscheduledPage++;
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load more unscheduled: $e');
    } finally {
      _isLoadingMoreUnscheduled = false;
      notifyListeners();
    }
  }

  /// Load work order log for customer view
  ///
  /// Shows all work orders within the selected timeframe, sorted by date descending.
  Future<void> loadWorkOrderLog() async {
    await _loadingManager.runAsync(() async {
      final filters = <String, dynamic>{
        // Customer filters (if any)
        if (_selectedPropertyId != null) 'property_id': _selectedPropertyId,
        if (_selectedUnitId != null) 'unit_id': _selectedUnitId,
        if (_selectedStatus != null) 'status': _selectedStatus,
      };

      // Apply timeframe filter if set (null = all time)
      if (_logTimeframeDays != null) {
        final startDate = DateTime.now().subtract(
          Duration(days: _logTimeframeDays!),
        );
        filters['created_at[gte]'] = startDate.toIso8601String();
      }

      final result = await _entityService.getAll(
        'work_order',
        filters: filters,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      );
      _workOrders = result.data;
    }, errorMessage: 'Failed to load work order history');
  }

  /// Refresh all data for current view type (implements Refreshable.refresh)
  @override
  Future<void> refresh() async {
    final role = UserRole.fromString(_authManager?.userRole ?? 'customer');
    if (role == null) return;

    final viewType = _getViewTypeForRole(role);
    switch (viewType) {
      case DashboardViewType.log:
        await loadWorkOrderLog();
      case DashboardViewType.schedule:
        await loadSchedule();
      case DashboardViewType.operations:
        await Future.wait([
          loadSchedule(),
          loadUnscheduledWorkOrders(),
          loadAttentionWorkOrders(),
        ]);
    }
  }

  /// Load work orders that need attention (independent of schedule filters)
  ///
  /// Fetches ALL non-closed work orders and filters client-side for:
  /// - Overdue (scheduled_end < now)
  /// - Stale pending (pending > stalePendingHours)
  /// - Unassigned but scheduled
  ///
  /// Uses separate loading to allow parallel execution with loadSchedule().
  Future<void> loadAttentionWorkOrders() async {
    try {
      // Fetch all non-completed, non-cancelled work orders
      // No date range filter - attention is global
      final result = await _entityService.getAll(
        'work_order',
        filters: {'status[nin]': 'completed,cancelled'},
        sortBy: 'scheduled_start',
        sortOrder: 'ASC',
      );

      final now = DateTime.now();
      final staleThreshold = now.subtract(Duration(hours: _stalePendingHours));

      // Filter to only items that actually need attention
      _attentionWorkOrders = result.data.where((wo) {
        return isOverdue(wo) ||
            isStalePending(wo, staleThreshold) ||
            isUnassigned(wo);
      }).toList();

      notifyListeners();
    } catch (e) {
      debugPrint('ScheduleProvider: Failed to load attention work orders: $e');
    }
  }

  Map<String, dynamic> _buildScheduleFilters() {
    final endDate = _dateRangeUnit.endDate(_windowStart);

    // Filter for work orders that START within the visible window
    // This catches all work scheduled to begin during this period
    return {
      'scheduled_start[gte]': _windowStart.toIso8601String(),
      'scheduled_start[lte]': endDate.toIso8601String(),
      // Customer filters
      if (_selectedPropertyId != null) 'property_id': _selectedPropertyId,
      if (_selectedUnitId != null) 'unit_id': _selectedUnitId,
      if (_selectedStatus != null) 'status': _selectedStatus,
      // Dispatcher+ filters
      if (_filterUnassigned)
        'assigned_technician_id[null]': true
      else if (_selectedTechnicianId != null)
        'assigned_technician_id': _selectedTechnicianId,
    };
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  @override
  void dispose() {
    _authManager?.dispose();
    super.dispose();
  }
}
