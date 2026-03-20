/// DateTimeUtils - Single Source of Truth for All DateTime Operations
///
/// SOLE RESPONSIBILITY: Parse, serialize, compare, and format DateTime values
///
/// ## Architecture
/// The app uses TIMESTAMPTZ for reliable timezone handling:
/// - All datetimes are stored using PostgreSQL TIMESTAMPTZ (timestamp with time zone)
/// - PostgreSQL automatically stores values internally as UTC
/// - PostgreSQL session timezone is set to UTC, so all values come back as UTC ISO strings
/// - Frontend displays in user's local timezone
///
/// ## Sections
/// - **SERIALIZATION:** Frontend → API (UTC ISO strings)
/// - **DESERIALIZATION:** API → Frontend (local DateTime)
/// - **PARSING & COMPARISON:** Business logic (all UTC)
/// - **FORMATTING:** Display (all local)
///
/// ## Usage
/// ```dart
/// // Serializing for API
/// final isoString = DateTimeUtils.toApiString(localDateTime);
/// // Returns: "2026-03-17T00:00:00.000Z"
///
/// // Deserializing from API
/// final localDt = DateTimeUtils.fromApiString(isoString);
/// // Returns: local DateTime for display
///
/// // Comparing (business logic)
/// final scheduledEnd = DateTimeUtils.parseAsUtc(wo['scheduled_end']);
/// if (scheduledEnd != null && scheduledEnd.isBefore(DateTimeUtils.nowUtc())) {
///   // Overdue!
/// }
///
/// // Formatting for display
/// final display = DateTimeUtils.formatDateTime(localDt);
/// // Returns: "Mar 17, 2026 5:00 PM"
/// ```
library;

import 'package:flutter/foundation.dart';

/// Centralized DateTime operations for the entire application
class DateTimeUtils {
  DateTimeUtils._();

  // ══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION (Frontend → Backend API)
  // ══════════════════════════════════════════════════════════════════════════

  /// Convert a DateTime to ISO 8601 UTC string for API transmission
  ///
  /// - Input: Local or UTC DateTime
  /// - Output: UTC ISO 8601 string with 'Z' suffix (e.g., "2026-03-17T00:00:00.000Z")
  ///
  /// This ensures consistent storage regardless of user timezone.
  static String toApiString(DateTime dateTime) {
    final utc = dateTime.isUtc ? dateTime : dateTime.toUtc();
    final result = utc.toIso8601String();

    if (kDebugMode) {
      debugPrint('[DateTimeUtils.toApiString]');
      debugPrint('  Input: $dateTime (isUtc: ${dateTime.isUtc})');
      debugPrint('  Output: $result');
    }

    return result;
  }

  /// Serialize a dynamic value (DateTime or String) for API
  ///
  /// - DateTime: Converts to UTC ISO string
  /// - String: Validates format and passes through (assumed already correct)
  /// - null: Returns null
  ///
  /// Use this in FieldConfig.setValue for datetime fields.
  static String? serializeForApi(dynamic value) {
    if (value == null) return null;

    if (value is DateTime) {
      return toApiString(value);
    }

    if (value is String) {
      // Validate it looks like an ISO string
      if (value.isEmpty) return null;
      final parsed = DateTime.tryParse(value);
      if (parsed == null) {
        debugPrint('[DateTimeUtils] Warning: Invalid datetime string: $value');
        return value; // Pass through anyway, let backend validate
      }
      // If it's a local ISO string (no Z), convert to UTC
      if (!parsed.isUtc) {
        debugPrint(
          '[DateTimeUtils] Warning: String without Z suffix, converting to UTC: $value',
        );
        return toApiString(parsed);
      }
      return value; // Already UTC string with Z
    }

    debugPrint(
      '[DateTimeUtils] Warning: Unexpected type: ${value.runtimeType}',
    );
    return value?.toString();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESERIALIZATION (Backend API → Frontend)
  // ══════════════════════════════════════════════════════════════════════════

  /// Parse an API datetime string to local DateTime for display
  ///
  /// - Input: UTC ISO 8601 string from API (e.g., "2026-03-17T00:00:00.000Z")
  /// - Output: Local DateTime for display
  ///
  /// Returns null if parsing fails.
  static DateTime? fromApiString(String? value) {
    if (value == null || value.isEmpty) return null;

    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      debugPrint('[DateTimeUtils] Warning: Failed to parse: $value');
      return null;
    }

    // Convert UTC to local for display
    final local = parsed.isUtc ? parsed.toLocal() : parsed;

    if (kDebugMode) {
      debugPrint('[DateTimeUtils.fromApiString]');
      debugPrint('  Input: $value');
      debugPrint('  Parsed: $parsed (isUtc: ${parsed.isUtc})');
      debugPrint('  Local: $local');
    }

    return local;
  }

