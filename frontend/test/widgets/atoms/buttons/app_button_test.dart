/// AppButton Atom Tests
///
/// Tests for AppButton component: rendering, styles, callbacks, disabled state
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('AppButton Atom Tests', () {
    testWidgets('renders with icon and tooltip', (tester) async {
      await pumpTestWidget(
        tester,
        const AppButton(icon: Icons.edit, tooltip: 'Edit item'),
      );

      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('icon-only button renders correctly', (tester) async {
      await pumpTestWidget(
        tester,
        AppButton(
          icon: Icons.edit,
          tooltip: 'Edit',
          style: AppButtonStyle.secondary,
          onPressed: () {},
        ),
      );

      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.byType(AppButton), findsOneWidget);
    });

    testWidgets('labeled button renders icon and label', (tester) async {
      await pumpTestWidget(
        tester,
        AppButton(
          icon: Icons.home,
          label: 'Home',
          tooltip: 'Go home',
          style: AppButtonStyle.ghost,
          onPressed: () {},
        ),
      );

      expect(find.byIcon(Icons.home), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
    });

    testWidgets('danger style button renders correctly', (tester) async {
      await pumpTestWidget(
        tester,
        AppButton(
          icon: Icons.delete,
          tooltip: 'Delete',
          style: AppButtonStyle.danger,
          onPressed: () {},
        ),
      );

      expect(find.byIcon(Icons.delete), findsOneWidget);
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      var tapped = false;

      await pumpTestWidget(
        tester,
        AppButton(
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
        const AppButton(icon: Icons.lock, tooltip: 'Locked', onPressed: null),
      );

      final inkWell = tester.widget<InkWell>(find.byType(InkWell));
      expect(inkWell.onTap, isNull);
    });

    testWidgets('compact mode renders smaller', (tester) async {
      await pumpTestWidget(
        tester,
        AppButton(
          icon: Icons.close,
          tooltip: 'Close',
          compact: true,
          onPressed: () {},
        ),
      );

      expect(find.byType(AppButton), findsOneWidget);
    });

    testWidgets('all four styles render without error', (tester) async {
      for (final style in AppButtonStyle.values) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: AppButton(
                icon: Icons.star,
                tooltip: 'Test',
                style: style,
                onPressed: () {},
              ),
            ),
          ),
        );

        expect(find.byType(AppButton), findsOneWidget);
      }
    });
  });
}
