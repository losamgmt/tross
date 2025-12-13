/// PageScaffold Molecule Tests
///
/// Tests for single-atom Scaffold wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('PageScaffold Molecule Tests', () {
    testWidgets('renders basic scaffold structure', (tester) async {
      await pumpTestWidget(
        tester,
        const PageScaffold(body: Text('Page Content')),
      );

      expect(find.byType(PageScaffold), findsOneWidget);
      expect(find.text('Page Content'), findsOneWidget);
    });

    testWidgets('renders with app bar', (tester) async {
      await pumpTestWidget(
        tester,
        const PageScaffold(appBar: _TestAppBar(), body: Text('Content')),
      );

      expect(find.byType(AppBar), findsOneWidget);
      expect(find.text('Test Title'), findsOneWidget);
    });

    testWidgets('simple variant omits optional features', (tester) async {
      await pumpTestWidget(
        tester,
        const PageScaffold.simple(body: Text('Simple')),
      );

      final scaffold = tester.widget<Scaffold>(
        find
            .descendant(
              of: find.byType(PageScaffold),
              matching: find.byType(Scaffold),
            )
            .first,
      );
      expect(scaffold.floatingActionButton, null);
      expect(scaffold.bottomNavigationBar, null);
      expect(scaffold.drawer, null);
    });

    testWidgets('respects background color', (tester) async {
      await pumpTestWidget(
        tester,
        const PageScaffold(backgroundColor: Colors.blue, body: Text('Colored')),
      );

      final scaffold = tester.widget<Scaffold>(
        find
            .descendant(
              of: find.byType(PageScaffold),
              matching: find.byType(Scaffold),
            )
            .first,
      );
      expect(scaffold.backgroundColor, Colors.blue);
    });

    testWidgets('supports floating action button', (tester) async {
      await pumpTestWidget(
        tester,
        PageScaffold(
          body: const Text('Content'),
          floatingActionButton: FloatingActionButton(
            onPressed: () {},
            child: const Icon(Icons.add),
          ),
        ),
      );

      expect(find.byType(FloatingActionButton), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
    });

    testWidgets('supports bottom navigation', (tester) async {
      await pumpTestWidget(
        tester,
        PageScaffold(
          body: const Text('Content'),
          bottomNavigationBar: BottomNavigationBar(
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(
                icon: Icon(Icons.settings),
                label: 'Settings',
              ),
            ],
          ),
        ),
      );

      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(tester, const PageScaffold(body: Text('Test')));

      // Should find the PageScaffold wrapper
      expect(find.byType(PageScaffold), findsOneWidget);

      // Should find Scaffold within PageScaffold (the wrapped primitive)
      expect(
        find.descendant(
          of: find.byType(PageScaffold),
          matching: find.byType(Scaffold),
        ),
        findsOneWidget,
      );
    });
  });
}

/// Test AppBar for testing purposes
class _TestAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _TestAppBar();

  @override
  Widget build(BuildContext context) {
    return AppBar(title: const Text('Test Title'));
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
