/// Dashboard Content Widget - Role-Based Operations Center
///
/// Displays role-appropriate dashboard views:
/// - All roles: Entity charts (work orders grouped by status)
/// - All roles: Schedule section (data filtered via backend RLS)
/// - Dispatcher+: Attention banner (overdue/stale items, collapsible)
/// - Dispatcher+: Unscheduled queue sidebar
///
/// ARCHITECTURE:
/// - dashboard-config.json specifies entity charts and attention config
/// - ScheduleProvider provides schedule data with computed attention items
/// - CollapseController atom enables collapsible sections (composed inline)
/// - Backend RLS filters data per role (customers see own, techs see assigned, etc.)
///
/// ATTENTION CONDITIONS (computed, not status):
/// - Overdue: scheduled_end < NOW() AND status NOT IN (completed, cancelled)
/// - Stale: status = 'pending' AND created_at < NOW() - 48 hours (configurable)
/// - Unassigned warning: scheduled but no technician (row flag only)
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/table_column.dart';
import '../../models/dashboard_config.dart';
import '../../models/date_range_unit.dart';
import '../../models/permission.dart';
import '../../models/relationship.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/refresh_coordinator.dart';
import '../../providers/schedule_provider.dart';
import '../../services/dashboard_config_loader.dart';
import '../../services/entity_metadata.dart';
import '../../utils/entity_icon_resolver.dart';
import '../../utils/helpers/string_helper.dart';
import '../../utils/row_click_handlers.dart';
import '../atoms/indicators/app_badge.dart';
import '../atoms/indicators/loading_indicator.dart';
import '../atoms/inputs/date_input.dart';
import '../atoms/inputs/select_input.dart';
import '../atoms/interactions/collapse_controller.dart';
import '../atoms/interactions/collapse_toggle_icon.dart';
import '../molecules/containers/scrollable_content.dart';
import 'charts/dashboard_charts.dart';
import 'tables/filterable_data_table.dart';

/// Main dashboard content widget
class DashboardContent extends StatelessWidget {
  /// User's display name for welcome banner
  final String userName;

  const DashboardContent({super.key, required this.userName});

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final schedule = context.watch<ScheduleProvider>();
    final userRoleStr = context.read<AuthProvider>().userRole;
    final userRole = UserRole.fromString(userRoleStr);
    final isDispatcherPlus =
        userRole != null && userRole.priority >= UserRole.dispatcher.priority;

