/// AttentionRule - Self-describing rule for work order attention conditions
///
/// DESIGN PATTERN: Specification Pattern
/// Each rule encapsulates its own predicate AND metadata (label, icon, priority).
/// This eliminates duplicate logic between filtering and display.
///
/// BENEFITS:
/// - Single source of truth for attention conditions
/// - No re-evaluation needed at display time
/// - Easy to add/modify/reorder rules
/// - Supports multiple simultaneous violations
///
/// USAGE:
/// ```dart
/// // Get all violated rules for a work order
/// final violations = AttentionRules.getViolations(workOrder);
///
/// // Check if any rule is violated
/// if (violations.isNotEmpty) {
///   showAttentionBadge();
/// }
///
/// // Get primary (highest priority) violation
/// final primary = AttentionRules.getPrimaryViolation(workOrder);
/// Text(primary?.label ?? 'OK');
/// ```
library;

import 'package:flutter/material.dart';

import '../utils/datetime_utils.dart';

/// A self-describing attention rule
///
/// Immutable specification that knows:
/// - How to test if a work order violates this rule
/// - What label/icon to display
/// - Its priority relative to other rules
class AttentionRule {
  /// Display label (e.g., 'Overdue', 'Unassigned')
  final String label;

  /// Icon to display with this violation
  final IconData icon;

  /// Priority (lower = more urgent, displayed first)
  final int priority;

  /// Color for the violation badge/chip
  final Color color;

  /// Test function: does this work order violate this rule?
  ///
  /// Takes the work order and current time (for testability).
  /// The stalePendingHours parameter is passed for the stale rule.
  final bool Function(
    Map<String, dynamic> workOrder,
    DateTime now,
    int stalePendingHours,
  )
  test;

  const AttentionRule({
    required this.label,
    required this.icon,
    required this.priority,
    required this.color,
    required this.test,
  });
}

/// Work order with its evaluated attention violations
///
/// Stores violations WITH the data so display never re-evaluates.
class AttentionItem {
  /// The work order data
  final Map<String, dynamic> workOrder;

  /// All rules this work order violates (sorted by priority)
  final List<AttentionRule> violations;

  const AttentionItem({required this.workOrder, required this.violations});

  /// The highest-priority violation (for primary display)
  AttentionRule? get primaryViolation =>
      violations.isNotEmpty ? violations.first : null;

  /// Convenience accessors
  int get id => workOrder['id'] as int;
  String get workOrderNumber =>
      workOrder['work_order_number']?.toString() ?? 'WO-???';
}

/// Central registry of attention rules
///
/// SINGLE SOURCE OF TRUTH for all attention conditions.
/// Rules are evaluated in priority order.
abstract class AttentionRules {
  AttentionRules._();

  /// All attention rules, sorted by priority
  static const List<AttentionRule> all = [
    _overdueRule,
    _unassignedRule,
    _stalePendingRule,
  ];

  // ===========================================================================
  // RULE DEFINITIONS
  // ===========================================================================

  /// Overdue: scheduled work should have completed by now
  static const _overdueRule = AttentionRule(
    label: 'Overdue',
    icon: Icons.schedule,
    priority: 1, // Highest priority
    color: Color(0xFFE53935), // Red
    test: _isOverdue,
  );

  /// Unassigned: scheduled but no technician assigned
  static const _unassignedRule = AttentionRule(
    label: 'Unassigned',
    icon: Icons.person_off,
    priority: 2,
    color: Color(0xFFFB8C00), // Orange
    test: _isUnassigned,
  );

  /// Stale Pending: pending too long without action
  static const _stalePendingRule = AttentionRule(
    label: 'Stale',
    icon: Icons.hourglass_empty,
    priority: 3, // Lowest priority
    color: Color(0xFFFDD835), // Yellow
    test: _isStalePending,
  );

  // ===========================================================================
  // TEST FUNCTIONS (pure, testable)
  // ===========================================================================

