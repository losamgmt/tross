import 'package:flutter/foundation.dart';

import '../services/error_service.dart';
import 'interfaces/refreshable.dart';

/// RefreshCoordinator - Central registry and orchestration for refreshable providers
///
/// DESIGN PRINCIPLES:
/// - Single Source of Truth: All coordination goes through here
/// - Self-Registration: Providers register/unregister themselves
/// - Best-Effort: Errors are logged, not thrown - partial success is OK
/// - Entity-Aware: Supports both refreshAll() and refreshForEntity()
///
/// LIFECYCLE:
/// 1. Created FIRST in widget tree (no dependencies)
/// 2. Providers register via AuthConnectionManager or directly
/// 3. Coordinates refresh operations across all registered providers
/// 4. Providers unregister on dispose
///
/// USAGE:
/// ```dart
/// // In main.dart - create first
/// ChangeNotifierProvider(create: (_) => RefreshCoordinator()),
///
/// // In provider - register via AuthConnectionManager
/// AuthConnectionManager(
///   coordinator: coordinator,
///   refreshable: this,
///   ...
/// );
///
/// // In UI - refresh all
/// await context.read<RefreshCoordinator>().refreshAll();
///
/// // In handlers - targeted refresh
/// await context.read<RefreshCoordinator>().refreshForEntity('work_order');
/// ```
class RefreshCoordinator extends ChangeNotifier {
  /// Registry of all entity-aware refreshable providers
  ///
  /// Uses Set to prevent duplicates if same provider registers twice.
  /// Stores weak-ish references (provider is held by widget tree, we just reference)
  final Set<EntityAwareRefreshable> _registry = {};

  /// Whether any refresh operation is in progress
  bool _isRefreshing = false;
  bool get isRefreshing => _isRefreshing;

  /// Register a provider for coordinated refresh
  ///
  /// Called automatically by AuthConnectionManager when provider
  /// implements EntityAwareRefreshable.
  ///
  /// Safe to call multiple times - uses Set semantics.
  void register(EntityAwareRefreshable refreshable) {
    final added = _registry.add(refreshable);
    if (added) {
      ErrorService.logDebug(
        'RefreshCoordinator: Registered provider',
        context: {
          'type': refreshable.runtimeType.toString(),
          'entities': refreshable.interestedEntities.toList(),
          'total': _registry.length,
        },
      );
    }
  }

  /// Unregister a provider from coordinated refresh
  ///
  /// Called automatically by AuthConnectionManager.dispose().
  /// Safe to call if not registered - no-op.
  void unregister(EntityAwareRefreshable refreshable) {
    final removed = _registry.remove(refreshable);
    if (removed) {
      ErrorService.logDebug(
        'RefreshCoordinator: Unregistered provider',
        context: {
          'type': refreshable.runtimeType.toString(),
          'remaining': _registry.length,
        },
      );
    }
  }

  /// Refresh ALL registered providers
  ///
  /// Use for:
  /// - Pull-to-refresh gestures
  /// - Full page refresh
  /// - After bulk operations
  ///
  /// Returns when all providers have completed refresh (or failed).
  /// Errors are logged but not thrown - best-effort approach.
  Future<void> refreshAll() async {
    if (_registry.isEmpty) {
      ErrorService.logDebug(
        'RefreshCoordinator: refreshAll() - no providers registered',
      );
      return;
    }

    _isRefreshing = true;
    notifyListeners();

    ErrorService.logInfo(
      'RefreshCoordinator: Starting refreshAll()',
      context: {'providerCount': _registry.length},
    );

    final errors = <String, Object>{};

    // Refresh all in parallel, collect errors
    await Future.wait(
      _registry.map((refreshable) async {
        try {
          await refreshable.refresh();
        } catch (e, stackTrace) {
          errors[refreshable.runtimeType.toString()] = e;
          ErrorService.logError(
            'RefreshCoordinator: Provider refresh failed',
            error: e,
            stackTrace: stackTrace,
            context: {'provider': refreshable.runtimeType.toString()},
          );
        }
      }),
    );

    _isRefreshing = false;
    notifyListeners();

    if (errors.isEmpty) {
      ErrorService.logInfo(
        'RefreshCoordinator: refreshAll() completed successfully',
      );
    } else {
      ErrorService.logWarning(
        'RefreshCoordinator: refreshAll() completed with errors',
        context: {'failedProviders': errors.keys.toList()},
      );
    }
  }

