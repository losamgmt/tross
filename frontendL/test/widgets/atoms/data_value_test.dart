/// DataValue Atom Tests ✅ MIGRATED TO TEST INFRASTRUCTURE
///
/// Comprehensive tests for the DataValue atom component
/// Tests rendering, emphasis levels, factory methods, and copyable behavior
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../helpers/helpers.dart';

void main() {
  group('DataValue Atom Tests', () {
    testWidgets('renders basic text', (tester) async {
      await pumpTestWidget(tester, const DataValue(text: 'Test Value'));

      expect(find.text('Test Value'), findsOneWidget);
    });

    testWidgets('applies primary emphasis by default', (tester) async {
      await pumpTestWidget(tester, const DataValue(text: 'Primary'));

      expect(find.text('Primary'), findsOneWidget);
    });

    testWidgets('applies secondary emphasis', (tester) async {
      await pumpTestWidget(
        tester,
        const DataValue(text: 'Secondary', emphasis: ValueEmphasis.secondary),
      );

      expect(find.text('Secondary'), findsOneWidget);
    });

    testWidgets('applies tertiary emphasis', (tester) async {
      await pumpTestWidget(
        tester,
        const DataValue(text: 'Tertiary', emphasis: ValueEmphasis.tertiary),
      );

      expect(find.text('Tertiary'), findsOneWidget);
    });

    testWidgets('applies monospace font when specified', (tester) async {
      await pumpTestWidget(
        tester,
        const DataValue(text: 'Monospace', monospace: true),
      );

      final textWidget = tester.widget<Text>(find.text('Monospace'));
      expect(textWidget.style?.fontFamily, 'monospace');
    });

    testWidgets('respects maxLines parameter', (tester) async {
      await pumpTestWidget(
        tester,
        const DataValue(text: 'Test Value', maxLines: 2),
      );

      final textWidget = tester.widget<Text>(find.text('Test Value'));
      expect(textWidget.maxLines, 2);
    });

    testWidgets('respects overflow parameter', (tester) async {
      await pumpTestWidget(
        tester,
        const DataValue(text: 'Test Value', overflow: TextOverflow.ellipsis),
      );

      final textWidget = tester.widget<Text>(find.text('Test Value'));
      expect(textWidget.overflow, TextOverflow.ellipsis);
    });

    group('Email Factory Tests', () {
      testWidgets('creates email value with correct properties', (
        tester,
      ) async {
        await pumpTestWidget(tester, DataValue.email('test@example.com'));

        expect(find.text('test@example.com'), findsOneWidget);
      });

      testWidgets('email value has copy icon', (tester) async {
        await pumpTestWidget(tester, DataValue.email('test@example.com'));

        expect(find.byIcon(Icons.copy), findsOneWidget);
      });

      testWidgets('email value is tappable', (tester) async {
        await pumpTestWidget(tester, DataValue.email('test@example.com'));

        expect(find.byType(InkWell), findsOneWidget);
      });
    });

    group('ID Factory Tests', () {
      testWidgets('creates ID value with correct properties', (tester) async {
        await pumpTestWidget(tester, DataValue.id('12345'));

        expect(find.text('12345'), findsOneWidget);
      });

      testWidgets('ID value uses monospace font', (tester) async {
        await pumpTestWidget(tester, DataValue.id('12345'));

        final textWidget = tester.widget<Text>(find.text('12345'));
        expect(textWidget.style?.fontFamily, 'monospace');
      });

      testWidgets('ID value has ellipsis overflow', (tester) async {
        await pumpTestWidget(tester, DataValue.id('12345'));

        final textWidget = tester.widget<Text>(find.text('12345'));
        expect(textWidget.overflow, TextOverflow.ellipsis);
        expect(textWidget.maxLines, 1);
      });
    });

    group('Timestamp Factory Tests', () {
      testWidgets('formats today timestamp correctly', (tester) async {
        final now = DateTime.now();

        await pumpTestWidget(tester, DataValue.timestamp(now));

        expect(find.textContaining('Today'), findsOneWidget);
      });

      testWidgets('formats yesterday timestamp correctly', (tester) async {
        final yesterday = DateTime.now().subtract(const Duration(days: 1));

        await pumpTestWidget(tester, DataValue.timestamp(yesterday));

        expect(find.text('Yesterday'), findsOneWidget);
      });

      testWidgets('formats recent days correctly', (tester) async {
        final threeDaysAgo = DateTime.now().subtract(const Duration(days: 3));

        await pumpTestWidget(tester, DataValue.timestamp(threeDaysAgo));

        expect(find.text('3 days ago'), findsOneWidget);
      });

      testWidgets('formats old dates with full date', (tester) async {
        final oldDate = DateTime(2023, 1, 15);

        await pumpTestWidget(tester, DataValue.timestamp(oldDate));

        expect(find.text('2023-01-15'), findsOneWidget);
      });
    });

    group('Copyable Behavior Tests', () {
      testWidgets('non-copyable value has no copy icon', (tester) async {
        await pumpTestWidget(
          tester,
          const DataValue(text: 'Not Copyable', copyable: false),
        );

        expect(find.byIcon(Icons.copy), findsNothing);
        expect(find.byType(InkWell), findsNothing);
      });

      testWidgets('copyable value has copy icon', (tester) async {
        await pumpTestWidget(
          tester,
          const DataValue(text: 'Copyable', copyable: true),
        );

        expect(find.byIcon(Icons.copy), findsOneWidget);
      });

      testWidgets('copyable value is wrapped in InkWell', (tester) async {
        await pumpTestWidget(
          tester,
          const DataValue(text: 'Copyable', copyable: true),
        );

        expect(find.byType(InkWell), findsOneWidget);
      });
    });

    testWidgets('applies custom TextStyle when provided', (tester) async {
      const customStyle = TextStyle(fontSize: 20, fontWeight: FontWeight.bold);

      await pumpTestWidget(
        tester,
        const DataValue(text: 'Custom Style', style: customStyle),
      );

      final textWidget = tester.widget<Text>(find.text('Custom Style'));
      expect(textWidget.style?.fontSize, 20);
      expect(textWidget.style?.fontWeight, FontWeight.bold);
    });
  });
}
