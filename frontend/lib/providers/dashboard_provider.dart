/// DashboardProvider - Config-Driven Chart Dashboard
///
/// SOLE RESPONSIBILITY: Load and provide reactive dashboard chart data
///
/// This provider:
/// - Reads dashboard-config.json for entity/chart definitions
/// - Uses countGrouped() for distribution pie charts
/// - Filters entities by user role (using UserRole.priority)
/// - RLS on backend automatically filters data per user's access level
/// - Handles loading/error states gracefully
/// - Uses AuthConnectionManager for auth lifecycle (DRY)
/// - Implements EntityAwareRefreshable for coordinated refresh
///
/// ARCHITECTURE:
/// - dashboard-config.json specifies which entities to show
/// - EntityMetadataRegistry provides display names, icons, and value colors
/// - StatsService.countGrouped() fetches distribution data
/// - This provider stores GroupedCount lists per entity
/// - DashboardContent renders DistributionPieChart for each entity
/// - RefreshCoordinator enables coordinated refresh with other providers
///
/// USAGE:
/// ```dart
/// // In main.dart MultiProvider:
/// ChangeNotifierProxyProvider<RefreshCoordinator, DashboardProvider>(
///   create: (_) => DashboardProvider(),
///   update: (_, coord, provider) =>
///     (provider ?? DashboardProvider())..setCoordinator(coord),
/// )
///
/// // Connect to auth provider (in _AppWithRouter):
/// dashboardProvider.connectToAuth(authProvider);
///
/// // In widgets:
/// Consumer<DashboardProvider>(
///   builder: (context, dashboard, _) {
///     final entities = dashboard.getVisibleEntities();
///     return Column(
///       children: entities.map((e) => DistributionPieChart(
///         title: metadata.displayNamePlural,
///         items: dashboard.getChartData(e.entity),
///       )).toList(),
///     );
///   }
/// )
/// ```
library;

import 'package:flutter/foundation.dart';
import '../models/dashboard_config.dart';
import '../services/dashboard_config_loader.dart';
import '../services/stats_service.dart';
import '../services/error_service.dart';
import 'auth_provider.dart';
import 'interfaces/refreshable.dart';
import 'managers/auth_connection_manager.dart';
import 'refresh_coordinator.dart';

// =============================================================================
// PROVIDER
// =============================================================================

/// Provider for config-driven chart dashboard
///
/// Implements EntityAwareRefreshable for coordinated refresh.
/// Uses AuthConnectionManager for DRY auth lifecycle handling.
class DashboardProvider extends ChangeNotifier
    implements EntityAwareRefreshable {
  StatsService? _statsService;
  RefreshCoordinator? _coordinator;
  AuthConnectionManager? _authManager;

  /// Map of entity name -> grouped count data for charts
  final Map<String, List<GroupedCount>> _chartData = {};

  /// Set of entities currently loading
  final Set<String> _loadingEntities = {};

  bool _isLoading = false;
  String? _error;
  DateTime? _lastUpdated;

  /// Set the StatsService dependency
  void setStatsService(StatsService statsService) {
    _statsService = statsService;
  }

  /// Set the RefreshCoordinator for coordinated refresh
  ///
  /// Called by ChangeNotifierProxyProvider update function.
  void setCoordinator(RefreshCoordinator? coordinator) {
    _coordinator = coordinator;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EntityAwareRefreshable IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// Entities this provider cares about (dynamic based on config)
  ///
  /// When any of these entities change, this provider should refresh.
  @override
  Set<String> get interestedEntities {
    return getVisibleEntities().map((e) => e.entity).toSet();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Whether stats are being loaded
  bool get isLoading => _isLoading;

  /// Whether stats have been loaded at least once
  bool get isLoaded => _lastUpdated != null;

  /// Current error message (null if no error)
  String? get error => _error;

  /// When stats were last refreshed
  DateTime? get lastUpdated => _lastUpdated;

  /// Get the current user's role
  /// Defaults to 'customer' if no auth manager connected
  String get _userRole => _authManager?.userRole ?? 'customer';

  /// Check if a specific entity is currently loading
  bool isEntityLoading(String entityName) =>
      _loadingEntities.contains(entityName);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG-DRIVEN API
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get entities visible to the current user
  ///
  /// Filters by minRole from config using UserRole.priority
  List<DashboardEntityConfig> getVisibleEntities() {
    if (!DashboardConfigService.isInitialized) {
      return [];
    }
    return DashboardConfigService.config.getEntitiesForRole(_userRole);
  }

  /// Get chart data for an entity
  ///
  /// Returns the grouped count data for rendering a distribution chart.
  List<GroupedCount> getChartData(String entityName) {
    return _chartData[entityName] ?? [];
  }

  /// Get total count for an entity (sum of all grouped values)
  int getTotalCount(String entityName) {
    final data = _chartData[entityName];
    if (data == null || data.isEmpty) return 0;
    return data.fold(0, (sum, item) => sum + item.count);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH INTEGRATION (via AuthConnectionManager)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Connect to AuthProvider for auto-load on login.
  ///
  /// Uses AuthConnectionManager for DRY lifecycle handling.
  /// Also registers with RefreshCoordinator for coordinated refresh.
  ///
  /// Call this once after providers are created (in _AppWithRouter).
  Future<void> connectToAuth(AuthProvider authProvider) async {
    _authManager = AuthConnectionManager(
      onLogin: loadStats,
      onLogout: _clearStats,
      coordinator: _coordinator,
      refreshable: this,
    );
    await _authManager!.connect(authProvider);
  }

  void _clearStats() {
    _chartData.clear();
    _loadingEntities.clear();
    _lastUpdated = null;
    _error = null;
    notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS LOADING (Config-Driven)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Load all dashboard chart data from backend based on config
  ///
  /// Reads visible entities from config and loads grouped counts for each.
  /// Data is loaded in parallel for performance.
  /// RLS on backend automatically filters data per user's access.
  Future<void> loadStats() async {
    if (_isLoading) return;
    if (_statsService == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Get entities visible to this user
      final entities = getVisibleEntities();

      // Load all entity chart data in parallel
      final futures = entities.map((entity) => _loadEntityData(entity));
      await Future.wait(futures);

      _lastUpdated = DateTime.now();
      _error = null;

      ErrorService.logDebug(
        'Dashboard chart data loaded',
        context: {'entitiesLoaded': entities.length, 'userRole': _userRole},
      );
    } catch (e) {
      _error = 'Failed to load dashboard data';
      ErrorService.logError('Dashboard load failed', error: e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load chart data for a single entity
  Future<void> _loadEntityData(DashboardEntityConfig entityConfig) async {
    if (_statsService == null) return;

    final entityName = entityConfig.entity;
    _loadingEntities.add(entityName);
    notifyListeners();

    try {
      final data = await _statsService!.countGrouped(
        entityName,
        entityConfig.groupBy,
      );

      _chartData[entityName] = data;
    } catch (e) {
      // Log warning but don't fail entire dashboard
      ErrorService.logWarning(
        'Failed to load chart data',
        context: {'entity': entityName, 'error': e.toString()},
      );
      // Keep previous value or set to empty
      _chartData[entityName] ??= [];
    } finally {
      _loadingEntities.remove(entityName);
      notifyListeners();
    }
  }

  /// Refresh stats (implements Refreshable.refresh)
  ///
  /// Also loaded initially via auth lifecycle (loadStats).
  @override
  Future<void> refresh() async {
    await loadStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  void dispose() {
    _authManager?.dispose();
    super.dispose();
  }
}
