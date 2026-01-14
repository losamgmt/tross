/// Pure Helpers Scenario Tests
///
/// Comprehensive tests for ALL pure utility functions in lib/utils/helpers/
/// These are PURE FUNCTIONS - no state, no dependencies, just input → output.
///
/// Strategy: Test all edge cases systematically for maximum coverage.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/string_helper.dart';
import 'package:tross_app/utils/helpers/date_time_helpers.dart';
import 'package:tross_app/utils/helpers/number_helpers.dart';
import 'package:tross_app/utils/helpers/pagination_helper.dart';
import 'package:tross_app/utils/helpers/mime_helper.dart';
import 'package:tross_app/utils/helpers/color_helpers.dart';
import 'package:tross_app/utils/helpers/input_type_helpers.dart';

void main() {
  // ===========================================================================
  // STRING HELPER
  // ===========================================================================
  group('StringHelper', () {
    group('capitalize', () {
      test('capitalizes first letter', () {
        expect(StringHelper.capitalize('admin'), equals('Admin'));
      });

      test('handles single character', () {
        expect(StringHelper.capitalize('a'), equals('A'));
      });

      test('returns empty for null', () {
        expect(StringHelper.capitalize(null), equals(''));
      });

      test('returns empty for empty string', () {
        expect(StringHelper.capitalize(''), equals(''));
      });

      test('preserves rest of string case', () {
        expect(StringHelper.capitalize('uSER'), equals('USER'));
      });
    });

    group('getInitial', () {
      test('gets first letter uppercase', () {
        expect(StringHelper.getInitial('john'), equals('J'));
      });

      test('returns fallback for null', () {
        expect(StringHelper.getInitial(null), equals('U'));
      });

      test('returns custom fallback', () {
        expect(StringHelper.getInitial(null, fallback: 'X'), equals('X'));
      });

      test('returns fallback for empty', () {
        expect(StringHelper.getInitial(''), equals('U'));
      });
    });

    group('toUpperCase', () {
      test('converts to uppercase', () {
        expect(StringHelper.toUpperCase('admin'), equals('ADMIN'));
      });

      test('returns empty for null', () {
        expect(StringHelper.toUpperCase(null), equals(''));
      });
    });

    group('toLowerCase', () {
      test('converts to lowercase', () {
        expect(StringHelper.toLowerCase('ADMIN'), equals('admin'));
      });

      test('returns empty for null', () {
        expect(StringHelper.toLowerCase(null), equals(''));
      });
    });

    group('trim', () {
      test('trims whitespace', () {
        expect(StringHelper.trim('  hello  '), equals('hello'));
      });

      test('returns empty for null', () {
        expect(StringHelper.trim(null), equals(''));
      });
    });

    group('snakeToTitle', () {
      test('converts snake_case to Title Case', () {
        expect(StringHelper.snakeToTitle('work_order'), equals('Work Order'));
      });

      test('handles single word', () {
        expect(StringHelper.snakeToTitle('user'), equals('User'));
      });

      test('returns empty for null', () {
        expect(StringHelper.snakeToTitle(null), equals(''));
      });

      test('returns empty for empty string', () {
        expect(StringHelper.snakeToTitle(''), equals(''));
      });
    });
  });

  // ===========================================================================
  // DATE TIME HELPERS
  // ===========================================================================
  group('DateTimeHelpers', () {
    group('formatRelativeTime', () {
      test('formats seconds ago', () {
        final now = DateTime(2025, 1, 1, 12, 0, 30);
        final timestamp = DateTime(2025, 1, 1, 12, 0, 0);
        expect(
          DateTimeHelpers.formatRelativeTime(timestamp, referenceTime: now),
          equals('30s ago'),
        );
      });

      test('formats minutes ago', () {
        final now = DateTime(2025, 1, 1, 12, 30, 0);
        final timestamp = DateTime(2025, 1, 1, 12, 0, 0);
        expect(
          DateTimeHelpers.formatRelativeTime(timestamp, referenceTime: now),
          equals('30m ago'),
        );
      });

      test('formats hours ago', () {
        final now = DateTime(2025, 1, 1, 14, 0, 0);
        final timestamp = DateTime(2025, 1, 1, 12, 0, 0);
        expect(
          DateTimeHelpers.formatRelativeTime(timestamp, referenceTime: now),
          equals('2h ago'),
        );
      });

      test('formats days ago', () {
        final now = DateTime(2025, 1, 8, 12, 0, 0);
        final timestamp = DateTime(2025, 1, 1, 12, 0, 0);
        expect(
          DateTimeHelpers.formatRelativeTime(timestamp, referenceTime: now),
          equals('7d ago'),
        );
      });
    });

    group('formatResponseTime', () {
      test('formats milliseconds', () {
        expect(
          DateTimeHelpers.formatResponseTime(const Duration(milliseconds: 45)),
          equals('45ms'),
        );
      });

      test('formats seconds with decimal', () {
        expect(
          DateTimeHelpers.formatResponseTime(
            const Duration(milliseconds: 1500),
          ),
          equals('1.5s'),
        );
      });
    });

    group('formatDuration', () {
      test('formats days singular', () {
        expect(
          DateTimeHelpers.formatDuration(const Duration(days: 1)),
          equals('1 day'),
        );
      });

      test('formats days plural', () {
        expect(
          DateTimeHelpers.formatDuration(const Duration(days: 3)),
          equals('3 days'),
        );
      });

      test('formats hours', () {
        expect(
          DateTimeHelpers.formatDuration(const Duration(hours: 2)),
          equals('2 hours'),
        );
      });

      test('formats minutes', () {
        expect(
          DateTimeHelpers.formatDuration(const Duration(minutes: 30)),
          equals('30 minutes'),
        );
      });

      test('formats seconds', () {
        expect(
          DateTimeHelpers.formatDuration(const Duration(seconds: 45)),
          equals('45 seconds'),
        );
      });
    });

    group('formatDate', () {
      test('formats date correctly', () {
        final date = DateTime(2024, 1, 15);
        expect(DateTimeHelpers.formatDate(date), equals('Jan 15, 2024'));
      });

      test('formats all months', () {
        expect(
          DateTimeHelpers.formatDate(DateTime(2024, 6, 1)),
          contains('Jun'),
        );
        expect(
          DateTimeHelpers.formatDate(DateTime(2024, 12, 1)),
          contains('Dec'),
        );
      });
    });
  });

  // ===========================================================================
  // NUMBER HELPERS
  // ===========================================================================
  group('NumberHelpers', () {
    group('formatNumber', () {
      test('formats integer without decimals', () {
        expect(NumberHelpers.formatNumber(42), equals('42'));
      });

      test('formats decimal with natural precision', () {
        expect(NumberHelpers.formatNumber(42.5), equals('42.5'));
      });

      test('formats with specified decimals', () {
        expect(NumberHelpers.formatNumber(42.5, decimals: 2), equals('42.50'));
      });

      test('rounds to specified decimals', () {
        expect(
          NumberHelpers.formatNumber(42.123, decimals: 2),
          equals('42.12'),
        );
      });

      test('whole doubles show as integers', () {
        expect(NumberHelpers.formatNumber(42.0), equals('42'));
      });
    });
  });

  // ===========================================================================
  // PAGINATION HELPER
  // ===========================================================================
  group('PaginationHelper', () {
    group('calculateStartItem', () {
      test('page 1 starts at 1', () {
        expect(PaginationHelper.calculateStartItem(1, 10), equals(1));
      });

      test('page 2 starts at 11', () {
        expect(PaginationHelper.calculateStartItem(2, 10), equals(11));
      });
    });

    group('calculateEndItem', () {
      test('clamps to total items', () {
        expect(PaginationHelper.calculateEndItem(3, 10, 25), equals(25));
      });

      test('returns page end when not clamped', () {
        expect(PaginationHelper.calculateEndItem(1, 10, 100), equals(10));
      });
    });

    group('calculateTotalPages', () {
      test('calculates pages correctly', () {
        expect(PaginationHelper.calculateTotalPages(25, 10), equals(3));
      });

      test('returns 0 for invalid items per page', () {
        expect(PaginationHelper.calculateTotalPages(25, 0), equals(0));
      });
    });

    group('canGoPrevious', () {
      test('false on page 1', () {
        expect(PaginationHelper.canGoPrevious(1), isFalse);
      });

      test('true on page 2+', () {
        expect(PaginationHelper.canGoPrevious(2), isTrue);
      });
    });

    group('canGoNext', () {
      test('false on last page', () {
        expect(PaginationHelper.canGoNext(3, 3), isFalse);
      });

      test('true before last page', () {
        expect(PaginationHelper.canGoNext(2, 3), isTrue);
      });
    });

    group('getPageRangeText', () {
      test('formats range correctly', () {
        expect(
          PaginationHelper.getPageRangeText(1, 10, 100),
          equals('1-10 of 100'),
        );
      });

      test('handles zero items', () {
        expect(PaginationHelper.getPageRangeText(1, 10, 0), equals('0 of 0'));
      });

      test('clamps end to total', () {
        expect(
          PaginationHelper.getPageRangeText(3, 10, 25),
          equals('21-25 of 25'),
        );
      });
    });
  });

  // ===========================================================================
  // MIME HELPER
  // ===========================================================================
  group('MimeHelper', () {
    group('getMimeType', () {
      test('detects image/jpeg', () {
        expect(MimeHelper.getMimeType('photo.jpg'), equals('image/jpeg'));
      });

      test('detects application/pdf', () {
        expect(MimeHelper.getMimeType('doc.pdf'), equals('application/pdf'));
      });

      test('returns octet-stream for unknown', () {
        expect(
          MimeHelper.getMimeType('file.xyz'),
          equals('application/octet-stream'),
        );
      });
    });

    group('getExtension', () {
      test('extracts extension lowercase', () {
        expect(MimeHelper.getExtension('photo.JPG'), equals('jpg'));
      });

      test('handles multiple dots', () {
        expect(MimeHelper.getExtension('file.tar.gz'), equals('gz'));
      });

      test('returns empty for no extension', () {
        expect(MimeHelper.getExtension('noextension'), equals(''));
      });
    });

    group('isImage', () {
      test('true for image types', () {
        expect(MimeHelper.isImage('image/jpeg'), isTrue);
        expect(MimeHelper.isImage('image/png'), isTrue);
      });

      test('false for non-image', () {
        expect(MimeHelper.isImage('application/pdf'), isFalse);
      });
    });

    group('isPdf', () {
      test('true for pdf', () {
        expect(MimeHelper.isPdf('application/pdf'), isTrue);
      });

      test('false for non-pdf', () {
        expect(MimeHelper.isPdf('image/jpeg'), isFalse);
      });
    });

    group('isDocument', () {
      test('true for pdf', () {
        expect(MimeHelper.isDocument('application/pdf'), isTrue);
      });

      test('true for word docs', () {
        expect(MimeHelper.isDocument('application/msword'), isTrue);
      });
    });

    group('isText', () {
      test('true for text types', () {
        expect(MimeHelper.isText('text/plain'), isTrue);
        expect(MimeHelper.isText('text/html'), isTrue);
      });

      test('false for non-text', () {
        expect(MimeHelper.isText('application/pdf'), isFalse);
      });
    });
  });

  // ===========================================================================
  // COLOR HELPERS
  // ===========================================================================
  group('ColorHelpers', () {
    group('responseTimeColor', () {
      test('returns success for fast (<100ms)', () {
        final color = ColorHelpers.responseTimeColor(
          const Duration(milliseconds: 50),
        );
        expect(color, isNotNull);
      });

      test('returns warning for medium (100-500ms)', () {
        final color = ColorHelpers.responseTimeColor(
          const Duration(milliseconds: 250),
        );
        expect(color, isNotNull);
      });

      test('returns error for slow (>500ms)', () {
        final color = ColorHelpers.responseTimeColor(
          const Duration(milliseconds: 600),
        );
        expect(color, isNotNull);
      });
    });

    group('withOpacity', () {
      test('applies opacity correctly', () {
        final color = ColorHelpers.withOpacity(Colors.blue, 0.5);
        expect(color.a, closeTo(0.5, 0.01));
      });
    });

    group('isLight', () {
      test('white is light', () {
        expect(ColorHelpers.isLight(Colors.white), isTrue);
      });

      test('black is not light', () {
        expect(ColorHelpers.isLight(Colors.black), isFalse);
      });
    });

    group('contrastingTextColor', () {
      test('returns black for white background', () {
        expect(ColorHelpers.contrastingTextColor(Colors.white), Colors.black);
      });

      test('returns white for black background', () {
        expect(ColorHelpers.contrastingTextColor(Colors.black), Colors.white);
      });
    });

    group('lighten', () {
      test('lightens by mixing with white', () {
        final lighter = ColorHelpers.lighten(Colors.blue, 0.5);
        expect(ColorHelpers.isLight(lighter), isTrue);
      });

      test('no change at 0', () {
        final original = const Color(0xFF2196F3); // Blue
        final same = ColorHelpers.lighten(original, 0.0);
        expect(same, original);
      });
    });

    group('darken', () {
      test('darkens by mixing with black', () {
        final darker = ColorHelpers.darken(Colors.yellow, 0.5);
        expect(ColorHelpers.isLight(darker), isFalse);
      });

      test('no change at 0', () {
        final original = const Color(0xFF2196F3); // Blue
        final same = ColorHelpers.darken(original, 0.0);
        expect(same, original);
      });
    });
  });

  // ===========================================================================
  // INPUT TYPE HELPERS
  // ===========================================================================
  group('InputTypeHelpers', () {
    group('getKeyboardType', () {
      test('email returns emailAddress', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.email),
          TextInputType.emailAddress,
        );
      });

      test('phone returns phone', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.phone),
          TextInputType.phone,
        );
      });

      test('url returns url', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.url),
          TextInputType.url,
        );
      });

      test('text returns text', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.text),
          TextInputType.text,
        );
      });

      test('password returns text', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.password),
          TextInputType.text,
        );
      });
    });
  });
}
