/// AppSizes Tests
///
/// Tests the responsive component sizing system.
/// Uses MediaQuery wrapper to test responsive calculations.
///
/// Coverage targets:
/// - All button heights (compact, small, medium, large, xlarge)
/// - All input dimensions
/// - All avatar sizes
/// - All card dimensions
/// - All modal dimensions
/// - All divider thicknesses
/// - All badge/chip sizes
/// - Static size constants
/// - SizesExtension on BuildContext
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/config/app_sizes.dart';

void main() {
  /// Helper to build a widget with controlled MediaQuery
  Widget buildTestWidget({
    double textScaleFactor = 1.0,
    double screenHeight = 800,
    required Widget Function(BuildContext) builder,
  }) {
    return MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(
          size: Size(400, screenHeight),
          textScaler: TextScaler.linear(textScaleFactor),
        ),
        child: Builder(builder: builder),
      ),
    );
  }

  group('AppSizes', () {
    group('Construction', () {
      testWidgets('can be constructed via AppSizes.of()', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              final sizes = AppSizes.of(context);
              expect(sizes, isNotNull);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Button Heights', () {
      testWidgets('buttonHeightCompact is 28dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.buttonHeightCompact, 28.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('buttonHeightSmall is 32dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.buttonHeightSmall, 32.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('buttonHeightMedium is 40dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.buttonHeightMedium, 40.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('buttonHeightLarge is 48dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.buttonHeightLarge, 48.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('buttonHeightXLarge is 56dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.buttonHeightXLarge, 56.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('button heights scale with text scale factor', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            textScaleFactor: 2.0,
            builder: (context) {
              // Base unit is 8 * 2.0 = 16, so medium = 16 * 5 = 80
              expect(context.sizes.buttonHeightMedium, 80.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Input Dimensions', () {
      testWidgets('inputHeightCompact is 32dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputHeightCompact, 32.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputHeightStandard is 40dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputHeightStandard, 40.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputHeightLarge is 48dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputHeightLarge, 48.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputWidthNarrow is 120dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputWidthNarrow, 120.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputWidthStandard is 200dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputWidthStandard, 200.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputWidthWide is 320dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputWidthWide, 320.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('inputWidthFull is infinity', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.inputWidthFull, double.infinity);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Avatar Sizes', () {
      testWidgets('avatarSizeXS is 24dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeXS, 24.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('avatarSizeSmall is 32dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeSmall, 32.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('avatarSizeMedium is 48dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeMedium, 48.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('avatarSizeLarge is 64dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeLarge, 64.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('avatarSizeXL is 96dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeXL, 96.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('avatarSizeHuge is 128dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.avatarSizeHuge, 128.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Card Dimensions', () {
      testWidgets('cardMinHeight is 80dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.cardMinHeight, 80.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('cardStandardHeight is 120dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.cardStandardHeight, 120.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('cardLargeHeight is 200dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.cardLargeHeight, 200.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('cardMaxWidth is 600dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.cardMaxWidth, 600.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Modal Dimensions', () {
      testWidgets('modalWidthSmall is 400dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.modalWidthSmall, 400.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('modalWidthMedium is 600dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.modalWidthMedium, 600.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('modalWidthLarge is 800dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.modalWidthLarge, 800.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('modalMaxHeight is 80% of screen height', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            screenHeight: 1000,
            builder: (context) {
              expect(context.sizes.modalMaxHeight, 800.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Divider Thicknesses', () {
      testWidgets('dividerThin is 1dp', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.dividerThin, 1.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('dividerStandard is 2dp', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.dividerStandard, 2.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('dividerThick is 4dp', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.dividerThick, 4.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Badge and Chip Sizes', () {
      testWidgets('badgeSizeSmall is 16dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.badgeSizeSmall, 16.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('badgeSizeMedium is 20dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.badgeSizeMedium, 20.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('badgeSizeLarge is 24dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.badgeSizeLarge, 24.0);
              return const SizedBox();
            },
          ),
        );
      });

      testWidgets('chipHeight is 28dp at scale 1.0', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            builder: (context) {
              expect(context.sizes.chipHeight, 28.0);
              return const SizedBox();
            },
          ),
        );
      });
    });

    group('Static Sizes', () {
      test('staticAvatarMedium is 48dp', () {
        expect(AppSizes.staticAvatarMedium, 48.0);
      });

      test('staticButtonHeight is 40dp', () {
        expect(AppSizes.staticButtonHeight, 40.0);
      });

      test('staticInputHeight is 40dp', () {
        expect(AppSizes.staticInputHeight, 40.0);
      });
    });
  });

  group('SizesExtension', () {
    testWidgets('context.sizes returns AppSizes instance', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(size: Size(400, 800)),
            child: Builder(
              builder: (context) {
                expect(context.sizes, isA<AppSizes>());
                return const SizedBox();
              },
            ),
          ),
        ),
      );
    });
  });
}
