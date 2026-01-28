/// DashboardProvider - Reactive State Management for Dashboard Stats
///
/// SOLE RESPONSIBILITY: Provide reactive dashboard stats to UI
///
/// This provider:
/// - Loads all dashboard stats from StatsService
/// - Provides reactive access to stats values
/// - Handles loading/error states gracefully
/// - Listens to AuthProvider to auto-load on login
/// - Supports manual refresh
///
/// STATS LOADED:
/// - Work Orders: total, pending, in_progress, completed
/// - Financial: revenue (paid invoices), outstanding (sent invoices), active contracts
/// - Resources: customers, available technicians, low stock items, active users
///
/// USAGE:
/// ```dart
/// // In main.dart MultiProvider:
/// ChangeNotifierProvider(create: (_) => DashboardProvider())
///
/// // Connect to auth provider (in _AppWithRouter):
/// dashboardProvider.connectToAuth(authProvider);
///
/// // In widgets:
/// Consumer<DashboardProvider>(
///   builder: (context, dashboard, _) {
///     if (dashboard.isLoading) return LoadingSpinner();
///     return Text('${dashboard.workOrderStats.total} Work Orders');
///   }
/// )
/// ```
library;

import 'package:flutter/foundation.dart';
import '../services/stats_service.dart';
import '../services/error_service.dart';
import '../models/permission.dart';
import 'auth_provider.dart';

/// Work order statistics
@immutable
class WorkOrderStats {
  final int total;
  final int pending;
  final int inProgress;
  final int completed;

  const WorkOrderStats({
    this.total = 0,
    this.pending = 0,
    this.inProgress = 0,
    this.completed = 0,
  });

  static const empty = WorkOrderStats();
}

/// Financial statistics
@immutable
class FinancialStats {
  final double revenue;
  final double outstanding;
  final int activeContracts;

  const FinancialStats({
    this.revenue = 0.0,
    this.outstanding = 0.0,
    this.activeContracts = 0,
  });

  static const empty = FinancialStats();
}

/// Resource overview statistics
@immutable
class ResourceStats {
  final int customers;
  final int availableTechnicians;
  final int lowStockItems;
  final int activeUsers;

  const ResourceStats({
    this.customers = 0,
    this.availableTechnicians = 0,
    this.lowStockItems = 0,
    this.activeUsers = 0,
  });

  static const empty = ResourceStats();
}

/// Provider for reactive dashboard stats
class DashboardProvider extends ChangeNotifier {
  StatsService? _statsService;

  WorkOrderStats _workOrderStats = WorkOrderStats.empty;
  FinancialStats _financialStats = FinancialStats.empty;
  ResourceStats _resourceStats = ResourceStats.empty;

  bool _isLoading = false;
  String? _error;
  DateTime? _lastUpdated;

  // Auth provider reference for listening to auth changes
  AuthProvider? _authProvider;
  bool _wasAuthenticated = false;

  /// Set the StatsService dependency
  void setStatsService(StatsService statsService) {
    _statsService = statsService;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Work order statistics
  WorkOrderStats get workOrderStats => _workOrderStats;

  /// Financial statistics
  FinancialStats get financialStats => _financialStats;

  /// Resource overview statistics
  ResourceStats get resourceStats => _resourceStats;

  /// Whether stats are being loaded
  bool get isLoading => _isLoading;

  /// Whether stats have been loaded at least once
  bool get isLoaded => _lastUpdated != null;

  /// Current error message (null if no error)
  String? get error => _error;

  /// When stats were last refreshed
  DateTime? get lastUpdated => _lastUpdated;

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// Connect to AuthProvider to auto-load stats on login
  ///
  /// Call this once after providers are created (in _AppWithRouter).
  void connectToAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    _wasAuthenticated = authProvider.isAuthenticated;

    authProvider.addListener(_onAuthChanged);

    // If already authenticated, load stats
    if (authProvider.isAuthenticated) {
      loadStats();
    }
  }

  void _onAuthChanged() {
    final isNowAuthenticated = _authProvider?.isAuthenticated ?? false;

    if (!_wasAuthenticated && isNowAuthenticated) {
      // Just logged in - load stats
      loadStats();
    } else if (_wasAuthenticated && !isNowAuthenticated) {
      // Just logged out - clear stats
      _clearStats();
    }

    _wasAuthenticated = isNowAuthenticated;
  }

