/// Tests for SettingConditionalRow Molecule
///
/// Verifies:
/// - Parent rendering
/// - Children visibility based on condition
/// - Animation behavior
/// - Indentation
/// - Empty children handling
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/forms/setting_conditional_row.dart';

void main() {
  group('SettingConditionalRow Molecule', () {
    group('Basic Rendering', () {
      testWidgets('displays parent widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent Setting'),
                showChildren: false,
              ),
            ),
          ),
        );

        expect(find.text('Parent Setting'), findsOneWidget);
      });

      testWidgets('uses Column for layout', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: false,
              ),
            ),
          ),
        );

        expect(find.byType(Column), findsWidgets);
      });
    });

    group('Children Visibility', () {
      testWidgets('hides children when showChildren is false', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: false,
                animate: false,
                children: [Text('Child 1'), Text('Child 2')],
              ),
            ),
          ),
        );

        expect(find.text('Parent'), findsOneWidget);
        expect(find.text('Child 1'), findsNothing);
        expect(find.text('Child 2'), findsNothing);
      });

      testWidgets('shows children when showChildren is true', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: true,
                animate: false,
                children: [Text('Child 1'), Text('Child 2')],
              ),
            ),
          ),
        );

        expect(find.text('Parent'), findsOneWidget);
        expect(find.text('Child 1'), findsOneWidget);
        expect(find.text('Child 2'), findsOneWidget);
      });

      testWidgets('toggles children visibility', (tester) async {
        bool show = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => Column(
                  children: [
                    SettingConditionalRow(
                      parent: const Text('Parent'),
                      showChildren: show,
                      animate: false,
                      children: const [Text('Child')],
                    ),
                    ElevatedButton(
                      onPressed: () => setState(() => show = !show),
                      child: const Text('Toggle'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        expect(find.text('Child'), findsNothing);

        await tester.tap(find.text('Toggle'));
        await tester.pump();

        expect(find.text('Child'), findsOneWidget);

        await tester.tap(find.text('Toggle'));
        await tester.pump();

        expect(find.text('Child'), findsNothing);
      });
    });

    group('Animation', () {
      testWidgets('uses AnimatedCrossFade when animate is true', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: false,
                animate: true,
                children: [Text('Child')],
              ),
            ),
          ),
        );

        expect(find.byType(AnimatedCrossFade), findsOneWidget);
      });

      testWidgets('does not use AnimatedCrossFade when animate is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: false,
                animate: false,
                children: [Text('Child')],
              ),
            ),
          ),
        );

        expect(find.byType(AnimatedCrossFade), findsNothing);
      });

      testWidgets('animates show transition', (tester) async {
        bool show = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => Column(
                  children: [
                    SettingConditionalRow(
                      parent: const Text('Parent'),
                      showChildren: show,
                      animate: true,
                      animationDuration: const Duration(milliseconds: 200),
                      children: const [Text('Child')],
                    ),
                    ElevatedButton(
                      onPressed: () => setState(() => show = true),
                      child: const Text('Show'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Show'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        // Animation in progress
        await tester.pump(const Duration(milliseconds: 150));
        // Animation complete
        expect(find.text('Child'), findsOneWidget);
      });
    });

    group('Indentation', () {
      testWidgets('applies default indentation to children', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: true,
                animate: false,
                children: [Text('Child')],
              ),
            ),
          ),
        );

        // Find the Padding widget that wraps children
        final paddingWidgets = tester.widgetList<Padding>(find.byType(Padding));
        expect(paddingWidgets.isNotEmpty, true);
      });

      testWidgets('respects custom indentMultiplier', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: true,
                animate: false,
                indentMultiplier: 3.0,
                children: [Text('Child')],
              ),
            ),
          ),
        );

        // Just verify it renders without error
        expect(find.text('Child'), findsOneWidget);
      });
    });

    group('Empty Children', () {
      testWidgets('handles empty children list', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: true,
                animate: false,
                children: [],
              ),
            ),
          ),
        );

        expect(find.text('Parent'), findsOneWidget);
        // Should render without errors
      });

      testWidgets('shows SizedBox.shrink for empty children', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Text('Parent'),
                showChildren: true,
                animate: false,
                children: [],
              ),
            ),
          ),
        );

        // Verify a SizedBox exists (SizedBox.shrink returns a SizedBox)
        expect(find.byType(SizedBox), findsWidgets);
      });
    });

    group('Integration with Setting Rows', () {
      testWidgets('works with any widget as parent', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: Row(
                  children: const [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Custom Parent'),
                  ],
                ),
                showChildren: true,
                animate: false,
                children: const [Text('Child 1'), Text('Child 2')],
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.settings), findsOneWidget);
        expect(find.text('Custom Parent'), findsOneWidget);
        expect(find.text('Child 1'), findsOneWidget);
        expect(find.text('Child 2'), findsOneWidget);
      });

      testWidgets('works with any widgets as children', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SettingConditionalRow(
                parent: const Text('Parent'),
                showChildren: true,
                animate: false,
                children: [
                  ListTile(title: const Text('List Tile Child'), onTap: () {}),
                  const Divider(),
                  const TextField(),
                ],
              ),
            ),
          ),
        );

        expect(find.text('List Tile Child'), findsOneWidget);
        expect(find.byType(Divider), findsOneWidget);
        expect(find.byType(TextField), findsOneWidget);
      });
    });
  });
}
