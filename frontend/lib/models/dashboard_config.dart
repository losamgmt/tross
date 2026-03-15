/// Dashboard Configuration Models - Role-Based Views
///
/// Type-safe models for dashboard-config.json
/// Uses minimal config + entity metadata for emergent behavior.
///
/// DESIGN PRINCIPLES:
/// - Role-based view types: log (customer), schedule (tech), operations (dispatcher+)
/// - Config only specifies WHICH entities and chart types
/// - Display names, icons come from EntityMetadataRegistry
/// - Status colors come from EntityMetadataRegistry (enum value colors)
/// - Role priority comes from UserRole enum
library;

import 'package:flutter/foundation.dart';
import 'date_range_unit.dart';
import 'permission.dart';

// =============================================================================
// VIEW TYPE ENUM
// =============================================================================

/// Dashboard view type per role
enum DashboardViewType {
  /// Work order history log (customer)
  log,

  /// Assigned schedule view (technician)
  schedule,

  /// Full operations center (dispatcher+)
  operations;

  static DashboardViewType fromString(String? value) {
    return switch (value?.toLowerCase()) {
      'log' => DashboardViewType.log,
      'schedule' => DashboardViewType.schedule,
      'operations' => DashboardViewType.operations,
      _ => DashboardViewType.schedule,
    };
  }
}

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

/// Configuration for a single schedule filter
///
/// Supports two role matching patterns (DRY principle):
/// - `roles`: Explicit list of roles that can see this filter
/// - `minRole`: Minimum role priority (role and all higher roles)
///
/// Examples:
/// - { "field": "property_id", "roles": ["customer"] } → Only customers
/// - { "field": "assigned_technician_id", "minRole": "dispatcher" } → Dispatcher+
@immutable
class ScheduleFilterConfig {
  /// Database field to filter on (e.g., 'property_id', 'status')
  final String field;

  /// Display label for the filter (defaults to title-cased field name)
  final String label;

  /// Explicit list of roles that can see this filter (null = use minRole)
  final List<UserRole>? roles;

  /// Minimum role priority - role and all higher roles see this filter
  final UserRole? minRole;

  /// Field this filter depends on (for cascading dropdowns)
  final String? dependsOn;

  /// Entity to fetch options from (for relationship fields)
  final String? optionsEntity;

  const ScheduleFilterConfig({
    required this.field,
    required this.label,
    this.roles,
    this.minRole,
    this.dependsOn,
    this.optionsEntity,
  });

  factory ScheduleFilterConfig.fromJson(Map<String, dynamic> json) {
    final fieldName = json['field'] as String;
    final labelStr = json['label'] as String?;

    // Parse roles list if provided
    List<UserRole>? roleList;
    if (json['roles'] != null) {
      roleList = (json['roles'] as List<dynamic>)
          .map((r) => UserRole.fromString(r as String))
          .whereType<UserRole>()
          .toList();
    }

    // Parse minRole if provided
    UserRole? minRoleValue;
    if (json['minRole'] != null) {
      minRoleValue = UserRole.fromString(json['minRole'] as String);
    }

    return ScheduleFilterConfig(
      field: fieldName,
      label: labelStr ?? _titleCase(fieldName),
      roles: roleList,
      minRole: minRoleValue,
      dependsOn: json['dependsOn'] as String?,
      optionsEntity: json['optionsEntity'] as String?,
    );
  }

  /// Check if this filter is visible to a given role
  ///
  /// Uses hierarchical matching:
  /// 1. If `roles` is specified: exact match in list
  /// 2. If `minRole` is specified: role priority >= minRole priority
  /// 3. If neither: visible to all
  bool isVisibleTo(UserRole role) {
    // Explicit role list takes precedence
    if (roles != null && roles!.isNotEmpty) {
      return roles!.contains(role);
    }

    // Min role check: current role and all higher roles
    if (minRole != null) {
      return role.priority >= minRole!.priority;
    }

    // No restrictions - visible to all
    return true;
  }

  /// Convert snake_case to Title Case
  static String _titleCase(String input) {
    return input
        .replaceAll('_id', '')
        .replaceAll('_', ' ')
        .split(' ')
        .map(
          (w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '',
        )
        .join(' ');
  }
}

/// Schedule section configuration for dashboard
///
/// Configures the schedule/calendar view embedded in dashboard.
/// Type-safe: stores UserRole and DateRangeUnit, parsed once on load.
///
/// ROLE-BASED FILTERS (DRY Hierarchical Pattern):
/// Each filter specifies which roles can see it:
/// - Customer: property, unit, status filters (their own work orders)
/// - Technician: no filters (just assigned work orders)
/// - Dispatcher+: technician filter (all work orders)
@immutable
class ScheduleConfig {
  /// Default date range unit - type-safe enum, no invalid states
  final DateRangeUnit defaultDateRangeUnit;

