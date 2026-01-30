/// Dashboard Configuration Models - Minimal & Generic
///
/// Type-safe models for dashboard-config.json
/// Uses minimal config + entity metadata for emergent behavior.
///
/// DESIGN PRINCIPLES:
/// - Config only specifies WHICH entities and chart types
/// - Display names, icons come from EntityMetadataRegistry
/// - Status colors come from EntityMetadataRegistry (enum value colors)
/// - Role priority comes from UserRole enum
library;

import 'permission.dart';

/// Chart type for dashboard entity display
enum DashboardChartType {
  /// Bar chart showing distribution by a field - DEFAULT
  bar,

  /// Pie chart showing distribution by a field
  pie;

  static DashboardChartType fromString(String? value) {
    return switch (value?.toLowerCase()) {
      'bar' => DashboardChartType.bar,
      'pie' || 'distribution' => DashboardChartType.pie,
      _ => DashboardChartType.bar, // Default to bar
    };
  }
}

/// Single entity configuration for dashboard
///
/// Minimal: just entity name, role visibility, and what to show.
/// Everything else comes from EntityMetadataRegistry.
class DashboardEntityConfig {
  /// Entity name (e.g., 'work_order', 'invoice')
  /// Used to look up metadata from EntityMetadataRegistry
  final String entity;

  /// Minimum role required to see this entity on dashboard
  final String minRole;

  /// Field to group by for distribution chart (e.g., 'status')
  final String groupBy;

  /// Chart type to display
  final DashboardChartType chartType;

  /// Display order (lower = first)
  final int order;

  const DashboardEntityConfig({
    required this.entity,
    required this.minRole,
    required this.groupBy,
    this.chartType = DashboardChartType.bar,
    this.order = 0,
  });

  factory DashboardEntityConfig.fromJson(Map<String, dynamic> json) {
    return DashboardEntityConfig(
      entity: json['entity'] as String,
      minRole: json['minRole'] as String? ?? 'customer',
      groupBy: json['groupBy'] as String? ?? 'status',
      chartType: DashboardChartType.fromString(json['chartType'] as String?),
      order: json['order'] as int? ?? 0,
    );
  }

  /// Get the minimum role as UserRole enum
  UserRole? get minUserRole => UserRole.fromString(minRole);

  /// Get the role priority for comparison
  int get rolePriority => minUserRole?.priority ?? 0;
}

/// Complete dashboard configuration
class DashboardConfig {
  /// Config version
  final String version;

  /// Entities to display on dashboard
  final List<DashboardEntityConfig> entities;

  const DashboardConfig({required this.version, required this.entities});

  factory DashboardConfig.fromJson(Map<String, dynamic> json) {
    final entitiesJson = json['entities'] as List<dynamic>? ?? [];
    final entities = entitiesJson
        .map((e) => DashboardEntityConfig.fromJson(e as Map<String, dynamic>))
        .toList();

    // Sort by order
    entities.sort((a, b) => a.order.compareTo(b.order));

    return DashboardConfig(
      version: json['version'] as String? ?? '1.0.0',
      entities: entities,
    );
  }

  /// Get entities visible to a given role
  ///
  /// Uses UserRole.priority for comparison - no switch statements!
  List<DashboardEntityConfig> getEntitiesForRole(String role) {
    final userRole = UserRole.fromString(role);
    final userPriority = userRole?.priority ?? 0;

    return entities.where((e) => userPriority >= e.rolePriority).toList();
  }

  /// Get all entity names configured for dashboard
  List<String> get allEntityNames => entities.map((e) => e.entity).toList();
}
