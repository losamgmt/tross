/// StatusBadge Atom Tests
///
/// Comprehensive tests for the StatusBadge atom component
/// Tests rendering, styling, and variants (generic, data-driven)
/// ✅ MIGRATED: Uses test infrastructure (helpers, spacing)
/// ✅ UPDATED: Removed .role() factory tests (domain-specific logic removed)
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../helpers/helpers.dart';

void main() {
  group('StatusBadge Atom Tests', () {
    testWidgets('renders with required label', (tester) async {
      await pumpTestWidget(tester, const StatusBadge(label: 'Test Label'));

      expect(find.text('Test Label'), findsOneWidget);
    });

    testWidgets('renders with icon when provided', (tester) async {
      await pumpTestWidget(
        tester,
        const StatusBadge(label: 'With Icon', icon: Icons.star),
      );

      expect(find.byIcon(Icons.star), findsOneWidget);
      expect(find.text('With Icon'), findsOneWidget);
    });

    testWidgets('renders compact variant correctly', (tester) async {
      await pumpTestWidget(
        tester,
        const StatusBadge(label: 'Compact', compact: true),
      );

      expectContainerPadding(
        tester,
        find.text('Compact'),
        EdgeInsets.symmetric(
          horizontal: TestSpacing.sm,
          vertical: TestSpacing.xxs,
        ),
      );
    });

    testWidgets('renders normal variant correctly', (tester) async {
      await pumpTestWidget(
        tester,
        const StatusBadge(label: 'Normal', compact: false),
      );

      expectContainerPadding(
        tester,
        find.text('Normal'),
        EdgeInsets.symmetric(
          horizontal: TestSpacing.md,
          vertical: TestSpacing.xs,
        ),
      );
    });

    // ✅ REMOVED: Role Factory Tests - StatusBadge.role() was domain-specific
    // StatusBadge is now fully generic - tests below verify generic usage

    group('Style Variants Tests', () {
      testWidgets('applies success style', (tester) async {
        await pumpTestWidget(
          tester,
          const StatusBadge(label: 'Success', style: BadgeStyle.success),
        );

        expect(find.text('Success'), findsOneWidget);
      });

      testWidgets('applies warning style', (tester) async {
        await pumpTestWidget(
          tester,
          const StatusBadge(label: 'Warning', style: BadgeStyle.warning),
        );

        expect(find.text('Warning'), findsOneWidget);
      });

      testWidgets('applies error style', (tester) async {
        await pumpTestWidget(
          tester,
          const StatusBadge(label: 'Error', style: BadgeStyle.error),
        );

        expect(find.text('Error'), findsOneWidget);
      });

      testWidgets('applies info style', (tester) async {
        await pumpTestWidget(
          tester,
          const StatusBadge(label: 'Info', style: BadgeStyle.info),
        );

        expect(find.text('Info'), findsOneWidget);
      });

      testWidgets('applies neutral style (default)', (tester) async {
        await pumpTestWidget(
          tester,
          const StatusBadge(label: 'Neutral', style: BadgeStyle.neutral),
        );

        expect(find.text('Neutral'), findsOneWidget);
      });
    });
  });
}
