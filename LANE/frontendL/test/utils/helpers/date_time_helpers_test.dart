/// Tests for DateTimeHelpers
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/date_time_helpers.dart';

void main() {
  group('DateTimeHelpers.formatRelativeTime', () {
    test('formats seconds for times < 1 minute ago', () {
      final timestamp = DateTime.now().subtract(const Duration(seconds: 30));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '30s ago');
    });

    test('formats minutes for times < 1 hour ago', () {
      final timestamp = DateTime.now().subtract(const Duration(minutes: 45));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '45m ago');
    });

    test('formats hours for times < 1 day ago', () {
      final timestamp = DateTime.now().subtract(const Duration(hours: 12));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '12h ago');
    });

    test('formats days for times >= 1 day ago', () {
      final timestamp = DateTime.now().subtract(const Duration(days: 7));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '7d ago');
    });

    test('handles just now (0 seconds)', () {
      final timestamp = DateTime.now();
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '0s ago');
    });

    test('handles exactly 1 minute (59 seconds shows as 0m)', () {
      final timestamp = DateTime.now().subtract(const Duration(seconds: 59));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '59s ago');
    });

    test('handles exactly 1 hour (59 minutes)', () {
      final timestamp = DateTime.now().subtract(const Duration(minutes: 59));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '59m ago');
    });

    test('handles exactly 1 day (23 hours)', () {
      final timestamp = DateTime.now().subtract(const Duration(hours: 23));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '23h ago');
    });

    test('handles very old dates (30+ days)', () {
      final timestamp = DateTime.now().subtract(const Duration(days: 365));
      expect(DateTimeHelpers.formatRelativeTime(timestamp), '365d ago');
    });
  });

  group('DateTimeHelpers.formatResponseTime', () {
    test('formats milliseconds for durations < 1 second', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 45)),
        '45ms',
      );
    });

    test('formats seconds for durations >= 1 second', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 1500)),
        '1.5s',
      );
    });

    test('handles zero duration', () {
      expect(DateTimeHelpers.formatResponseTime(Duration.zero), '0ms');
    });

    test('handles exactly 1 second', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 1000)),
        '1.0s',
      );
    });

    test('handles very fast response (1ms)', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 1)),
        '1ms',
      );
    });

    test('handles very slow response (10+ seconds)', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(seconds: 15)),
        '15.0s',
      );
    });

    test('formats with one decimal place for seconds', () {
      expect(
        DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 3247)),
        '3.2s',
      );
    });
  });

  group('DateTimeHelpers.formatAbsoluteTime', () {
    test('formats timestamp as ISO 8601 string', () {
      final timestamp = DateTime(2025, 10, 28, 12, 30, 45);
      final formatted = DateTimeHelpers.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2025-10-28'));
      expect(formatted, contains('12:30:45'));
    });

    test('handles midnight', () {
      final timestamp = DateTime(2025, 1, 1, 0, 0, 0);
      final formatted = DateTimeHelpers.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2025-01-01'));
      expect(formatted, contains('00:00:00'));
    });

    test('handles leap year date', () {
      final timestamp = DateTime(2024, 2, 29, 12, 0, 0);
      final formatted = DateTimeHelpers.formatAbsoluteTime(timestamp);
      expect(formatted, contains('2024-02-29'));
    });
  });

  group('DateTimeHelpers.formatDuration', () {
    test('formats seconds for durations < 1 minute', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(seconds: 45)),
        '45 seconds',
      );
    });

    test('formats minutes for durations < 1 hour', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(minutes: 30)),
        '30 minutes',
      );
    });

    test('formats hours for durations < 1 day', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(hours: 12)),
        '12 hours',
      );
    });

    test('formats days for durations >= 1 day', () {
      expect(DateTimeHelpers.formatDuration(const Duration(days: 7)), '7 days');
    });

    test('uses singular form for 1 second', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(seconds: 1)),
        '1 second',
      );
    });

    test('uses singular form for 1 minute', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(minutes: 1)),
        '1 minute',
      );
    });

    test('uses singular form for 1 hour', () {
      expect(
        DateTimeHelpers.formatDuration(const Duration(hours: 1)),
        '1 hour',
      );
    });

    test('uses singular form for 1 day', () {
      expect(DateTimeHelpers.formatDuration(const Duration(days: 1)), '1 day');
    });

    test('handles zero duration', () {
      expect(DateTimeHelpers.formatDuration(Duration.zero), '0 seconds');
    });

    test('uses largest unit for mixed durations', () {
      // 1 day + 12 hours = should show days
      expect(
        DateTimeHelpers.formatDuration(const Duration(days: 1, hours: 12)),
        '1 day',
      );
    });
  });
}