    if (dashboard.isLoading && !dashboard.isLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () async {
        // Use RefreshCoordinator for unified refresh of all dashboard providers
        await context.read<RefreshCoordinator>().refreshAll();
      },
      child: ScrollableContent(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dispatcher+: Attention Banner (collapsible)
            if (isDispatcherPlus) ...[
              _buildAttentionBanner(context, schedule),
              const SizedBox(height: 16),
            ],

            // All roles: Schedule + Unscheduled (side by side on desktop for dispatcher+)
            if (isDispatcherPlus)
              _buildDispatcherOperationsSection(context, schedule)
            else
              _buildScheduleSection(context, schedule),

            const SizedBox(height: 24),

            // Config-driven entity charts
            ...dashboard.getVisibleEntities().map(
              (entityConfig) => Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: _buildEntityChart(context, entityConfig, dashboard),
              ),
            ),

            if (dashboard.error != null)
              _buildErrorBanner(context, dashboard.error!),
            if (dashboard.lastUpdated != null)
              _buildLastUpdated(context, dashboard.lastUpdated!),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTENTION BANNER (Dispatcher+ only)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Attention banner - collapsible, green when empty, amber when items
  ///
  /// Composed using CollapseController atom - no new widget needed.
  Widget _buildAttentionBanner(
    BuildContext context,
    ScheduleProvider schedule,
  ) {
    final theme = Theme.of(context);
    final attentionItems = schedule.attentionWorkOrders;
    final hasItems = attentionItems.isNotEmpty;

    return CollapseController(
      initiallyExpanded: hasItems, // Expanded when items exist
      builder: (context, isExpanded, toggle, animation) {
        final headerColor = hasItems
            ? AppColors.warning.withValues(alpha: 0.15)
            : AppColors.success.withValues(alpha: 0.15);
        final iconColor = hasItems ? AppColors.warning : AppColors.success;

        return Card(
          child: Column(
            children: [
              // Header - always visible
              InkWell(
                onTap: toggle,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: headerColor,
                    borderRadius: isExpanded
                        ? const BorderRadius.vertical(top: Radius.circular(12))
                        : BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        hasItems ? Icons.warning_amber : Icons.check_circle,
                        color: iconColor,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          hasItems
                              ? 'Attention Required (${attentionItems.length})'
                              : '✓ All Clear',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: iconColor,
                          ),
                        ),
                      ),
                      CollapseToggleIcon(animation: animation, onTap: toggle),
                    ],
                  ),
                ),
              ),
              // Content - animated collapse
              SizeTransition(
                sizeFactor: animation,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: hasItems
                      ? _buildAttentionList(context, attentionItems, schedule)
                      : const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// List of attention items - clickable to open edit modal
  Widget _buildAttentionList(
    BuildContext context,
    List<Map<String, dynamic>> items,
    ScheduleProvider schedule,
  ) {
    final theme = Theme.of(context);

    return Column(
      children: items.map((wo) {
        final woNumber = wo['work_order_number'] ?? 'WO-???';
        final isOverdue = schedule.isOverdue(wo);
        final isUnassigned = schedule.isUnassigned(wo);

        // Priority: Overdue > Unassigned > Stale Pending
        final String label;
        final IconData icon;
        if (isOverdue) {
          label = 'Overdue';
          icon = Icons.schedule;
        } else if (isUnassigned) {
          label = 'Unassigned';
          icon = Icons.person_off;
        } else {
          label = 'Pending ${_daysOld(wo)} days';
          icon = Icons.hourglass_empty;
        }

        return InkWell(
          onTap: () => _openWorkOrderModal(context, wo, schedule),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Icon(icon, color: AppColors.warning, size: 18),
                const SizedBox(width: 8),
                Text(
                  woNumber.toString(),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.warning,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(Icons.chevron_right, color: theme.colorScheme.outline),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  int _daysOld(Map<String, dynamic> wo) {
    final createdAt = wo['created_at'];
    if (createdAt == null) return 0;
    final date = createdAt is DateTime
        ? createdAt
        : DateTime.tryParse(createdAt.toString());
    if (date == null) return 0;
    return DateTime.now().difference(date).inDays;
  }

  void _openWorkOrderModal(
    BuildContext context,
    Map<String, dynamic> wo,
    ScheduleProvider schedule,
  ) {
    final coordinator = context.read<RefreshCoordinator>();
    final handler = buildRowTapHandler(
      context: context,
      entityName: 'work_order',
      behavior: RowClickBehavior.modal,
      onSuccess: () => unawaited(coordinator.refreshForEntity('work_order')),
    );
    if (handler != null) handler(wo);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCHER OPERATIONS SECTION (Schedule + Unscheduled Queue)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Dispatcher+ layout: Schedule and Unscheduled queue side by side
  Widget _buildDispatcherOperationsSection(
    BuildContext context,
    ScheduleProvider schedule,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Side by side on desktop (≥900px), stacked on mobile
        if (constraints.maxWidth >= 900) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: _buildScheduleSection(context, schedule),
              ),
              const SizedBox(width: 16),
              Expanded(child: _buildUnscheduledQueue(context, schedule)),
            ],
          );
        } else {
          return Column(
            children: [
              _buildScheduleSection(context, schedule),
              const SizedBox(height: 16),
              _buildUnscheduledQueue(context, schedule),
            ],
          );
        }
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE SECTION (All roles, data filtered by RLS)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Schedule section with date filters and work order table
  Widget _buildScheduleSection(
    BuildContext context,
    ScheduleProvider schedule,
  ) {
    final theme = Theme.of(context);
    final config = DashboardConfigService.config.schedule;
    final userRoleStr = context.read<AuthProvider>().userRole;
    final userRole = UserRole.fromString(userRoleStr) ?? UserRole.customer;
    final isDispatcherPlus = userRole.priority >= UserRole.dispatcher.priority;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(
                  Icons.calendar_month,
                  color: theme.colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Schedule',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (!schedule.isLoading)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '${schedule.workOrders.length} items',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            // Toolbar
            _buildScheduleToolbar(context, schedule, isDispatcherPlus),
            const SizedBox(height: 8),
            // Content
            SizedBox(
              height: 350,
              child: schedule.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : schedule.error != null
                  ? _buildScheduleError(context, schedule.error!)
                  : schedule.workOrders.isEmpty
                  ? _buildScheduleEmpty(context)
                  : _buildScheduleTable(context, schedule, config),
            ),
          ],
        ),
      ),
    );
  }

  /// Schedule toolbar with date picker, range, and filters
  Widget _buildScheduleToolbar(
    BuildContext context,
    ScheduleProvider schedule,
    bool isDispatcherPlus,
  ) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  // Date picker
                  SizedBox(
                    width: 160,
                    child: DateInput(
                      value: schedule.windowStart,
                      onChanged: (date) {
                        if (date != null) {
                          unawaited(schedule.setWindowStart(date));
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Date range
                  SizedBox(
                    width: 120,
                    child: SelectInput<DateRangeUnit>(
                      value: schedule.dateRangeUnit,
                      items: DateRangeUnit.values,
                      onChanged: (unit) {
                        if (unit != null) {
                          unawaited(schedule.setDateRangeUnit(unit));
                        }
                      },
                      displayText: (unit) => unit.label,
                    ),
                  ),
                  // Technician filter (dispatcher+ only) with "Unassigned" first
                  if (isDispatcherPlus) ...[
                    const SizedBox(width: 8),
                    _buildTechnicianFilter(context, schedule),
                  ],
                ],
              ),
            ),
          ),
          IconButton(
            onPressed: () => unawaited(schedule.loadSchedule()),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
    );
  }

  /// Technician filter with "Unassigned" as FIRST option
  ///
  /// Filter states:
  /// - All (null techId, !filterUnassigned)
  /// - Unassigned (null techId, filterUnassigned=true)
  /// - Specific technician (techId set)
  Widget _buildTechnicianFilter(
    BuildContext context,
    ScheduleProvider schedule,
  ) {
    // Special sentinel value for "Unassigned" option
    const int unassignedSentinel = -1;

    // Determine current selection for dropdown
    final int? dropdownValue = schedule.filterUnassigned
        ? unassignedSentinel
        : schedule.selectedTechnicianId;

    // Build items: null (All), -1 (Unassigned), then technician IDs
    final items = <int?>[
      null, // All technicians
      unassignedSentinel, // Unassigned - problem scenario first
      ...schedule.technicians.map((t) => t['id'] as int),
    ];

    return SizedBox(
      width: 180,
      child: SelectInput<int?>(
        value: dropdownValue,
        items: items,
        onChanged: (value) {
          if (value == null) {
            // "All Technicians" - clear both filters
            unawaited(schedule.setFilterUnassigned(false));
          } else if (value == unassignedSentinel) {
            // "Unassigned" - set unassigned filter
            unawaited(schedule.setFilterUnassigned(true));
          } else {
            // Specific technician
            unawaited(schedule.setSelectedTechnician(value));
          }
        },
        displayText: (value) {
          if (value == null) return 'All Technicians';
          if (value == unassignedSentinel) return '⚠️ Unassigned';
          final tech = schedule.technicians.firstWhere(
            (t) => t['id'] == value,
            orElse: () => <String, dynamic>{},
          );
          final firstName = tech['first_name'] ?? '';
          final lastName = tech['last_name'] ?? '';
          return '$firstName $lastName'.trim();
        },
      ),
    );
  }

  /// Schedule table with unassigned warning flags
  Widget _buildScheduleTable(
    BuildContext context,
    ScheduleProvider schedule,
    ScheduleConfig? config,
  ) {
    final coordinator = context.read<RefreshCoordinator>();
    final columns = _buildScheduleColumns(
      config?.displayColumns ?? ['work_order_number', 'status'],
    );

    return FilterableDataTable<Map<String, dynamic>>(
      data: schedule.workOrders,
      columns: columns,
      onRowTap: buildRowTapHandler(
        context: context,
        entityName: 'work_order',
        behavior: RowClickBehavior.modal,
        onSuccess: () => unawaited(coordinator.refreshForEntity('work_order')),
      ),
      showCustomizationMenu: false,
    );
  }

  /// Build schedule columns with warning icons for unassigned rows
  List<TableColumn<Map<String, dynamic>>> _buildScheduleColumns(
    List<String> columnNames,
  ) {
    return columnNames.map((name) {
      // Special handling for work_order_number - add warning icon if unassigned
      if (name == 'work_order_number') {
        return TableColumn<Map<String, dynamic>>(
          id: name,
          label: 'Work Order',
          cellBuilder: (row) {
            final value = row[name]?.toString() ?? '';
            final isUnassigned =
                row['scheduled_start'] != null &&
                row['assigned_technician_id'] == null;

            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isUnassigned) ...[
                  Tooltip(
                    message: 'Scheduled but no technician assigned',
                    child: Icon(
                      Icons.warning_amber,
                      color: AppColors.warning,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Flexible(child: Text(value, overflow: TextOverflow.ellipsis)),
              ],
            );
          },
        );
      }

      return TableColumn<Map<String, dynamic>>(
        id: name,
        label: _titleCase(name),
        cellBuilder: (row) =>
            Text(row[name]?.toString() ?? '', overflow: TextOverflow.ellipsis),
      );
    }).toList();
  }

  String _titleCase(String name) {
    return name
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) {
          return w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '';
        })
        .join(' ');
  }

