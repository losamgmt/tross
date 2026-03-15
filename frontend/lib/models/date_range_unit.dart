/// Date Range Unit - Type-safe enum for schedule view window
///
/// Provides strongly-typed date range units for the schedule view,
/// eliminating stringly-typed values and enabling exhaustive switch matching.
///
/// Lives in models/ with schedule-related domain types (domain-scoped pattern).
/// See also: FieldType in field_definition.dart, UserRole in permission.dart
library;

/// Type-safe date range unit for schedule view.
///
/// WHY "DateRangeUnit": Clearly describes what day/week/month ARE - units for
/// a date range. Not calendar-specific, could be used for reports, analytics, etc.
///
/// Exhaustive switch - no invalid states, no dead code paths.
enum DateRangeUnit {
  /// Single day view
  day(Duration(days: 1)),

  /// Seven-day week view
  week(Duration(days: 7)),

  /// Full month view (requires special calculation)
  month(null);

  /// Fixed duration for day/week, null for month (variable days)
  final Duration? duration;

  const DateRangeUnit(this.duration);

  /// Calculate end date from start.
  ///
  /// Day/week use fixed duration, month increments to first of next month.
  DateTime endDate(DateTime start) => switch (this) {
    DateRangeUnit.day => start.add(duration!),
    DateRangeUnit.week => start.add(duration!),
    DateRangeUnit.month => DateTime(start.year, start.month + 1, 1),
  };

  /// Display label for UI (capitalized name)
  String get label => name[0].toUpperCase() + name.substring(1);

  /// Get the natural start date for this unit.
  ///
  /// - Day: today
  /// - Week: Monday of current week
  /// - Month: 1st of current month
  ///
  /// This ensures the view starts at its natural boundary.
  DateTime get naturalStart {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return switch (this) {
      DateRangeUnit.day => today,
      DateRangeUnit.week => today.subtract(Duration(days: today.weekday - 1)),
      DateRangeUnit.month => DateTime(now.year, now.month, 1),
    };
  }

  /// Get enum value from string (case-insensitive)
  static DateRangeUnit? fromString(String? value) {
    if (value == null || value.isEmpty) return null;
    final lower = value.toLowerCase();
    return DateRangeUnit.values.cast<DateRangeUnit?>().firstWhere(
      (unit) => unit?.name == lower,
      orElse: () => null,
    );
  }
}
