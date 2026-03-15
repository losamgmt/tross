/// Refreshable Interfaces - Generic refresh coordination contracts
///
/// DESIGN PRINCIPLES:
/// - Generic: Context-agnostic, usable by any provider
/// - Composable: Implement what you need (basic vs entity-aware)
/// - SRP: Single responsibility - "I can refresh myself"
///
/// INTERFACE HIERARCHY:
/// - Refreshable: Basic "I can refresh" contract
/// - EntityAwareRefreshable: "I care about specific entities"
///
/// USAGE:
/// ```dart
/// // Basic refreshable (not auto-coordinated)
/// class PreferencesProvider implements Refreshable { ... }
///
/// // Entity-aware (participates in coordinate refresh)
/// class ScheduleProvider implements EntityAwareRefreshable { ... }
/// ```
library;

/// Generic refreshable interface - completely context-agnostic
///
/// ANY provider that can refresh its data can implement this.
/// This is a pure SRP unit: "I can refresh myself."
///
/// NOTE: Providers implementing ONLY this (not EntityAwareRefreshable)
/// are NOT automatically included in coordinated refresh operations.
/// They can still be manually refreshed via their refresh() method.
abstract interface class Refreshable {
  /// Refresh/reload this provider's data
  ///
  /// Implementations should:
  /// - Be idempotent (safe to call multiple times)
  /// - Handle their own loading/error states
  /// - Not throw (handle errors internally)
  Future<void> refresh();
}

/// Extension: Entity-aware refreshable
///
/// For providers whose data changes when specific entities change.
/// Enables surgical refresh: when work_order changes, only providers
/// interested in work_order refresh - not everything.
///
/// Providers implementing this interface:
/// - Are included in RefreshCoordinator.refreshAll()
/// - Are included in RefreshCoordinator.refreshForEntity() when entity matches
///
/// EXAMPLES:
/// - ScheduleProvider: interested in {'work_order'}
/// - DashboardProvider: interested in {'work_order', 'invoice', 'contract'}
/// - NotificationsProvider: interested in {'notification', 'work_order'}
abstract interface class EntityAwareRefreshable implements Refreshable {
  /// Set of entity names this provider cares about
  ///
  /// When any of these entities change (create/update/delete),
  /// this provider should be refreshed.
  ///
  /// This can be:
  /// - Static: `{'work_order'}` (always the same)
  /// - Dynamic: `getVisibleEntities().map((e) => e.entity).toSet()`
  ///   (role-based or config-driven)
  Set<String> get interestedEntities;
}
