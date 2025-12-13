/// Tests for AppBorders configuration
///
/// **BEHAVIORAL FOCUS:**
/// - Border radius values are correct
/// - Border widths are correct
/// - Border helpers create correct borders
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_borders.dart';

void main() {
  group('AppBorders', () {
    group('Border Radius', () {
      test('radiusNone is zero', () {
        expect(AppBorders.radiusNone, BorderRadius.zero);
      });

      test('radiusXSmall is 4px', () {
        expect(
          AppBorders.radiusXSmall,
          const BorderRadius.all(Radius.circular(4.0)),
        );
      });

      test('radiusSmall is 8px', () {
        expect(
          AppBorders.radiusSmall,
          const BorderRadius.all(Radius.circular(8.0)),
        );
      });

      test('radiusMedium is 12px', () {
        expect(
          AppBorders.radiusMedium,
          const BorderRadius.all(Radius.circular(12.0)),
        );
      });

      test('radiusLarge is 16px', () {
        expect(
          AppBorders.radiusLarge,
          const BorderRadius.all(Radius.circular(16.0)),
        );
      });

      test('radiusXLarge is 24px', () {
        expect(
          AppBorders.radiusXLarge,
          const BorderRadius.all(Radius.circular(24.0)),
        );
      });

      test('radiusCircular is fully rounded', () {
        expect(
          AppBorders.radiusCircular,
          const BorderRadius.all(Radius.circular(999.0)),
        );
      });
    });

    group('Individual Corner Radii', () {
      test('radiusTopMedium only rounds top corners', () {
        expect(
          AppBorders.radiusTopMedium,
          const BorderRadius.only(
            topLeft: Radius.circular(12.0),
            topRight: Radius.circular(12.0),
          ),
        );
      });

      test('radiusBottomMedium only rounds bottom corners', () {
        expect(
          AppBorders.radiusBottomMedium,
          const BorderRadius.only(
            bottomLeft: Radius.circular(12.0),
            bottomRight: Radius.circular(12.0),
          ),
        );
      });

      test('radiusTopLarge only rounds top corners with 16px', () {
        expect(
          AppBorders.radiusTopLarge,
          const BorderRadius.only(
            topLeft: Radius.circular(16.0),
            topRight: Radius.circular(16.0),
          ),
        );
      });

      test('radiusBottomLarge only rounds bottom corners with 16px', () {
        expect(
          AppBorders.radiusBottomLarge,
          const BorderRadius.only(
            bottomLeft: Radius.circular(16.0),
            bottomRight: Radius.circular(16.0),
          ),
        );
      });
    });

    group('Border Widths', () {
      test('widthNone is 0px', () {
        expect(AppBorders.widthNone, 0.0);
      });

      test('widthHairline is 0.5px', () {
        expect(AppBorders.widthHairline, 0.5);
      });

      test('widthThin is 1px', () {
        expect(AppBorders.widthThin, 1.0);
      });

      test('widthMedium is 2px', () {
        expect(AppBorders.widthMedium, 2.0);
      });

      test('widthThick is 3px', () {
        expect(AppBorders.widthThick, 3.0);
      });

      test('widthXThick is 4px', () {
        expect(AppBorders.widthXThick, 4.0);
      });
    });

    group('Border Side Helpers', () {
      test('thin creates 1px border side', () {
        final side = AppBorders.thin(Colors.red);
        expect(side.width, 1.0);
        expect(side.color, Colors.red);
      });

      test('medium creates 2px border side', () {
        final side = AppBorders.medium(Colors.blue);
        expect(side.width, 2.0);
        expect(side.color, Colors.blue);
      });

      test('thick creates 3px border side', () {
        final side = AppBorders.thick(Colors.green);
        expect(side.width, 3.0);
        expect(side.color, Colors.green);
      });

      test('hairline creates 0.5px border side', () {
        final side = AppBorders.hairline(Colors.grey);
        expect(side.width, 0.5);
        expect(side.color, Colors.grey);
      });
    });

    group('Complete Border Helpers', () {
      test('allThin creates full 1px border', () {
        final border = AppBorders.allThin(Colors.red);
        expect(border.top.width, 1.0);
        expect(border.top.color, Colors.red);
        expect(border.bottom.width, 1.0);
        expect(border.left.width, 1.0);
        expect(border.right.width, 1.0);
      });

      test('allMedium creates full 2px border', () {
        final border = AppBorders.allMedium(Colors.blue);
        expect(border.top.width, 2.0);
        expect(border.top.color, Colors.blue);
      });

      test('allThick creates full 3px border', () {
        final border = AppBorders.allThick(Colors.green);
        expect(border.top.width, 3.0);
        expect(border.top.color, Colors.green);
      });

      test('bottomThin creates bottom-only 1px border', () {
        final border = AppBorders.bottomThin(Colors.red);
        expect(border.bottom.width, 1.0);
        expect(border.bottom.color, Colors.red);
        expect(border.top, BorderSide.none);
        expect(border.left, BorderSide.none);
        expect(border.right, BorderSide.none);
      });

      test('bottomMedium creates bottom-only 2px border', () {
        final border = AppBorders.bottomMedium(Colors.blue);
        expect(border.bottom.width, 2.0);
        expect(border.top, BorderSide.none);
      });

      test('topThin creates top-only 1px border', () {
        final border = AppBorders.topThin(Colors.red);
        expect(border.top.width, 1.0);
        expect(border.bottom, BorderSide.none);
      });

      test('topMedium creates top-only 2px border', () {
        final border = AppBorders.topMedium(Colors.blue);
        expect(border.top.width, 2.0);
      });
    });

    group('Outlined Border Helpers', () {
      test('outlineSmall has 8px radius', () {
        final shape = AppBorders.outlineSmall(Colors.red);
        expect(shape, isA<RoundedRectangleBorder>());
        expect(
          (shape as RoundedRectangleBorder).borderRadius,
          AppBorders.radiusSmall,
        );
      });

      test('outlineMedium has 12px radius', () {
        final shape = AppBorders.outlineMedium(Colors.red);
        expect(shape, isA<RoundedRectangleBorder>());
        expect(
          (shape as RoundedRectangleBorder).borderRadius,
          AppBorders.radiusMedium,
        );
      });

      test('outlineLarge has 16px radius', () {
        final shape = AppBorders.outlineLarge(Colors.red);
        expect(shape, isA<RoundedRectangleBorder>());
        expect(
          (shape as RoundedRectangleBorder).borderRadius,
          AppBorders.radiusLarge,
        );
      });

      test('outlineCircular creates CircleBorder', () {
        final shape = AppBorders.outlineCircular(Colors.red);
        expect(shape, isA<CircleBorder>());
      });

      test('outline helpers accept custom width', () {
        final shape = AppBorders.outlineSmall(Colors.red, width: 3.0);
        expect((shape as RoundedRectangleBorder).side.width, 3.0);
      });
    });

    group('Utility Methods', () {
      test('customRadius creates border radius with specified value', () {
        final radius = AppBorders.customRadius(20.0);
        expect(radius, const BorderRadius.all(Radius.circular(20.0)));
      });

      test('customAsymmetric creates asymmetric border radius', () {
        final radius = AppBorders.customAsymmetric(topLeft: 8, bottomRight: 16);
        expect(
          radius,
          const BorderRadius.only(
            topLeft: Radius.circular(8),
            topRight: Radius.zero,
            bottomLeft: Radius.zero,
            bottomRight: Radius.circular(16),
          ),
        );
      });
    });

    group('Predefined Borders', () {
      test('none is empty border', () {
        expect(AppBorders.none, const Border());
      });
    });
  });
}
