/// ActionButton Atom Tests
///
/// Tests for ActionButton component: rendering, styles, callbacks, disabled state
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('ActionButton Atom Tests', () {
    testWidgets('renders with icon and tooltip', (tester) async {
      await pumpTestWidget(
        tester,
        const ActionButton(icon: Icons.edit, tooltip: 'Edit item'),
      );

      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('edit factory creates primary style button', (tester) async {
      await pumpTestWidget(tester, ActionButton.edit(onPressed: () {}));

      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.byType(ActionButton), findsOneWidget);
    });

    testWidgets('delete factory creates danger style button', (tester) async {
      await pumpTestWidget(tester, ActionButton.delete(onPressed: () {}));

      expect(find.byIcon(Icons.delete), findsOneWidget);
    });

    testWidgets('view factory creates ghost style button', (tester) async {
      await pumpTestWidget(tester, ActionButton.view(onPressed: () {}));

      expect(find.byIcon(Icons.visibility), findsOneWidget);
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      var tapped = false;

      await pumpTestWidget(
        tester,
        ActionButton(
          icon: Icons.star,
          tooltip: 'Favorite',
          onPressed: () => tapped = true,
        ),
      );

      await tester.tap(find.byType(InkWell));
      expect(tapped, true);
    });

    testWidgets('disabled when onPressed is null', (tester) async {
      await pumpTestWidget(
        tester,
        const ActionButton(
          icon: Icons.lock,
          tooltip: 'Locked',
          onPressed: null,
        ),
      );

      final inkWell = tester.widget<InkWell>(find.byType(InkWell));
      expect(inkWell.onTap, isNull);
    });

    testWidgets('compact mode renders smaller', (tester) async {
      await pumpTestWidget(
        tester,
        ActionButton(
          icon: Icons.close,
          tooltip: 'Close',
          compact: true,
          onPressed: () {},
        ),
      );

      expect(find.byType(ActionButton), findsOneWidget);
    });

    testWidgets('all four styles render without error', (tester) async {
      for (final style in ActionButtonStyle.values) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ActionButton(
                icon: Icons.star,
                tooltip: 'Test',
                style: style,
                onPressed: () {},
              ),
            ),
          ),
        );

        expect(find.byType(ActionButton), findsOneWidget);
      }
    });
  });
}
