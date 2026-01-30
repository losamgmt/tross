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
/// - Listens to AuthProvider to auto-load on login
///
/// ARCHITECTURE:
/// - dashboard-config.json specifies which entities to show
/// - EntityMetadataRegistry provides display names, icons, and value colors
/// - StatsService.countGrouped() fetches distribution data
/// - This provider stores GroupedCount lists per entity
/// - DashboardContent renders DistributionPieChart for each entity
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

// =============================================================================
// PROVIDER
// =============================================================================

/// Provider for config-driven chart dashboard
class DashboardProvider extends ChangeNotifier {
  StatsService? _statsService;

  /// Map of entity name -> grouped count data for charts
  final Map<String, List<GroupedCount>> _chartData = {};

  /// Set of entities currently loading
  final Set<String> _loadingEntities = {};

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

  /// Whether stats are being loaded
  bool get isLoading => _isLoading;

  /// Whether stats have been loaded at least once
  bool get isLoaded => _lastUpdated != null;

  /// Current error message (null if no error)
  String? get error => _error;

  /// When stats were last refreshed
  DateTime? get lastUpdated => _lastUpdated;

  /// Get the current user's role
  /// Defaults to 'customer' if no auth provider connected
  String get _userRole => _authProvider?.userRole ?? 'customer';

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

  /// Refresh stats (alias for loadStats with force refresh semantics)
  Future<void> refresh() async {
    await loadStats();
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
