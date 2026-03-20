/// Comprehensive tests for DateTimeUtils
///
/// Tests all datetime operations: serialization, deserialization,
/// parsing, comparison, and formatting.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/utils/datetime_utils.dart';

void main() {
  // ══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION TESTS
  // ══════════════════════════════════════════════════════════════════════════

  group('DateTimeUtils.toApiString', () {
    test('converts local DateTime to UTC ISO 8601 string', () {
      final local = DateTime(2026, 3, 16, 18, 0, 0);
      expect(local.isUtc, isFalse);

      final result = DateTimeUtils.toApiString(local);

      expect(result, endsWith('Z'));
      expect(result, contains('T'));
      final parsed = DateTime.parse(result);
      expect(parsed.isUtc, isTrue);
    });

    test('preserves UTC DateTime unchanged', () {
      final utc = DateTime.utc(2026, 3, 17, 0, 0, 0);
      final result = DateTimeUtils.toApiString(utc);
      expect(result, equals('2026-03-17T00:00:00.000Z'));
    });
  });

  group('DateTimeUtils.serializeForApi', () {
    test('converts DateTime to UTC string', () {
      final local = DateTime(2026, 3, 16, 18, 0);
      final result = DateTimeUtils.serializeForApi(local);
      expect(result, isA<String>());
      expect(result, endsWith('Z'));
    });

    test('passes through valid UTC string', () {
      const input = '2026-03-17T00:00:00.000Z';
      final result = DateTimeUtils.serializeForApi(input);
      expect(result, equals(input));
    });

    test('converts non-UTC string to UTC', () {
      const input = '2026-03-16T18:00:00.000';
      final result = DateTimeUtils.serializeForApi(input);
      expect(result, endsWith('Z'));
    });

    test('returns null for null input', () {
      expect(DateTimeUtils.serializeForApi(null), isNull);
    });

    test('returns null for empty string', () {
      expect(DateTimeUtils.serializeForApi(''), isNull);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DESERIALIZATION TESTS
  // ══════════════════════════════════════════════════════════════════════════

  group('DateTimeUtils.fromApiString', () {
    test('parses UTC string to local DateTime', () {
      const input = '2026-03-17T00:00:00.000Z';
      final result = DateTimeUtils.fromApiString(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isFalse);
    });

    test('returns null for null input', () {
      expect(DateTimeUtils.fromApiString(null), isNull);
    });

    test('returns null for empty string', () {
      expect(DateTimeUtils.fromApiString(''), isNull);
    });

    test('returns null for invalid string', () {
      expect(DateTimeUtils.fromApiString('not a date'), isNull);
    });
  });

  group('DateTimeUtils.deserializeForDisplay', () {
    test('converts UTC DateTime to local', () {
      final utc = DateTime.utc(2026, 3, 17, 0, 0);
      final result = DateTimeUtils.deserializeForDisplay(utc);
      expect(result, isNotNull);
      expect(result!.isUtc, isFalse);
    });

    test('keeps local DateTime as local', () {
      final local = DateTime(2026, 3, 16, 18, 0);
      final result = DateTimeUtils.deserializeForDisplay(local);
      expect(result, isNotNull);
      expect(result!.isUtc, isFalse);
      expect(result, equals(local));
    });

    test('parses string and converts to local', () {
      const input = '2026-03-17T00:00:00.000Z';
      final result = DateTimeUtils.deserializeForDisplay(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isFalse);
    });

    test('returns null for null input', () {
      expect(DateTimeUtils.deserializeForDisplay(null), isNull);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PARSING & COMPARISON TESTS
  // ══════════════════════════════════════════════════════════════════════════

  group('DateTimeUtils.parseAny', () {
    test('parses DateTime without conversion', () {
      final utc = DateTime.utc(2026, 3, 17, 0, 0);
      final result = DateTimeUtils.parseAny(utc);
      expect(result, equals(utc));
      expect(result!.isUtc, isTrue);
    });

    test('parses UTC string preserving UTC', () {
      const input = '2026-03-17T00:00:00.000Z';
      final result = DateTimeUtils.parseAny(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isTrue);
    });

    test('parses local string preserving local', () {
      const input = '2026-03-16T18:00:00.000';
      final result = DateTimeUtils.parseAny(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isFalse);
    });

    test('returns null for null input', () {
      expect(DateTimeUtils.parseAny(null), isNull);
    });

    test('returns null for empty string', () {
      expect(DateTimeUtils.parseAny(''), isNull);
    });
  });

  group('DateTimeUtils.parseAsUtc', () {
    test('converts local DateTime to UTC', () {
      final local = DateTime(2026, 3, 16, 18, 0);
      expect(local.isUtc, isFalse);
      final result = DateTimeUtils.parseAsUtc(local);
      expect(result, isNotNull);
      expect(result!.isUtc, isTrue);
    });

    test('preserves UTC DateTime as UTC', () {
      final utc = DateTime.utc(2026, 3, 17, 0, 0);
      final result = DateTimeUtils.parseAsUtc(utc);
      expect(result, isNotNull);
      expect(result!.isUtc, isTrue);
      expect(result, equals(utc));
    });

    test('parses UTC string to UTC DateTime', () {
      const input = '2026-03-17T00:00:00.000Z';
      final result = DateTimeUtils.parseAsUtc(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isTrue);
    });

    test('parses local string and converts to UTC', () {
      const input = '2026-03-16T18:00:00.000';
      final result = DateTimeUtils.parseAsUtc(input);
      expect(result, isNotNull);
      expect(result!.isUtc, isTrue);
    });

    test('returns null for null input', () {
      expect(DateTimeUtils.parseAsUtc(null), isNull);
    });
  });

  group('DateTimeUtils.nowUtc', () {
    test('returns UTC DateTime', () {
      final result = DateTimeUtils.nowUtc();
      expect(result.isUtc, isTrue);
    });

    test('is close to DateTime.now()', () {
      final before = DateTime.now();
      final utcNow = DateTimeUtils.nowUtc();
      final after = DateTime.now();

      expect(
        utcNow.millisecondsSinceEpoch,
        greaterThanOrEqualTo(before.millisecondsSinceEpoch),
      );
      expect(
        utcNow.millisecondsSinceEpoch,
        lessThanOrEqualTo(after.millisecondsSinceEpoch),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ROUND-TRIP TESTS
  // ══════════════════════════════════════════════════════════════════════════

  group('round-trip consistency', () {
    test('local DateTime survives serialize → deserialize round trip', () {
      final original = DateTime(2026, 3, 16, 18, 30, 45);
      final serialized = DateTimeUtils.serializeForApi(original);
      final deserialized = DateTimeUtils.deserializeForDisplay(serialized);

      expect(deserialized, isNotNull);
      expect(deserialized!.year, equals(original.year));
      expect(deserialized.month, equals(original.month));
      expect(deserialized.day, equals(original.day));
      expect(deserialized.hour, equals(original.hour));
      expect(deserialized.minute, equals(original.minute));
      expect(deserialized.second, equals(original.second));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FORMATTING TESTS
  // ══════════════════════════════════════════════════════════════════════════

  group('DateTimeUtils.formatDate', () {
    test('formats date as "MMM d, yyyy"', () {
      final date = DateTime(2024, 1, 15);
      expect(DateTimeUtils.formatDate(date), equals('Jan 15, 2024'));
    });

    test('handles all months', () {
      expect(DateTimeUtils.formatDate(DateTime(2024, 1, 1)), startsWith('Jan'));
      expect(DateTimeUtils.formatDate(DateTime(2024, 6, 1)), startsWith('Jun'));
      expect(
        DateTimeUtils.formatDate(DateTime(2024, 12, 1)),
        startsWith('Dec'),
      );
    });

    test('converts UTC to local before formatting', () {
      final utc = DateTime.utc(2024, 1, 15, 12, 0);
      final result = DateTimeUtils.formatDate(utc);
      expect(result, contains('2024'));
    });

    test('handles single-digit days', () {
      final date = DateTime(2024, 3, 5);
      expect(DateTimeUtils.formatDate(date), equals('Mar 5, 2024'));
    });

    test('handles end of year', () {
      final date = DateTime(2024, 12, 31);
      expect(DateTimeUtils.formatDate(date), equals('Dec 31, 2024'));
    });
  });

  group('DateTimeUtils.formatDateTime', () {
    test('formats as "MMM d, yyyy h:mm AM/PM"', () {
      final dt = DateTime(2024, 1, 15, 14, 30);
      expect(DateTimeUtils.formatDateTime(dt), equals('Jan 15, 2024 2:30 PM'));
    });

    test('handles midnight (12:00 AM)', () {
      final dt = DateTime(2024, 1, 15, 0, 0);
      expect(DateTimeUtils.formatDateTime(dt), equals('Jan 15, 2024 12:00 AM'));
    });

    test('handles noon (12:00 PM)', () {
      final dt = DateTime(2024, 1, 15, 12, 0);
      expect(DateTimeUtils.formatDateTime(dt), equals('Jan 15, 2024 12:00 PM'));
    });

    test('handles AM times', () {
      final dt = DateTime(2024, 1, 15, 9, 5);
      expect(DateTimeUtils.formatDateTime(dt), equals('Jan 15, 2024 9:05 AM'));
    });

    test('converts UTC to local before formatting', () {
      final utc = DateTime.utc(2024, 1, 15, 14, 30);
      final result = DateTimeUtils.formatDateTime(utc);
      expect(result, contains('2024'));
      expect(result, matches(RegExp(r'\d{1,2}:\d{2} [AP]M$')));
    });
  });

  group('DateTimeUtils.formatRelativeTime', () {
    final referenceTime = DateTime(2025, 6, 15, 12, 0, 0);

    test('returns "Just now" for times < 1 minute ago', () {
      final timestamp = referenceTime.subtract(const Duration(seconds: 30));
      expect(
        DateTimeUtils.formatRelativeTime(
          timestamp,
          referenceTime: referenceTime,
        ),
        'Just now',
      );
    });

    test('formats minutes for times < 1 hour ago', () {
      final timestamp = referenceTime.subtract(const Duration(minutes: 45));
      expect(
        DateTimeUtils.formatRelativeTime(
          timestamp,
          referenceTime: referenceTime,
        ),
        '45m ago',
      );
    });

    test('formats hours for times < 1 day ago', () {
      final timestamp = referenceTime.subtract(const Duration(hours: 12));
      expect(
        DateTimeUtils.formatRelativeTime(
          timestamp,
          referenceTime: referenceTime,
        ),
        '12h ago',
      );
    });

    test('formats days for times >= 1 day ago', () {
      final timestamp = referenceTime.subtract(const Duration(days: 7));
      expect(
        DateTimeUtils.formatRelativeTime(
          timestamp,
          referenceTime: referenceTime,
        ),
        '7d ago',
      );
    });

    test('handles just now (0 seconds)', () {
      expect(
        DateTimeUtils.formatRelativeTime(
          referenceTime,
          referenceTime: referenceTime,
        ),
        'Just now',
      );
    });

    test('works without referenceTime (uses DateTime.now)', () {
      final timestamp = DateTime.now().subtract(const Duration(seconds: 5));
      final result = DateTimeUtils.formatRelativeTime(timestamp);
      expect(result, equals('Just now'));
    });
  });

  group('DateTimeUtils.tryFormatRelativeTime', () {
    test('returns "Unknown" for null', () {
      expect(DateTimeUtils.tryFormatRelativeTime(null), equals('Unknown'));
    });

    test('returns "Unknown" for invalid string', () {
      expect(
        DateTimeUtils.tryFormatRelativeTime('not a date'),
        equals('Unknown'),
      );
    });

    test('formats valid ISO string', () {
      final recent = DateTime.now().subtract(const Duration(minutes: 5));
      final result = DateTimeUtils.tryFormatRelativeTime(
        recent.toIso8601String(),
      );
      expect(result, matches(RegExp(r'^\d+m ago$')));
    });
  });

  group('DateTimeUtils.formatTimestamp', () {
    final referenceTime = DateTime(2025, 6, 15, 14, 30, 0);

    test('formats same day as "Today HH:MM"', () {
      final dt = DateTime(2025, 6, 15, 10, 15);
      expect(
        DateTimeUtils.formatTimestamp(dt, referenceTime: referenceTime),
        'Today 10:15',
      );
    });

    test('formats previous day as "Yesterday"', () {
      final dt = DateTime(2025, 6, 14, 10, 0);
      expect(
        DateTimeUtils.formatTimestamp(dt, referenceTime: referenceTime),
        'Yesterday',
      );
    });

    test('formats 3 days ago as "3 days ago"', () {
      final dt = DateTime(2025, 6, 12, 10, 0);
      expect(
        DateTimeUtils.formatTimestamp(dt, referenceTime: referenceTime),
        '3 days ago',
      );
    });

    test('formats older than a week as YYYY-MM-DD', () {
      final dt = DateTime(2025, 5, 1, 10, 0);
      expect(
        DateTimeUtils.formatTimestamp(dt, referenceTime: referenceTime),
        '2025-05-01',
      );
    });

    test('converts UTC to local before formatting', () {
      final utc = DateTime.utc(2025, 6, 15, 10, 15);
      final result = DateTimeUtils.formatTimestamp(
        utc,
        referenceTime: referenceTime,
      );
      expect(result, startsWith('Today'));
    });
  });

  group('DateTimeUtils.formatDuration', () {
    test('formats seconds for durations < 1 minute', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(seconds: 45)),
        '45 seconds',
      );
    });

    test('formats minutes for durations < 1 hour', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(minutes: 30)),
        '30 minutes',
      );
    });

    test('formats hours for durations < 1 day', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(hours: 12)),
        '12 hours',
      );
    });

    test('formats days for durations >= 1 day', () {
      expect(DateTimeUtils.formatDuration(const Duration(days: 7)), '7 days');
    });

    test('uses singular form for 1 second', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(seconds: 1)),
        '1 second',
      );
    });

    test('uses singular form for 1 minute', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(minutes: 1)),
        '1 minute',
      );
    });

    test('uses singular form for 1 hour', () {
      expect(DateTimeUtils.formatDuration(const Duration(hours: 1)), '1 hour');
    });

    test('uses singular form for 1 day', () {
      expect(DateTimeUtils.formatDuration(const Duration(days: 1)), '1 day');
    });

    test('handles zero duration', () {
      expect(DateTimeUtils.formatDuration(Duration.zero), '0 seconds');
    });

    test('uses largest unit for mixed durations', () {
      expect(
        DateTimeUtils.formatDuration(const Duration(days: 1, hours: 12)),
        '1 day',
      );
    });
  });

  group('DateTimeUtils.formatResponseTime', () {
    test('formats milliseconds for durations < 1 second', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(milliseconds: 45)),
        '45ms',
      );
    });

    test('formats seconds for durations >= 1 second', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(milliseconds: 1500)),
        '1.5s',
      );
    });

    test('handles zero duration', () {
      expect(DateTimeUtils.formatResponseTime(Duration.zero), '0ms');
    });

    test('handles exactly 1 second', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(milliseconds: 1000)),
        '1.0s',
      );
    });

    test('handles very fast response (1ms)', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(milliseconds: 1)),
        '1ms',
      );
    });

    test('handles very slow response (10+ seconds)', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(seconds: 15)),
        '15.0s',
      );
    });

    test('formats with one decimal place for seconds', () {
      expect(
        DateTimeUtils.formatResponseTime(const Duration(milliseconds: 3247)),
        '3.2s',
      );
    });
  });

  group('DateTimeUtils.formatAbsoluteTime', () {
    test('formats timestamp as ISO 8601 string', () {
      final timestamp = DateTime(2025, 10, 28, 12, 30, 45);
      final formatted = DateTimeUtils.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2025-10-28'));
      expect(formatted, contains('12:30:45'));
    });

    test('handles midnight', () {
      final timestamp = DateTime(2025, 1, 1, 0, 0, 0);
      final formatted = DateTimeUtils.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2025-01-01'));
      expect(formatted, contains('00:00:00'));
    });

    test('handles leap year date', () {
      final timestamp = DateTime(2024, 2, 29, 12, 0, 0);
      final formatted = DateTimeUtils.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2024-02-29'));
    });
  });
}
