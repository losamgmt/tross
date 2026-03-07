/// Summary Configuration for Entity Analytics
///
/// Defines which fields can be used for aggregation in the /summaries/:entity endpoint.
/// Entities with null summaryConfig do not support analytics/aggregation.
library;

/// Configuration for entity summary/aggregation capabilities.
///
/// Used by the frontend to:
/// - Determine if analytics features should be shown for an entity
/// - Build group-by dropdown options
/// - Configure chart/report builders
class SummaryConfig {
  /// Fields that can be used for GROUP BY operations.
  /// Typically FK fields (customer_id, property_id) or enum fields (status, priority).
  /// REQUIRED when summaryConfig is not null.
  final List<String> groupableFields;

  /// Numeric fields that can be summed in aggregations.
  /// Example: ['total', 'quantity', 'amount']
  final List<String>? summableFields;

  /// Enum fields used for count breakdowns (count_by_status, etc).
  /// If null, auto-derived from fields with enum type.
  final List<String>? breakdownFields;

  /// Date/timestamp fields for time-based aggregations.
  /// If null, auto-derived from date/timestamp fields.
  final List<String>? dateFields;

  const SummaryConfig({
    required this.groupableFields,
    this.summableFields,
    this.breakdownFields,
    this.dateFields,
  });

  factory SummaryConfig.fromJson(Map<String, dynamic> json) {
    return SummaryConfig(
      groupableFields:
          (json['groupableFields'] as List<dynamic>?)?.cast<String>() ?? [],
      summableFields: (json['summableFields'] as List<dynamic>?)
          ?.cast<String>(),
      breakdownFields: (json['breakdownFields'] as List<dynamic>?)
          ?.cast<String>(),
      dateFields: (json['dateFields'] as List<dynamic>?)?.cast<String>(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'groupableFields': groupableFields,
      if (summableFields != null) 'summableFields': summableFields,
      if (breakdownFields != null) 'breakdownFields': breakdownFields,
      if (dateFields != null) 'dateFields': dateFields,
    };
  }

  /// Check if this entity supports grouping by a specific field.
  bool canGroupBy(String field) => groupableFields.contains(field);

  /// Check if this entity has summable fields.
  bool get hasSummableFields =>
      summableFields != null && summableFields!.isNotEmpty;

  /// Check if this entity supports time-based analytics.
  bool get hasDateFields => dateFields != null && dateFields!.isNotEmpty;
}
