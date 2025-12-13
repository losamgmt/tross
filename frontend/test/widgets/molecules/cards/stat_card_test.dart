/// Tests for StatCard molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Displays value and label correctly
/// - Shows optional icon
/// - Handles tap interactions
/// - Applies custom colors
/// - Shows chevron when appropriate
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/cards/stat_card.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  group('StatCard', () {
    group('basic display', () {
      testWidgets('displays the value', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Total', value: '42'),
        );

        expect(find.text('42'), findsOneWidget);
      });

      testWidgets('displays the label', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Total Assets', value: '14'),
        );

        expect(find.text('Total Assets'), findsOneWidget);
      });

      testWidgets('value is displayed prominently', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Count', value: '99'),
        );

        final valueText = tester.widget<Text>(find.text('99'));
        expect(valueText.style?.fontWeight, FontWeight.bold);
      });
    });

    group('icon display', () {
      testWidgets('shows icon when provided', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(
            label: 'Pending',
            value: '6',
            icon: Icons.pending_outlined,
          ),
        );

        expect(find.byIcon(Icons.pending_outlined), findsOneWidget);
      });

      testWidgets('no icon container when icon is null', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'No Icon', value: '0'),
        );

        expect(find.byIcon(Icons.pending_outlined), findsNothing);
      });

      testWidgets('icon uses custom color when provided', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(
            label: 'Colored Icon',
            value: '5',
            icon: Icons.star,
            iconColor: Colors.amber,
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.star));
        expect(icon.color, Colors.amber);
      });
    });

    group('tap interaction', () {
      testWidgets('onTap callback is triggered when tapped', (tester) async {
        var tapped = false;
        await tester.pumpTestWidget(
          StatCard(label: 'Tappable', value: '1', onTap: () => tapped = true),
        );

        await tester.tap(find.byType(InkWell));
        await tester.pumpAndSettle();

        expect(tapped, isTrue);
      });

      testWidgets('wraps content in InkWell when onTap provided', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          StatCard(label: 'With Tap', value: '1', onTap: () {}),
        );

        expect(find.byType(InkWell), findsOneWidget);
      });

      testWidgets('no InkWell when onTap is null', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'No Tap', value: '1'),
        );

        expect(find.byType(InkWell), findsNothing);
      });
    });

    group('chevron display', () {
      testWidgets('shows chevron when showChevron is true', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'With Chevron', value: '1', showChevron: true),
        );

        expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      });

      testWidgets('shows chevron when onTap is provided', (tester) async {
        await tester.pumpTestWidget(
          StatCard(label: 'Tappable', value: '1', onTap: () {}),
        );

        expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      });

      testWidgets('no chevron when not tappable and showChevron false', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'No Chevron', value: '1'),
        );

        expect(find.byIcon(Icons.chevron_right), findsNothing);
      });
    });

    group('custom colors', () {
      testWidgets('applies custom background color', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(
            label: 'Custom BG',
            value: '1',
            backgroundColor: Colors.blue,
          ),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        final decoration = container.decoration as BoxDecoration?;
        expect(decoration?.color, Colors.blue);
      });

      testWidgets('applies custom text color to value', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(
            label: 'Custom Text',
            value: '7',
            textColor: Colors.red,
          ),
        );

        final valueText = tester.widget<Text>(find.text('7'));
        expect(valueText.style?.color, Colors.red);
      });
    });

    group('layout and sizing', () {
      testWidgets('respects custom width', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Wide', value: '1', width: 200),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.minWidth, 200);
      });

      testWidgets('respects custom minHeight', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Tall', value: '1', minHeight: 150),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.minHeight, 150);
      });

      testWidgets('default minHeight is 100', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Default Height', value: '1'),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.minHeight, 100);
      });

      testWidgets('uses Row for horizontal layout', (tester) async {
        await tester.pumpTestWidget(const StatCard(label: 'Row', value: '1'));

        expect(find.byType(Row), findsOneWidget);
      });

      testWidgets('uses Column for value/label stacking', (tester) async {
        await tester.pumpTestWidget(
          const StatCard(label: 'Column', value: '1'),
        );

        expect(find.byType(Column), findsOneWidget);
      });
    });

    group('full configuration', () {
      testWidgets('renders with all options', (tester) async {
        var tapped = false;
        await tester.pumpTestWidget(
          StatCard(
            label: 'Full Stats',
            value: '123',
            icon: Icons.analytics,
            backgroundColor: Colors.green.shade100,
            textColor: Colors.green.shade800,
            iconColor: Colors.green,
            onTap: () => tapped = true,
            width: 180,
            minHeight: 120,
            showChevron: true,
          ),
        );

        expect(find.text('123'), findsOneWidget);
        expect(find.text('Full Stats'), findsOneWidget);
        expect(find.byIcon(Icons.analytics), findsOneWidget);
        expect(find.byIcon(Icons.chevron_right), findsOneWidget);

        await tester.tap(find.byType(InkWell));
        await tester.pumpAndSettle();
        expect(tapped, isTrue);
      });
    });
  });
}