  /// Minimum role required to see schedule - parsed once, not repeatedly
  final UserRole minRole;

  /// Role-specific filter configurations (replaces showTechnicianFilter)
  final List<ScheduleFilterConfig> filters;

  /// Columns to display in table view (immutable list)
  final List<String> displayColumns;

  const ScheduleConfig({
    this.defaultDateRangeUnit = DateRangeUnit.week,
    this.minRole = UserRole.customer,
    this.filters = const [],
    this.displayColumns = const ['work_order_number', 'name', 'status'],
  });

  factory ScheduleConfig.fromJson(Map<String, dynamic> json) {
    // Parse once - no runtime re-parsing
    final unitStr = json['defaultDateRangeUnit'] as String? ?? 'week';
    final roleStr = json['minRole'] as String? ?? 'customer';

    // Parse filters array
    final filtersJson = json['filters'] as List<dynamic>? ?? [];
    final filtersList = filtersJson
        .map((f) => ScheduleFilterConfig.fromJson(f as Map<String, dynamic>))
        .toList();

    // Legacy support: convert showTechnicianFilter to new filters format
    if (filtersJson.isEmpty && json['showTechnicianFilter'] == true) {
      filtersList.add(
        const ScheduleFilterConfig(
          field: 'assigned_technician_id',
          label: 'Technician',
          minRole: UserRole.dispatcher,
          optionsEntity: 'technician',
        ),
      );
    }

    return ScheduleConfig(
      defaultDateRangeUnit:
          DateRangeUnit.fromString(unitStr) ?? DateRangeUnit.week,
      minRole: UserRole.fromString(roleStr) ?? UserRole.customer,
      filters: List<ScheduleFilterConfig>.unmodifiable(filtersList),
      displayColumns: List<String>.unmodifiable(
        (json['displayColumns'] as List<dynamic>?)
                ?.map((e) => e as String)
                .toList() ??
            const ['work_order_number', 'name', 'status'],
      ),
    );
  }

  /// Check if a role has access to schedule
  bool isVisibleTo(UserRole role) => role.priority >= minRole.priority;

  /// Get filters visible to a specific role
  ///
  /// Returns only the filters that the given role is allowed to see.
  /// Used by dashboard_content to render role-appropriate filter UI.
  List<ScheduleFilterConfig> getFiltersForRole(UserRole role) {
    return filters.where((f) => f.isVisibleTo(role)).toList();
  }

  /// Legacy getter for backward compatibility
  @Deprecated('Use getFiltersForRole instead')
  bool get showTechnicianFilter =>
      filters.any((f) => f.field == 'assigned_technician_id');
}

// =============================================================================
// ROLE VIEW CONFIG
// =============================================================================

/// Configuration for a role's dashboard view type
@immutable
class RoleViewConfig {
  /// View type: log, schedule, or operations
  final DashboardViewType type;

  /// Title to display for this view
  final String title;

  /// Default timeframe for log view in days (null = all time)
  final int? defaultTimeframe;

  /// Available timeframes for log view in days (null = all time)
  final List<int?> timeframes;

  const RoleViewConfig({
    required this.type,
    required this.title,
    this.defaultTimeframe,
    this.timeframes = const [],
  });

  factory RoleViewConfig.fromJson(Map<String, dynamic> json) {
    // Parse timeframes array - can contain ints or nulls
    final timeframesJson = json['timeframes'] as List<dynamic>?;
    final timeframesList = timeframesJson?.map((e) => e as int?).toList() ?? [];

    return RoleViewConfig(
      type: DashboardViewType.fromString(json['type'] as String?),
      title: json['title'] as String? ?? 'Dashboard',
      defaultTimeframe: json['defaultTimeframe'] as int?,
      timeframes: List<int?>.unmodifiable(timeframesList),
    );
  }
}

// =============================================================================
// ATTENTION BANNER CONFIG
// =============================================================================

/// Configuration for the attention banner (dispatcher+ only)
@immutable
class AttentionBannerConfig {
  /// Minimum role to see attention banner
  final UserRole minRole;

  /// Hours after which pending work orders are considered stale
  final int stalePendingHours;

  /// Whether banner starts expanded
  final bool initiallyExpanded;

  const AttentionBannerConfig({
    this.minRole = UserRole.dispatcher,
    this.stalePendingHours = 48,
    this.initiallyExpanded = true,
  });