  Widget _buildScheduleEmpty(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available,
            size: 48,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(height: 8),
          Text(
            'No work orders scheduled for this period',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleError(BuildContext context, String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 8),
          Text(error, style: TextStyle(color: AppColors.error)),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNSCHEDULED QUEUE (Dispatcher+ only)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Unscheduled work orders queue - collapsible on mobile
  Widget _buildUnscheduledQueue(
    BuildContext context,
    ScheduleProvider schedule,
  ) {
    final theme = Theme.of(context);
    final items = schedule.unscheduledWorkOrders;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(Icons.inbox, color: theme.colorScheme.primary, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Unscheduled',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // Refresh button
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: schedule.isLoading
                      ? null
                      : () => unawaited(schedule.loadUnscheduledWorkOrders()),
                  tooltip: 'Refresh unscheduled',
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: items.isEmpty
                        ? theme.colorScheme.primaryContainer
                        : AppColors.warning.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    '${items.length}',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: items.isEmpty
                          ? theme.colorScheme.onPrimaryContainer
                          : AppColors.warning,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Content
            if (schedule.isLoadingUnscheduled)
              const Center(child: CircularProgressIndicator())
            else if (items.isEmpty)
              _buildUnscheduledEmpty(context)
            else
              SizedBox(
                height: 300,
                child: ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final wo = items[index];
                    return _buildUnscheduledItem(context, wo, schedule);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnscheduledItem(
    BuildContext context,
    Map<String, dynamic> wo,
    ScheduleProvider schedule,
  ) {
    final theme = Theme.of(context);
    final woNumber = wo['work_order_number'] ?? 'WO-???';
    final name = wo['name'] ?? '';
    final priority = wo['priority'] as String?;
    final priorityColor = _getPriorityColor(priority);

    return InkWell(
      onTap: () => _openWorkOrderModal(context, wo, schedule),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          children: [
            // Priority indicator
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(
                color: priorityColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    woNumber.toString(),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (name.toString().isNotEmpty)
                    Text(
                      name.toString(),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: theme.colorScheme.outline,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Color _getPriorityColor(String? priority) {
    return switch (priority) {
      'urgent' => AppColors.error,
      'high' => AppColors.warning,
      'normal' => AppColors.brandPrimary,
      'low' => AppColors.info,
      _ => AppColors.grey400,
    };
  }

  Widget _buildUnscheduledEmpty(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: 100,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle, size: 32, color: AppColors.success),
          const SizedBox(height: 8),
          Text(
            'All work orders scheduled',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }

  /// Build a chart for an entity - FULLY GENERIC
  Widget _buildEntityChart(
    BuildContext context,
    DashboardEntityConfig entityConfig,
    DashboardProvider dashboard,
  ) {
    final theme = Theme.of(context);

    // Get display info from metadata registry (static method)
    final metadata = EntityMetadataRegistry.tryGet(entityConfig.entity);
    final displayName =
        metadata?.displayNamePlural ??
        StringHelper.snakeToTitle(entityConfig.entity);
    final icon = metadata?.icon != null
        ? EntityIconResolver.fromString(metadata!.icon!)
        : Icons.bar_chart_outlined;

    // Check if this entity is still loading
    final isEntityLoading = dashboard.isEntityLoading(entityConfig.entity);

    // Get chart data from provider
    final chartData = dashboard.getChartData(entityConfig.entity);
    final totalCount = dashboard.getTotalCount(entityConfig.entity);

    // Convert to chart items with metadata-driven colors
    // EntityMetadataRegistry provides the color name, BadgeStyle converts to Color
    final groupByField = entityConfig.groupBy;
    final chartItems = chartData.map((item) {
      final colorName = EntityMetadataRegistry.getValueColor(
        entityConfig.entity,
        groupByField,
        item.value,
      );
      return _ChartItemData(
        label: StringHelper.snakeToTitle(item.value),
        value: item.count.toDouble(),
        color: BadgeStyle.fromName(colorName).color,
      );
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon and title
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    displayName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // Total count badge (or loading indicator)
                if (isEntityLoading)
                  SizedBox(
                    width: 80,
                    height: 24,
                    child: SkeletonLoader(width: 80, height: 24),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'Total: $totalCount',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            // Chart content: loading skeleton, empty state, or chart
            if (isEntityLoading)
              _buildChartSkeleton()
            else if (chartItems.isEmpty)
              _buildEmptyState(context, displayName)
            else
              _buildChart(entityConfig.chartType, chartItems),
          ],
        ),
      ),
    );
  }

  /// Build the appropriate chart type from config
  Widget _buildChart(DashboardChartType chartType, List<_ChartItemData> items) {
    switch (chartType) {
      case DashboardChartType.pie:
        return DistributionPieChart(
          title: '', // Title already shown in header
          items: items
              .map(
                (i) => PieChartItem(
                  label: i.label,
                  value: i.value,
                  color: i.color,
                ),
              )
              .toList(),
        );
      case DashboardChartType.bar:
        return ComparisonBarChart(
          title: '', // Title already shown in header
          items: items
              .map(
                (i) => BarChartItem(
                  label: i.label,
                  value: i.value,
                  color: i.color,
                ),
              )
              .toList(),
        );
    }
  }

  /// Loading skeleton composed from generic SkeletonLoader atoms
  Widget _buildChartSkeleton() {
    return SizedBox(
      height: 200,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // Simulate bar chart loading with varying height skeletons
          for (final height in [120.0, 80.0, 160.0, 100.0, 140.0])
            SkeletonLoader(width: 40, height: height),
        ],
      ),
    );
  }

  /// Empty state when no data
  Widget _buildEmptyState(BuildContext context, String entityName) {
    final theme = Theme.of(context);
    return Container(
      height: 200,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 48,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(height: 8),
          Text(
            'No $entityName data available',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }

  /// Error banner
  Widget _buildErrorBanner(BuildContext context, String error) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: AppColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(error, style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  /// Last updated timestamp
  Widget _buildLastUpdated(BuildContext context, DateTime lastUpdated) {
    final theme = Theme.of(context);
    final formatted = _formatDateTime(lastUpdated);

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sync,
            size: 14,
            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(width: 4),
          Text(
            'Updated $formatted',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Format date time
  String _formatDateTime(DateTime dt) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = months[dt.month - 1];
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$month ${dt.day}, $hour:${dt.minute.toString().padLeft(2, '0')} $period';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PRIVATE DATA CLASSES
// ═════════════════════════════════════════════════════════════════════════════

/// Internal chart item data - unifies bar/pie chart data
class _ChartItemData {
  final String label;
  final double value;
  final Color color;

  const _ChartItemData({
    required this.label,
    required this.value,
    required this.color,
  });
}