  void _clearStats() {
    _workOrderStats = WorkOrderStats.empty;
    _financialStats = FinancialStats.empty;
    _resourceStats = ResourceStats.empty;
    _lastUpdated = null;
    _error = null;
    notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  // TODO(dashboard): Customize dashboard content per role:
  // - Customer: Only work orders and customer info
  // - Technician: Add inventory stats, available jobs
  // - Dispatcher+: Full financial stats visibility
  // - Admin: All resources including user management stats

  /// Load all dashboard stats from backend
  ///
  /// Loads work order, financial, and resource stats in parallel.
  /// Safe to call multiple times - handles concurrent calls gracefully.
  Future<void> loadStats() async {
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Load all stats in parallel for performance
      await Future.wait([
        _loadWorkOrderStats(),
        _loadFinancialStats(),
        _loadResourceStats(),
      ]);

      _lastUpdated = DateTime.now();
      _error = null;

      ErrorService.logDebug(
        'Dashboard stats loaded',
        context: {
          'workOrders': _workOrderStats.total,
          'revenue': _financialStats.revenue,
          'customers': _resourceStats.customers,
        },
      );
    } catch (e) {
      _error = 'Failed to load dashboard stats';
      ErrorService.logError('Dashboard stats load failed', error: e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh stats (alias for loadStats with force refresh semantics)
  Future<void> refresh() async {
    await loadStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE LOADERS
  // ═══════════════════════════════════════════════════════════════════════════

  Future<void> _loadWorkOrderStats() async {
    if (_statsService == null) return;

    try {
      final results = await Future.wait([
        _statsService!.count('work_order'),
        _statsService!.count('work_order', filters: {'status': 'pending'}),
        _statsService!.count('work_order', filters: {'status': 'in_progress'}),
        _statsService!.count('work_order', filters: {'status': 'completed'}),
      ]);

      _workOrderStats = WorkOrderStats(
        total: results[0],
        pending: results[1],
        inProgress: results[2],
        completed: results[3],
      );
    } catch (e) {
      ErrorService.logWarning(
        'Failed to load work order stats',
        context: {'error': e.toString()},
      );
      // Keep previous values on error
    }
  }

  /// Check if the current user can read a specific resource
  bool _canRead(ResourceType resource) {
    return _authProvider?.hasPermission(resource, CrudOperation.read) ?? false;
  }

  Future<void> _loadFinancialStats() async {
    if (_statsService == null) return;

    // Financial stats require dispatcher+ role for invoice/contract access
    final canViewInvoice = _canRead(ResourceType.invoices);
    final canViewContract = _canRead(ResourceType.contracts);

    if (!canViewInvoice && !canViewContract) {
      // No financial permissions - skip entirely
      return;
    }

    try {
      final futures = <Future<dynamic>>[
        canViewInvoice
            ? _statsService!.sum(
                'invoice',
                'total',
                filters: {'status': 'paid'},
              )
            : Future.value(0.0),
        canViewInvoice
            ? _statsService!.sum(
                'invoice',
                'total',
                filters: {'status': 'sent'},
              )
            : Future.value(0.0),
        canViewContract
            ? _statsService!.count('contract', filters: {'status': 'active'})
            : Future.value(0),
      ];

      final results = await Future.wait(futures);

      _financialStats = FinancialStats(
        revenue: results[0] as double,
        outstanding: results[1] as double,
        activeContracts: results[2] as int,
      );
    } catch (e) {
      ErrorService.logWarning(
        'Failed to load financial stats',
        context: {'error': e.toString()},
      );
      // Keep previous values on error
    }
  }

  Future<void> _loadResourceStats() async {
    if (_statsService == null) return;

    // Check permissions for each resource
    final canViewCustomer = _canRead(ResourceType.customers);
    final canViewTechnician = _canRead(ResourceType.technicians);
    final canViewInventory = _canRead(ResourceType.inventory);
    final canViewUser = _canRead(ResourceType.users);

    try {
      final futures = <Future<int>>[
        canViewCustomer ? _statsService!.count('customer') : Future.value(0),
        canViewTechnician
            ? _statsService!.count(
                'technician',
                filters: {'status': 'available'},
              )
            : Future.value(0),
        canViewInventory
            ? _statsService!.count(
                'inventory',
                filters: {'status': 'low_stock'},
              )
            : Future.value(0),
        canViewUser
            ? _statsService!.count('user', filters: {'status': 'active'})
            : Future.value(0),
      ];

      final results = await Future.wait(futures);

      _resourceStats = ResourceStats(
        customers: results[0],
        availableTechnicians: results[1],
        lowStockItems: results[2],
        activeUsers: results[3],
      );
    } catch (e) {
      ErrorService.logWarning(
        'Failed to load resource stats',
        context: {'error': e.toString()},
      );
      // Keep previous values on error
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  void dispose() {
    _authProvider?.removeListener(_onAuthChanged);
    super.dispose();
  }
}
