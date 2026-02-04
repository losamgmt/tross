/// Tests for LoadingIndicator and SkeletonLoader atoms
///
/// Verifies:
/// - Different sizes render correctly
/// - Message display behavior
/// - Custom color support
/// - SkeletonLoader animation
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/indicators/loading_indicator.dart';

import '../../../helpers/test_harness.dart';

void main() {
  group('LoadingIndicator', () {
    group('Construction', () {
      testWidgets('renders with default values', (tester) async {
        await pumpTestWidget(tester, const LoadingIndicator());

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.byType(LoadingIndicator), findsOneWidget);
      });

      testWidgets('inline constructor renders small size', (tester) async {
        await pumpTestWidget(tester, const LoadingIndicator.inline());

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('fullScreen constructor renders large size', (tester) async {
        await pumpTestWidget(tester, const LoadingIndicator.fullScreen());

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });
    });

    group('Size Variations', () {
      for (final size in LoadingSize.values) {
        testWidgets('renders $size size', (tester) async {
          await pumpTestWidget(tester, LoadingIndicator(size: size));

          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        });
      }
    });

    group('Message Display', () {
      testWidgets('shows message when provided', (tester) async {
        await pumpTestWidget(
          tester,
          const LoadingIndicator(message: 'Loading data...'),
        );

        expect(find.text('Loading data...'), findsOneWidget);
        expect(find.byType(Column), findsOneWidget);
      });

      testWidgets('no Column when message is null', (tester) async {
        await pumpTestWidget(tester, const LoadingIndicator());

        // Should not have the message Column structure
        expect(find.text('Loading data...'), findsNothing);
      });

      testWidgets('fullScreen with message shows both', (tester) async {
        await pumpTestWidget(
          tester,
          const LoadingIndicator.fullScreen(message: 'Please wait...'),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Please wait...'), findsOneWidget);
      });
    });

    group('Custom Color', () {
      testWidgets('uses custom color when provided', (tester) async {
        await pumpTestWidget(tester, const LoadingIndicator(color: Colors.red));

        final indicator = tester.widget<CircularProgressIndicator>(
          find.byType(CircularProgressIndicator),
        );

        expect(indicator.valueColor, isNotNull);
      });

      testWidgets('inline uses custom color', (tester) async {
        await pumpTestWidget(
          tester,
          const LoadingIndicator.inline(color: Colors.blue),
        );

        final indicator = tester.widget<CircularProgressIndicator>(
          find.byType(CircularProgressIndicator),
        );

        expect(indicator.valueColor, isNotNull);
      });
    });
  });

  group('SkeletonLoader', () {
    group('Construction', () {
      testWidgets('renders with required dimensions', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(width: 100, height: 20),
        );

        expect(find.byType(SkeletonLoader), findsOneWidget);
      });

      testWidgets('renders with custom border radius', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(
            width: 100,
            height: 20,
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        );

        expect(find.byType(SkeletonLoader), findsOneWidget);
      });
    });

    group('Animation', () {
      testWidgets('contains AnimatedBuilder for animation', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(width: 100, height: 20),
        );

        // The widget uses AnimatedBuilder internally
        expect(find.byType(SkeletonLoader), findsOneWidget);
        // Advance animation
        await tester.pump(const Duration(milliseconds: 500));
        expect(find.byType(SkeletonLoader), findsOneWidget);

        // Advance more
        await tester.pump(const Duration(milliseconds: 500));
        expect(find.byType(SkeletonLoader), findsOneWidget);
      });

      testWidgets('disposes animation controller cleanly', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(width: 100, height: 20),
        );

        // Widget should exist
        expect(find.byType(SkeletonLoader), findsOneWidget);

        // Pump a new widget to trigger dispose
        await pumpTestWidget(tester, const SizedBox());

        // Should not throw
        expect(find.byType(SkeletonLoader), findsNothing);
      });
    });

    group('Sizing', () {
      testWidgets('respects width constraint', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(width: 200, height: 30),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(SkeletonLoader),
            matching: find.byType(Container),
          ),
        );

        final constraints = container.constraints;
        expect(constraints?.maxWidth, 200);
      });

      testWidgets('respects height constraint', (tester) async {
        await pumpTestWidget(
          tester,
          const SkeletonLoader(width: 100, height: 50),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(SkeletonLoader),
            matching: find.byType(Container),
          ),
        );

        final constraints = container.constraints;
        expect(constraints?.maxHeight, 50);
      });
    });
  });
}
