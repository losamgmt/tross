/// Date and Time Formatting Helpers
///
/// Centralized, reusable utilities for formatting dates, times, and durations.
/// All methods are pure functions with no side effects.
///
/// Single Responsibility: Format date/time values for display.
library;

/// Date and time formatting utilities.
///
/// Provides consistent, reusable formatting for:
/// - Relative time (e.g., "5m ago", "2h ago")
/// - Response times (e.g., "45ms", "1.5s")
/// - Absolute timestamps
/// - Duration formatting
class DateTimeHelpers {
  // Private constructor to prevent instantiation
  DateTimeHelpers._();

  /// Formats a [DateTime] as relative time from now.
  ///
  /// Returns human-readable strings like:
  /// - "5s ago" - less than 1 minute
  /// - "23m ago" - less than 1 hour
  /// - "4h ago" - less than 1 day
  /// - "7d ago" - 1 day or more
  ///
  /// Example:
  /// ```dart
  /// final timestamp = DateTime.now().subtract(Duration(minutes: 30));
  /// print(DateTimeHelpers.formatRelativeTime(timestamp)); // "30m ago"
  /// ```
  static String formatRelativeTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
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
  /// print(DateTimeHelpers.formatResponseTime(Duration(milliseconds: 45))); // "45ms"
  /// print(DateTimeHelpers.formatResponseTime(Duration(milliseconds: 1500))); // "1.5s"
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
  /// print(DateTimeHelpers.formatAbsoluteTime(now)); // "2025-10-28T12:30:45.000"
  /// ```
  static String formatAbsoluteTime(DateTime timestamp) {
    return timestamp.toIso8601String();
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
  /// print(DateTimeHelpers.formatDuration(Duration(hours: 2))); // "2 hours"
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

  /// Formats a [DateTime] as user-friendly date string.
  ///
  /// Returns formatted string "MMM d, yyyy" (e.g., "Jan 15, 2024").
  /// No external dependencies - pure Dart implementation.
  ///
  /// Example:
  /// ```dart
  /// final date = DateTime(2024, 1, 15);
  /// print(DateTimeHelpers.formatDate(date)); // "Jan 15, 2024"
  /// ```
  static String formatDate(DateTime date) {
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
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  /// Formats a [DateTime] as contextual timestamp.
  ///
  /// Returns human-readable strings based on recency:
  /// - "Today HH:MM" - same day
  /// - "Yesterday" - previous day
  /// - "N days ago" - within last week
  /// - "YYYY-MM-DD" - older than a week
  ///
  /// Example:
  /// ```dart
  /// final recent = DateTime.now().subtract(Duration(hours: 2));
  /// print(DateTimeHelpers.formatTimestamp(recent)); // "Today 14:30"
  /// ```
  static String formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inDays == 0) {
      return 'Today ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    }
  }
}
