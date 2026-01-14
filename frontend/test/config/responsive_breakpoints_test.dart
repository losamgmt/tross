/// Responsive Breakpoints Tests
///
/// Tests Material Design 3 breakpoint logic and responsive utilities.
///
/// Coverage targets:
/// - ResponsiveBreakpoints constants
/// - Breakpoint class (isCompact, isMedium, isExpanded, isLarge, isExtraLarge)
/// - Breakpoint.columns, responsive(), minColumnWidth
/// - Breakpoint equality and toString
/// - ResponsiveExtension on BuildContext
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/responsive_breakpoints.dart';

void main() {
  group('ResponsiveBreakpoints', () {
    group('Constants', () {
      test('compact breakpoint is 600', () {
        expect(ResponsiveBreakpoints.compact, 600.0);
      });

      test('medium breakpoint is 840', () {
        expect(ResponsiveBreakpoints.medium, 840.0);
      });

      test('expanded breakpoint is 1200', () {
        expect(ResponsiveBreakpoints.expanded, 1200.0);
      });

      test('large breakpoint is 1600', () {
        expect(ResponsiveBreakpoints.large, 1600.0);
      });

      test('extraLarge breakpoint is 1600', () {
        expect(ResponsiveBreakpoints.extraLarge, 1600.0);
      });
    });
  });

  group('Breakpoint', () {
    group('Factory', () {
      test('fromWidth creates breakpoint with correct width', () {
        final bp = Breakpoint.fromWidth(500);
        expect(bp.width, 500);
      });
    });

    group('isCompact', () {
      test('returns true for width 0', () {
        expect(Breakpoint.fromWidth(0).isCompact, isTrue);
      });

      test('returns true for width 599', () {
        expect(Breakpoint.fromWidth(599).isCompact, isTrue);
      });

      test('returns false for width 600', () {
        expect(Breakpoint.fromWidth(600).isCompact, isFalse);
      });
    });

    group('isMedium', () {
      test('returns false for width 599', () {
        expect(Breakpoint.fromWidth(599).isMedium, isFalse);
      });

      test('returns true for width 600', () {
        expect(Breakpoint.fromWidth(600).isMedium, isTrue);
      });

      test('returns true for width 839', () {
        expect(Breakpoint.fromWidth(839).isMedium, isTrue);
      });

      test('returns false for width 840', () {
        expect(Breakpoint.fromWidth(840).isMedium, isFalse);
      });
    });

    group('isExpanded', () {
      test('returns false for width 839', () {
        expect(Breakpoint.fromWidth(839).isExpanded, isFalse);
      });

      test('returns true for width 840', () {
        expect(Breakpoint.fromWidth(840).isExpanded, isTrue);
      });

      test('returns true for width 1199', () {
        expect(Breakpoint.fromWidth(1199).isExpanded, isTrue);
      });

      test('returns false for width 1200', () {
        expect(Breakpoint.fromWidth(1200).isExpanded, isFalse);
      });
    });

    group('isLarge', () {
      test('returns false for width 1199', () {
        expect(Breakpoint.fromWidth(1199).isLarge, isFalse);
      });

      test('returns true for width 1200', () {
        expect(Breakpoint.fromWidth(1200).isLarge, isTrue);
      });

      test('returns true for width 1599', () {
        expect(Breakpoint.fromWidth(1599).isLarge, isTrue);
      });

      test('returns false for width 1600', () {
        expect(Breakpoint.fromWidth(1600).isLarge, isFalse);
      });
    });

    group('isExtraLarge', () {
      test('returns false for width 1599', () {
        expect(Breakpoint.fromWidth(1599).isExtraLarge, isFalse);
      });

      test('returns true for width 1600', () {
        expect(Breakpoint.fromWidth(1600).isExtraLarge, isTrue);
      });

      test('returns true for width 2000', () {
        expect(Breakpoint.fromWidth(2000).isExtraLarge, isTrue);
      });
    });

    group('columns', () {
      test('returns 4 for compact', () {
        expect(Breakpoint.fromWidth(400).columns, 4);
      });

      test('returns 8 for medium', () {
        expect(Breakpoint.fromWidth(700).columns, 8);
      });

      test('returns 12 for expanded', () {
        expect(Breakpoint.fromWidth(1000).columns, 12);
      });

      test('returns 12 for large', () {
        expect(Breakpoint.fromWidth(1400).columns, 12);
      });

      test('returns 12 for extra large', () {
        expect(Breakpoint.fromWidth(1800).columns, 12);
      });
    });

    group('minColumnWidth', () {
      test('returns 150 for compact', () {
        expect(Breakpoint.fromWidth(400).minColumnWidth, 150.0);
      });

      test('returns 200 for medium', () {
        expect(Breakpoint.fromWidth(700).minColumnWidth, 200.0);
      });

      test('returns 250 for expanded', () {
        expect(Breakpoint.fromWidth(1000).minColumnWidth, 250.0);
      });

      test('returns 250 for large', () {
        expect(Breakpoint.fromWidth(1400).minColumnWidth, 250.0);
      });

      test('returns 250 for extra large', () {
        expect(Breakpoint.fromWidth(1800).minColumnWidth, 250.0);
      });
    });

    group('responsive()', () {
      test('returns compact value for compact breakpoint', () {
        final result = Breakpoint.fromWidth(
          400,
        ).responsive(compact: 'mobile', medium: 'tablet', expanded: 'desktop');
        expect(result, 'mobile');
      });

      test('returns medium value for medium breakpoint', () {
        final result = Breakpoint.fromWidth(
          700,
        ).responsive(compact: 'mobile', medium: 'tablet', expanded: 'desktop');
        expect(result, 'tablet');
      });

      test('returns expanded value for expanded breakpoint', () {
        final result = Breakpoint.fromWidth(
          1000,
        ).responsive(compact: 'mobile', medium: 'tablet', expanded: 'desktop');
        expect(result, 'desktop');
      });

      test('returns large value for large breakpoint when provided', () {
        final result = Breakpoint.fromWidth(
          1400,
        ).responsive(compact: 'mobile', large: 'large-desktop');
        expect(result, 'large-desktop');
      });

      test(
        'returns extraLarge value for extra large breakpoint when provided',
        () {
          final result = Breakpoint.fromWidth(
            1800,
          ).responsive(compact: 'mobile', extraLarge: 'ultra-wide');
          expect(result, 'ultra-wide');
        },
      );

      test('falls back to compact when specific value not provided', () {
        final result = Breakpoint.fromWidth(
          1800,
        ).responsive(compact: 'fallback');
        expect(result, 'fallback');
      });

      test('falls back through hierarchy correctly', () {
        // Large breakpoint but only expanded is set
        final result = Breakpoint.fromWidth(
          1400,
        ).responsive(compact: 'mobile', expanded: 'desktop');
        // Should fall back to compact since large is not set and it checks
        // large first, then expanded, but expanded condition fails
        expect(result, 'mobile');
      });
    });

    group('toString', () {
      test('returns Breakpoint.compact for compact', () {
        expect(Breakpoint.fromWidth(400).toString(), 'Breakpoint.compact');
      });

      test('returns Breakpoint.medium for medium', () {
        expect(Breakpoint.fromWidth(700).toString(), 'Breakpoint.medium');
      });

      test('returns Breakpoint.expanded for expanded', () {
        expect(Breakpoint.fromWidth(1000).toString(), 'Breakpoint.expanded');
      });

      test('returns Breakpoint.large for large', () {
        expect(Breakpoint.fromWidth(1400).toString(), 'Breakpoint.large');
      });

      test('returns Breakpoint.extraLarge for extra large', () {
        expect(Breakpoint.fromWidth(1800).toString(), 'Breakpoint.extraLarge');
      });
    });

    group('Equality', () {
      test('equal breakpoints are equal', () {
        final bp1 = Breakpoint.fromWidth(500);
        final bp2 = Breakpoint.fromWidth(500);
        expect(bp1, equals(bp2));
      });

      test('different breakpoints are not equal', () {
        final bp1 = Breakpoint.fromWidth(500);
        final bp2 = Breakpoint.fromWidth(600);
        expect(bp1, isNot(equals(bp2)));
      });

      test('hashCode is consistent with equality', () {
        final bp1 = Breakpoint.fromWidth(500);
        final bp2 = Breakpoint.fromWidth(500);
        expect(bp1.hashCode, equals(bp2.hashCode));
      });

      test('identical breakpoints are equal', () {
        final bp = Breakpoint.fromWidth(500);
        expect(bp == bp, isTrue);
      });

      test('breakpoint is not equal to non-breakpoint', () {
        final bp = Breakpoint.fromWidth(500);
        // ignore: unrelated_type_equality_checks
        expect(bp == 500, isFalse);
      });
    });
  });

  group('ResponsiveExtension', () {
    Widget buildTestWidget({
      required double width,
      required Widget Function(BuildContext) builder,
    }) {
      return MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(size: Size(width, 800)),
          child: Builder(builder: builder),
        ),
      );
    }

    testWidgets('breakpoint returns correct breakpoint for width', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 400,
          builder: (context) {
            expect(context.breakpoint.isCompact, isTrue);
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('isCompact returns true for compact width', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 400,
          builder: (context) {
            expect(context.isCompact, isTrue);
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('isMedium returns true for medium width', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 700,
          builder: (context) {
            expect(context.isMedium, isTrue);
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('isExpanded returns true for expanded width', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 1000,
          builder: (context) {
            expect(context.isExpanded, isTrue);
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('isLarge returns true for large width', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 1400,
          builder: (context) {
            expect(context.isLarge, isTrue);
            return const SizedBox();
          },
        ),
      );
    });

    testWidgets('isExtraLarge returns true for extra large width', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestWidget(
          width: 1800,
          builder: (context) {
            expect(context.isExtraLarge, isTrue);
            return const SizedBox();
          },
        ),
      );
    });
  });
}