  /// Refresh providers interested in a specific entity
  ///
  /// Use for:
  /// - After creating/editing/deleting a specific entity
  /// - Surgical refresh (only what needs it)
  ///
  /// Example:
  /// ```dart
  /// // After editing a work order
  /// await coordinator.refreshForEntity('work_order');
  /// // Only ScheduleProvider and DashboardProvider refresh,
  /// // not NotificationsProvider (if it doesn't care about work_orders)
  /// ```
  Future<void> refreshForEntity(String entityName) async {
    // Find providers interested in this entity
    final interested = _registry
        .where((r) => r.interestedEntities.contains(entityName))
        .toList();

    if (interested.isEmpty) {
      ErrorService.logDebug(
        'RefreshCoordinator: No providers interested in entity',
        context: {'entity': entityName},
      );
      return;
    }

    _isRefreshing = true;
    notifyListeners();

    ErrorService.logInfo(
      'RefreshCoordinator: Starting refreshForEntity()',
      context: {
        'entity': entityName,
        'providers': interested.map((r) => r.runtimeType.toString()).toList(),
      },
    );

    final errors = <String, Object>{};

    // Refresh interested providers in parallel
    await Future.wait(
      interested.map((refreshable) async {
        try {
          await refreshable.refresh();
        } catch (e, stackTrace) {
          errors[refreshable.runtimeType.toString()] = e;
          ErrorService.logError(
            'RefreshCoordinator: Provider refresh failed',
            error: e,
            stackTrace: stackTrace,
            context: {
              'provider': refreshable.runtimeType.toString(),
              'entity': entityName,
            },
          );
        }
      }),
    );

    _isRefreshing = false;
    notifyListeners();

    if (errors.isEmpty) {
      ErrorService.logInfo(
        'RefreshCoordinator: refreshForEntity() completed successfully',
        context: {'entity': entityName},
      );
    } else {
      ErrorService.logWarning(
        'RefreshCoordinator: refreshForEntity() completed with errors',
        context: {
          'entity': entityName,
          'failedProviders': errors.keys.toList(),
        },
      );
    }
  }

  /// Refresh multiple entities at once
  ///
  /// Useful when an operation affects multiple entity types.
  /// Providers are deduplicated - each only refreshes once.
  Future<void> refreshForEntities(Set<String> entityNames) async {
    // Collect all interested providers, deduplicated
    final interestedSet = <EntityAwareRefreshable>{};
    for (final entity in entityNames) {
      interestedSet.addAll(
        _registry.where((r) => r.interestedEntities.contains(entity)),
      );
    }

    if (interestedSet.isEmpty) {
      ErrorService.logDebug(
        'RefreshCoordinator: No providers interested in entities',
        context: {'entities': entityNames.toList()},
      );
      return;
    }

    _isRefreshing = true;
    notifyListeners();

    ErrorService.logInfo(
      'RefreshCoordinator: Starting refreshForEntities()',
      context: {
        'entities': entityNames.toList(),
        'providers': interestedSet
            .map((r) => r.runtimeType.toString())
            .toList(),
      },
    );

    final errors = <String, Object>{};

    await Future.wait(
      interestedSet.map((refreshable) async {
        try {
          await refreshable.refresh();
        } catch (e, stackTrace) {
          errors[refreshable.runtimeType.toString()] = e;
          ErrorService.logError(
            'RefreshCoordinator: Provider refresh failed',
            error: e,
            stackTrace: stackTrace,
            context: {'provider': refreshable.runtimeType.toString()},
          );
        }
      }),
    );

    _isRefreshing = false;
    notifyListeners();
  }

  /// Get count of registered providers (for debugging)
  int get registeredCount => _registry.length;

  /// Get list of registered provider types (for debugging)
  List<String> get registeredTypes =>
      _registry.map((r) => r.runtimeType.toString()).toList();

  @override
  void dispose() {
    _registry.clear();
    super.dispose();
  }
}