  factory AttentionBannerConfig.fromJson(Map<String, dynamic> json) {
    return AttentionBannerConfig(
      minRole:
          UserRole.fromString(json['minRole'] as String?) ??
          UserRole.dispatcher,
      stalePendingHours: json['stalePendingHours'] as int? ?? 48,
      initiallyExpanded: json['initiallyExpanded'] as bool? ?? true,
    );
  }

  /// Check if a role can see the attention banner
  bool isVisibleTo(UserRole role) => role.priority >= minRole.priority;
}

// =============================================================================
// UNSCHEDULED QUEUE CONFIG
// =============================================================================

/// Configuration for the unscheduled work orders queue (dispatcher+ only)
@immutable
class UnscheduledQueueConfig {
  /// Minimum role to see unscheduled queue
  final UserRole minRole;

  /// Title for the queue panel
  final String title;

  /// Maximum items to display
  final int maxItems;

  /// Items per page for pagination
  final int pageSize;

  /// Enable pagination (load more button)
  final bool paginated;

  const UnscheduledQueueConfig({
    this.minRole = UserRole.dispatcher,
    this.title = 'Unscheduled',
    this.maxItems = 20,
    this.pageSize = 20,
    this.paginated = false,
  });

  factory UnscheduledQueueConfig.fromJson(Map<String, dynamic> json) {
    return UnscheduledQueueConfig(
      minRole:
          UserRole.fromString(json['minRole'] as String?) ??
          UserRole.dispatcher,
      title: json['title'] as String? ?? 'Unscheduled',
      maxItems: json['maxItems'] as int? ?? 20,
      pageSize: json['pageSize'] as int? ?? 20,
      paginated: json['paginated'] as bool? ?? false,
    );
  }

  /// Check if a role can see the unscheduled queue
  bool isVisibleTo(UserRole role) => role.priority >= minRole.priority;
}

// =============================================================================
// MAIN DASHBOARD CONFIG
// =============================================================================

/// Complete dashboard configuration
class DashboardConfig {
  /// Config version
  final String version;

  /// Entities to display on dashboard
  final List<DashboardEntityConfig> entities;

  /// Schedule section configuration (optional - null if not enabled)
  final ScheduleConfig? schedule;

  /// Role-specific view configurations
  final Map<UserRole, RoleViewConfig> roleViews;

  /// Attention banner configuration (dispatcher+)
  final AttentionBannerConfig? attentionBanner;

  /// Unscheduled queue configuration (dispatcher+)
  final UnscheduledQueueConfig? unscheduledQueue;

  const DashboardConfig({
    required this.version,
    required this.entities,
    this.schedule,
    this.roleViews = const {},
    this.attentionBanner,
    this.unscheduledQueue,
  });

  factory DashboardConfig.fromJson(Map<String, dynamic> json) {
    final entitiesJson = json['entities'] as List<dynamic>? ?? [];
    final entities = entitiesJson
        .map((e) => DashboardEntityConfig.fromJson(e as Map<String, dynamic>))
        .toList();

    // Sort by order
    entities.sort((a, b) => a.order.compareTo(b.order));

    // Parse schedule config if present
    final scheduleJson = json['schedule'] as Map<String, dynamic>?;
    final schedule = scheduleJson != null
        ? ScheduleConfig.fromJson(scheduleJson)
        : null;

    // Parse role views
    final roleViewsJson = json['roleViews'] as Map<String, dynamic>? ?? {};
    final roleViews = <UserRole, RoleViewConfig>{};
    for (final entry in roleViewsJson.entries) {
      final role = UserRole.fromString(entry.key);
      if (role != null) {
        roleViews[role] = RoleViewConfig.fromJson(
          entry.value as Map<String, dynamic>,
        );
      }
    }

    // Parse attention banner
    final attentionJson = json['attentionBanner'] as Map<String, dynamic>?;
    final attentionBanner = attentionJson != null
        ? AttentionBannerConfig.fromJson(attentionJson)
        : null;

    // Parse unscheduled queue
    final unscheduledJson = json['unscheduledQueue'] as Map<String, dynamic>?;
    final unscheduledQueue = unscheduledJson != null
        ? UnscheduledQueueConfig.fromJson(unscheduledJson)
        : null;

    return DashboardConfig(
      version: json['version'] as String? ?? '1.0.0',
      entities: entities,
      schedule: schedule,
      roleViews: roleViews,
      attentionBanner: attentionBanner,
      unscheduledQueue: unscheduledQueue,
    );
  }

  /// Get the view configuration for a role
  ///
  /// Falls back to schedule view if role not configured.
  RoleViewConfig getViewForRole(UserRole role) {
    return roleViews[role] ??
        const RoleViewConfig(
          type: DashboardViewType.schedule,
          title: 'Dashboard',
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
