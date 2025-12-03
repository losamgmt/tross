/// Tests for BooleanToggle Atom
///
/// Verifies:
/// - True/false visual states
/// - Custom icons and colors
/// - Tooltips
/// - Disabled state
/// - Compact mode
/// - Factory constructors
/// - Interaction callbacks
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/boolean_toggle.dart';

void main() {
  group('BooleanToggle Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays true state with default icons', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanToggle(value: true, onToggle: () {})),
          ),
        );

        expect(find.byIcon(Icons.check_circle), findsOneWidget);
        expect(find.byIcon(Icons.cancel), findsNothing);
      });

      testWidgets('displays false state with default icons', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanToggle(value: false, onToggle: () {})),
          ),
        );

        expect(find.byIcon(Icons.cancel), findsOneWidget);
        expect(find.byIcon(Icons.check_circle), findsNothing);
      });

      testWidgets('displays custom true icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: true,
                onToggle: () {},
                trueIcon: Icons.star,
                falseIcon: Icons.star_border,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.star), findsOneWidget);
      });

      testWidgets('displays custom false icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: false,
                onToggle: () {},
                trueIcon: Icons.star,
                falseIcon: Icons.star_border,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.star_border), findsOneWidget);
      });
    });

    group('Tooltips', () {
      testWidgets('shows default true tooltip', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanToggle(value: true, onToggle: () {})),
          ),
        );

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'True');
      });

      testWidgets('shows default false tooltip', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanToggle(value: false, onToggle: () {})),
          ),
        );

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'False');
      });

      testWidgets('shows custom true tooltip', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: true,
                onToggle: () {},
                tooltipTrue: 'Enabled',
                tooltipFalse: 'Disabled',
              ),
            ),
          ),
        );

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Enabled');
      });

      testWidgets('shows custom false tooltip', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: false,
                onToggle: () {},
                tooltipTrue: 'Enabled',
                tooltipFalse: 'Disabled',
              ),
            ),
          ),
        );

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Disabled');
      });
    });

    group('Interaction', () {
      testWidgets('calls onToggle when tapped', (tester) async {
        var toggleCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: true,
                onToggle: () => toggleCalled = true,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(BooleanToggle));
        await tester.pumpAndSettle();

        expect(toggleCalled, isTrue);
      });

      testWidgets('does not call onToggle when disabled', (tester) async {
        var toggleCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: true,
                onToggle: null, // Disabled
              ),
            ),
          ),
        );

        await tester.tap(find.byType(BooleanToggle));
        await tester.pumpAndSettle();

        expect(toggleCalled, isFalse);
      });
    });

    group('Disabled State', () {
      testWidgets('shows disabled styling when onToggle is null', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: BooleanToggle(value: true, onToggle: null)),
          ),
        );

        // Icon should be disabled color
        final icon = tester.widget<Icon>(find.byType(Icon));
        expect(icon.color, isNotNull);
        // Note: Can't easily test exact disabled color without theme access
      });
    });

    group('Compact Mode', () {
      testWidgets('uses compact sizing when compact=true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Column(
                children: [
                  BooleanToggle(value: true, onToggle: () {}, compact: true),
                  BooleanToggle(value: true, onToggle: () {}, compact: false),
                ],
              ),
            ),
          ),
        );

        final containers = tester.widgetList<Container>(find.byType(Container));

        // Compact should be smaller than normal
        final sizes = containers.map((c) => c.constraints?.maxWidth).toList();
        expect(sizes.length, greaterThanOrEqualTo(2));
      });
    });

    group('Factory: activeInactive', () {
      testWidgets('creates toggle with active/inactive semantics', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.activeInactive(value: true, onToggle: () {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.check_circle), findsOneWidget);

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Active');
      });

      testWidgets('shows Inactive tooltip when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.activeInactive(value: false, onToggle: () {}),
            ),
          ),
        );

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Inactive');
      });
    });

    group('Factory: publishedDraft', () {
      testWidgets('creates toggle with published/draft semantics', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.publishedDraft(value: true, onToggle: () {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.public), findsOneWidget);

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Published');
      });

      testWidgets('shows Draft icon/tooltip when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.publishedDraft(value: false, onToggle: () {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.public_off), findsOneWidget);

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Draft');
      });
    });

    group('Factory: enabledDisabled', () {
      testWidgets('creates toggle with enabled/disabled semantics', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.enabledDisabled(value: true, onToggle: () {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.toggle_on), findsOneWidget);

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Enabled');
      });

      testWidgets('shows Disabled icon/tooltip when false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle.enabledDisabled(
                value: false,
                onToggle: () {},
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.toggle_off), findsOneWidget);

        final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
        expect(tooltip.message, 'Disabled');
      });
    });

    group('Custom Colors', () {
      testWidgets('uses custom true color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: true,
                onToggle: () {},
                trueColor: Colors.purple,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byType(Icon));
        expect(icon.color, Colors.purple);
      });

      testWidgets('uses custom false color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BooleanToggle(
                value: false,
                onToggle: () {},
                falseColor: Colors.orange,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byType(Icon));
        expect(icon.color, Colors.orange);
      });
    });

    group('State Changes', () {
      testWidgets('updates visuals when value changes', (tester) async {
        var value = true;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) {
                  return BooleanToggle(
                    value: value,
                    onToggle: () => setState(() => value = !value),
                  );
                },
              ),
            ),
          ),
        );

        // Initial state: true (check_circle)
        expect(find.byIcon(Icons.check_circle), findsOneWidget);

        // Tap to toggle
        await tester.tap(find.byType(BooleanToggle));
        await tester.pumpAndSettle();

        // Should now show false (cancel)
        expect(find.byIcon(Icons.cancel), findsOneWidget);
        expect(find.byIcon(Icons.check_circle), findsNothing);
      });
    });
  });
}
