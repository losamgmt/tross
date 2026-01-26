import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/pagination_helper.dart';

void main() {
  group('PaginationHelper', () {
    group('calculateStartItem', () {
      test('returns 1 for first page', () {
        expect(PaginationHelper.calculateStartItem(1, 10), 1);
      });

      test('returns correct start for second page', () {
        expect(PaginationHelper.calculateStartItem(2, 10), 11);
      });

      test('returns correct start for third page', () {
        expect(PaginationHelper.calculateStartItem(3, 10), 21);
      });

      test('handles different page sizes', () {
        expect(PaginationHelper.calculateStartItem(2, 25), 26);
      });

      test('handles page size of 1', () {
        expect(PaginationHelper.calculateStartItem(5, 1), 5);
      });
    });

    group('calculateEndItem', () {
      test('returns itemsPerPage for first page with enough items', () {
        expect(PaginationHelper.calculateEndItem(1, 10, 100), 10);
      });

      test('returns correct end for second page', () {
        expect(PaginationHelper.calculateEndItem(2, 10, 100), 20);
      });

      test('clamps to totalItems on last page', () {
        expect(PaginationHelper.calculateEndItem(3, 10, 25), 25);
      });

      test('handles partial last page', () {
        expect(PaginationHelper.calculateEndItem(2, 10, 15), 15);
      });

      test('handles exact fit (no remainder)', () {
        expect(PaginationHelper.calculateEndItem(3, 10, 30), 30);
      });
    });

    group('calculateTotalPages', () {
      test('calculates correct pages with even division', () {
        expect(PaginationHelper.calculateTotalPages(100, 10), 10);
      });

      test('rounds up for partial page', () {
        expect(PaginationHelper.calculateTotalPages(25, 10), 3);
      });

      test('returns 1 for items less than page size', () {
        expect(PaginationHelper.calculateTotalPages(5, 10), 1);
      });

      test('returns 0 for zero items', () {
        expect(PaginationHelper.calculateTotalPages(0, 10), 0);
      });

      test('returns 0 for zero page size', () {
        expect(PaginationHelper.calculateTotalPages(100, 0), 0);
      });

      test('returns 0 for negative page size', () {
        expect(PaginationHelper.calculateTotalPages(100, -5), 0);
      });
    });

    group('canGoPrevious', () {
      test('returns false for first page', () {
        expect(PaginationHelper.canGoPrevious(1), false);
      });

      test('returns true for second page', () {
        expect(PaginationHelper.canGoPrevious(2), true);
      });

      test('returns true for any page after first', () {
        expect(PaginationHelper.canGoPrevious(5), true);
      });
    });

    group('canGoNext', () {
      test('returns true when not on last page', () {
        expect(PaginationHelper.canGoNext(1, 5), true);
      });

      test('returns false when on last page', () {
        expect(PaginationHelper.canGoNext(5, 5), false);
      });

      test('returns false when only one page', () {
        expect(PaginationHelper.canGoNext(1, 1), false);
      });

      test('returns true for middle pages', () {
        expect(PaginationHelper.canGoNext(3, 10), true);
      });
    });

    group('getPageRangeText', () {
      test('formats range for first page', () {
        expect(PaginationHelper.getPageRangeText(1, 10, 100), '1-10 of 100');
      });

      test('formats range for middle page', () {
        expect(PaginationHelper.getPageRangeText(2, 10, 100), '11-20 of 100');
      });

      test('formats range for last page with partial items', () {
        expect(PaginationHelper.getPageRangeText(3, 10, 25), '21-25 of 25');
      });

      test('returns 0 of 0 for empty data', () {
        expect(PaginationHelper.getPageRangeText(1, 10, 0), '0 of 0');
      });

      test('formats single item', () {
        expect(PaginationHelper.getPageRangeText(1, 10, 1), '1-1 of 1');
      });
    });
  });
}
