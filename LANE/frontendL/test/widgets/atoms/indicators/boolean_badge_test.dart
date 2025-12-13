/// Tests for BooleanBadge Atom
///
/// Verifies:
/// - True/false label display
/// - Custom labels
/// - Badge styles
/// - Factory constructors
/// - Compact mode
/// - Optional icons
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/indicators/boolean_badge.dart';
import 'package:tross_app/widgets/atoms/indicators/status_badge.dart';

void main() {
  group('BooleanBadge Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays true label with default "Yes"', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge(value: true))),
        );

        expect(find.text('Yes'), findsOneWidget);
        expect(find.byType(StatusBadge), findsOneWidget);
      });

      testWidgets('displays false label with default "No"', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge(value: false))),
        );

        expect(find.text('No'), findsOneWidget);
      });

      testWidgets('displays custom true label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(value: true, trueLabel: 'Enabled'),
            ),
          ),
        );

        expect(find.text('Enabled'), findsOneWidget);
      });

      testWidgets('displays custom false label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(value: false, falseLabel: 'Disabled'),
            ),
          ),
        );

        expect(find.text('Disabled'), findsOneWidget);
      });
    });

    group('Badge Styles', () {
      testWidgets('uses true style when value is true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(
                value: true,
                trueStyle: BadgeStyle.success,
                falseStyle: BadgeStyle.error,
              ),
            ),
          ),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.success);
      });

      testWidgets('uses false style when value is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(
                value: false,
                trueStyle: BadgeStyle.success,
                falseStyle: BadgeStyle.error,
              ),
            ),
          ),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.error);
      });
    });

    group('Compact Mode', () {
      testWidgets('passes compact flag to StatusBadge', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge(value: true, compact: true)),
          ),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.compact, isTrue);
      });

      testWidgets('not compact by default', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge(value: true))),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.compact, isFalse);
      });
    });

    group('Factory: activeInactive', () {
      testWidgets('displays "Active" when true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.activeInactive(value: true)),
          ),
        );

        expect(find.text('Active'), findsOneWidget);

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.success);
      });

      testWidgets('displays "Inactive" when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.activeInactive(value: false)),
          ),
        );

        expect(find.text('Inactive'), findsOneWidget);

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.neutral);
      });
    });

    group('Factory: publishedDraft', () {
      testWidgets('displays "Published" when true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.publishedDraft(value: true)),
          ),
        );

        expect(find.text('Published'), findsOneWidget);

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.info);
      });

      testWidgets('displays "Draft" when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.publishedDraft(value: false)),
          ),
        );

        expect(find.text('Draft'), findsOneWidget);

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.style, BadgeStyle.warning);
      });
    });

    group('Factory: enabledDisabled', () {
      testWidgets('displays "Enabled" when true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.enabledDisabled(value: true)),
          ),
        );

        expect(find.text('Enabled'), findsOneWidget);
      });

      testWidgets('displays "Disabled" when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanBadge.enabledDisabled(value: false)),
          ),
        );

        expect(find.text('Disabled'), findsOneWidget);
      });
    });

    group('Factory: yesNo', () {
      testWidgets('displays "Yes" when true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge.yesNo(value: true))),
        );

        expect(find.text('Yes'), findsOneWidget);
      });

      testWidgets('displays "No" when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge.yesNo(value: false))),
        );

        expect(find.text('No'), findsOneWidget);
      });
    });

    group('Icons', () {
      testWidgets('passes true icon to StatusBadge', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(
                value: true,
                trueIcon: Icons.star,
                falseIcon: Icons.star_border,
              ),
            ),
          ),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.icon, Icons.star);
      });

      testWidgets('passes false icon to StatusBadge', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanBadge(
                value: false,
                trueIcon: Icons.star,
                falseIcon: Icons.star_border,
              ),
            ),
          ),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.icon, Icons.star_border);
      });

      testWidgets('no icon when not provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: BooleanBadge(value: true))),
        );

        final badge = tester.widget<StatusBadge>(find.byType(StatusBadge));
        expect(badge.icon, isNull);
      });
    });

    group('State Changes', () {
      testWidgets('updates display when value changes', (tester) async {
        var value = true;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) {
                  return GestureDetector(
                    onTap: () => setState(() => value = !value),
                    child: BooleanBadge.activeInactive(value: value),
                  );
                },
              ),
            ),
          ),
        );

        // Initial: Active
        expect(find.text('Active'), findsOneWidget);

        // Tap to toggle
        await tester.tap(find.byType(GestureDetector));
        await tester.pumpAndSettle();

        // Should now show Inactive
        expect(find.text('Inactive'), findsOneWidget);
        expect(find.text('Active'), findsNothing);
      });
    });
  });
}