  /// Overdue: scheduled_start AND scheduled_end both in past
  ///
  /// TIMEZONE: Uses DateTimeUtils.parseAsUtc() for consistent UTC comparison.
  static bool _isOverdue(
    Map<String, dynamic> wo,
    DateTime now,
    int stalePendingHours,
  ) {
    final status = wo['status'] as String?;
    if (status == 'completed' || status == 'cancelled') return false;

    final scheduledStart = wo['scheduled_start'];
    final scheduledEnd = wo['scheduled_end'];
    if (scheduledStart == null || scheduledEnd == null) return false;

    // Parse and normalize to UTC for comparison
    final startUtc = DateTimeUtils.parseAsUtc(scheduledStart);
    final endUtc = DateTimeUtils.parseAsUtc(scheduledEnd);
    if (startUtc == null || endUtc == null) return false;

    // Normalize 'now' to UTC (it may be local from DateTime.now())
    final nowUtc = DateTimeUtils.parseAsUtc(now)!;

    return startUtc.isBefore(nowUtc) && endUtc.isBefore(nowUtc);
  }

  /// Unassigned: has scheduled_start but no assigned_technician_id
  static bool _isUnassigned(
    Map<String, dynamic> wo,
    DateTime now,
    int stalePendingHours,
  ) {
    final scheduledStart = wo['scheduled_start'];
    if (scheduledStart == null) return false;

    final technicianId = wo['assigned_technician_id'];
    return technicianId == null;
  }

  /// Stale Pending: status=pending AND created_at > stalePendingHours ago
  ///
  /// TIMEZONE: Uses DateTimeUtils.parseAsUtc() for consistent UTC comparison.
  static bool _isStalePending(
    Map<String, dynamic> wo,
    DateTime now,
    int stalePendingHours,
  ) {
    final status = wo['status'] as String?;
    if (status != 'pending') return false;

    final createdAt = wo['created_at'];
    if (createdAt == null) return false;

    // Parse and normalize to UTC for comparison
    final createdUtc = DateTimeUtils.parseAsUtc(createdAt);
    if (createdUtc == null) return false;

    // Normalize 'now' to UTC
    final nowUtc = DateTimeUtils.parseAsUtc(now)!;

    final threshold = nowUtc.subtract(Duration(hours: stalePendingHours));
    return createdUtc.isBefore(threshold);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /// Get all violated rules for a work order (sorted by priority)
  static List<AttentionRule> getViolations(
    Map<String, dynamic> workOrder, {
    DateTime? now,
    int stalePendingHours = 48,
  }) {
    final evalTime = now ?? DateTimeUtils.nowUtc();
    return all
        .where((rule) => rule.test(workOrder, evalTime, stalePendingHours))
        .toList();
  }

  /// Check if work order needs attention (any rule violated)
  static bool needsAttention(
    Map<String, dynamic> workOrder, {
    DateTime? now,
    int stalePendingHours = 48,
  }) {
    final evalTime = now ?? DateTimeUtils.nowUtc();
    return all.any((rule) => rule.test(workOrder, evalTime, stalePendingHours));
  }

  /// Get primary (highest priority) violation, if any
  static AttentionRule? getPrimaryViolation(
    Map<String, dynamic> workOrder, {
    DateTime? now,
    int stalePendingHours = 48,
  }) {
    final violations = getViolations(
      workOrder,
      now: now,
      stalePendingHours: stalePendingHours,
    );
    return violations.isNotEmpty ? violations.first : null;
  }

  /// Create AttentionItem with evaluated violations
  static AttentionItem? evaluate(
    Map<String, dynamic> workOrder, {
    DateTime? now,
    int stalePendingHours = 48,
  }) {
    final violations = getViolations(
      workOrder,
      now: now,
      stalePendingHours: stalePendingHours,
    );
    if (violations.isEmpty) return null;
    return AttentionItem(workOrder: workOrder, violations: violations);
  }

  /// Evaluate multiple work orders, returning only those needing attention
  static List<AttentionItem> evaluateAll(
    List<Map<String, dynamic>> workOrders, {
    DateTime? now,
    int stalePendingHours = 48,
  }) {
    final evalTime = now ?? DateTimeUtils.nowUtc();
    return workOrders
        .map(
          (wo) =>
              evaluate(wo, now: evalTime, stalePendingHours: stalePendingHours),
        )
        .whereType<AttentionItem>()
        .toList();
  }
}