  /// Deserialize a dynamic value to local DateTime for display
  ///
  /// - String: Parses and converts to local
  /// - DateTime: Converts to local if UTC
  /// - null: Returns null
  ///
  /// Use this in FieldConfig.getValue for datetime fields.
  static DateTime? deserializeForDisplay(dynamic value) {
    if (value == null) return null;

    if (value is DateTime) {
      return value.isUtc ? value.toLocal() : value;
    }

    if (value is String) {
      return fromApiString(value);
    }

    debugPrint(
      '[DateTimeUtils] Warning: Unexpected type for deserialize: ${value.runtimeType}',
    );
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARSING & COMPARISON (Business Logic - all UTC)
  // ══════════════════════════════════════════════════════════════════════════

  /// Parse any datetime value to DateTime (preserving UTC flag)
  ///
  /// Unlike [deserializeForDisplay], this does NOT convert to local.
  /// Preserves the original timezone for inspection.
  static DateTime? parseAny(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
    return null;
  }

  /// Parse any datetime value and normalize to UTC for comparison
  ///
  /// **USE FOR:** Business logic comparisons (isOverdue, isBefore, etc.)
  /// **DO NOT USE FOR:** Display (use deserializeForDisplay instead)
  ///
  /// All dates from API are UTC. Local DateTime.now() must be converted
  /// to UTC before comparing, otherwise you get timezone offset errors.
  ///
  /// Example:
  /// ```dart
  /// final scheduledEnd = DateTimeUtils.parseAsUtc(wo['scheduled_end']);
  /// final nowUtc = DateTimeUtils.nowUtc();
  /// if (scheduledEnd != null && scheduledEnd.isBefore(nowUtc)) {
  ///   // Overdue!
  /// }
  /// ```
  static DateTime? parseAsUtc(dynamic value) {
    final dt = parseAny(value);
    if (dt == null) return null;
    return dt.isUtc ? dt : dt.toUtc();
  }

  /// Get current time as UTC for comparisons
  ///
  /// Always use this instead of DateTime.now() when comparing
  /// against API dates (which are all UTC).
  static DateTime nowUtc() => DateTime.now().toUtc();

  // ══════════════════════════════════════════════════════════════════════════
  // FORMATTING (Display - all local)
  // ══════════════════════════════════════════════════════════════════════════

  static const _months = [
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

  /// Formats a [DateTime] as user-friendly date string.
  ///
  /// Returns formatted string "MMM d, yyyy" (e.g., "Jan 15, 2024").
  /// Automatically converts UTC times to local for correct display.
  ///
  /// Example:
  /// ```dart
  /// final date = DateTime(2024, 1, 15);
  /// print(DateTimeUtils.formatDate(date)); // "Jan 15, 2024"
  /// ```
  static String formatDate(DateTime date) {
    // Ensure local time for display - UTC dates would show wrong day at midnight boundary
    final local = date.isUtc ? date.toLocal() : date;
    return '${_months[local.month - 1]} ${local.day}, ${local.year}';
  }

  /// Formats a [DateTime] as user-friendly date AND time string.
  ///
  /// Returns formatted string "MMM d, yyyy h:mm AM/PM"
  /// (e.g., "Jan 15, 2024 2:30 PM").
  /// Automatically converts UTC times to local for correct display.
  ///
  /// Example:
  /// ```dart
  /// final dt = DateTime(2024, 1, 15, 14, 30);
  /// print(DateTimeUtils.formatDateTime(dt)); // "Jan 15, 2024 2:30 PM"
  /// ```
  static String formatDateTime(DateTime dt) {
    // Ensure local time for display - UTC would show wrong hour
    final local = dt.isUtc ? dt.toLocal() : dt;
    final datePart = formatDate(local);
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = local.hour >= 12 ? 'PM' : 'AM';
    return '$datePart $hour:$minute $period';
  }

  /// Formats a [DateTime] as relative time from now.
  ///
  /// Returns human-readable strings like:
  /// - "5s ago" - less than 1 minute
  /// - "23m ago" - less than 1 hour
  /// - "4h ago" - less than 1 day
  /// - "7d ago" - 1 day or more
  ///
  /// The optional [referenceTime] parameter allows testing with fixed dates.
  ///
  /// Example:
  /// ```dart
  /// final timestamp = DateTime.now().subtract(Duration(minutes: 30));
  /// print(DateTimeUtils.formatRelativeTime(timestamp)); // "30m ago"
  /// ```
  static String formatRelativeTime(
    DateTime timestamp, {
    DateTime? referenceTime,
  }) {
    final now = referenceTime ?? DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }

  /// Parses a timestamp and formats as relative time.
  ///
  /// Returns 'Unknown' if parsing fails or timestamp is null.
  /// Handles ISO 8601 strings from API responses.
  ///
  /// Example:
  /// ```dart
  /// print(DateTimeUtils.tryFormatRelativeTime('2026-01-30T10:00:00Z')); // "2h ago"
  /// print(DateTimeUtils.tryFormatRelativeTime(null)); // "Unknown"
  /// ```
  static String tryFormatRelativeTime(dynamic timestamp) {
    if (timestamp == null) return 'Unknown';
    try {
      final dt = DateTime.parse(timestamp.toString());
      return formatRelativeTime(dt);
    } catch (_) {
      return 'Unknown';
    }
  }

  /// Formats a [DateTime] as contextual timestamp.
  ///
  /// Returns human-readable strings based on recency:
  /// - "Today HH:MM" - same day
  /// - "Yesterday" - previous day
  /// - "N days ago" - within last week
  /// - "YYYY-MM-DD" - older than a week
  ///
  /// The optional [referenceTime] parameter allows testing with fixed dates.
  ///
  /// Example:
  /// ```dart
  /// final recent = DateTime.now().subtract(Duration(hours: 2));
  /// print(DateTimeUtils.formatTimestamp(recent)); // "Today 14:30"
  /// ```
  static String formatTimestamp(DateTime dt, {DateTime? referenceTime}) {
    // Ensure local time for display
    final local = dt.isUtc ? dt.toLocal() : dt;
    final now = referenceTime ?? DateTime.now();
    final diff = now.difference(local);

    if (diff.inDays == 0) {
      return 'Today ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
    }
  }

  /// Formats a [Duration] as human-readable text.
  ///
  /// Returns the largest appropriate unit:
  /// - "5 seconds" - less than 1 minute
  /// - "23 minutes" - less than 1 hour
  /// - "4 hours" - less than 1 day
  /// - "7 days" - 1 day or more
  ///
  /// Example:
  /// ```dart
  /// print(DateTimeUtils.formatDuration(Duration(hours: 2))); // "2 hours"
  /// ```
  static String formatDuration(Duration duration) {
    if (duration.inDays > 0) {
      return '${duration.inDays} ${duration.inDays == 1 ? 'day' : 'days'}';
    } else if (duration.inHours > 0) {
      return '${duration.inHours} ${duration.inHours == 1 ? 'hour' : 'hours'}';
    } else if (duration.inMinutes > 0) {
      return '${duration.inMinutes} ${duration.inMinutes == 1 ? 'minute' : 'minutes'}';
    } else {
      return '${duration.inSeconds} ${duration.inSeconds == 1 ? 'second' : 'seconds'}';
    }
  }

  /// Formats a [Duration] as a response time with appropriate units.
  ///
  /// Returns:
  /// - Milliseconds (e.g., "45ms") for durations < 1 second
  /// - Seconds with 1 decimal place (e.g., "1.5s") for durations ≥ 1 second
  ///
  /// Example:
  /// ```dart
  /// print(DateTimeUtils.formatResponseTime(Duration(milliseconds: 45))); // "45ms"
  /// print(DateTimeUtils.formatResponseTime(Duration(milliseconds: 1500))); // "1.5s"
  /// ```
  static String formatResponseTime(Duration duration) {
    final ms = duration.inMilliseconds;
    if (ms < 1000) {
      return '${ms}ms';
    } else {
      final seconds = (ms / 1000).toStringAsFixed(1);
      return '${seconds}s';
    }
  }

  /// Formats a [DateTime] as an absolute timestamp.
  ///
  /// Returns ISO 8601 formatted string (e.g., "2025-10-28T12:30:45.000").
  ///
  /// Example:
  /// ```dart
  /// final now = DateTime.now();
  /// print(DateTimeUtils.formatAbsoluteTime(now)); // "2025-10-28T12:30:45.000"
  /// ```
  static String formatAbsoluteTime(DateTime timestamp) {
    return timestamp.toIso8601String();
  }
}
