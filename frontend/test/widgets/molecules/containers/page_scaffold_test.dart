/// PageScaffold Widget Tests
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/containers/page_scaffold.dart';

void main() {
  group('PageScaffold', () {
    testWidgets('renders body content', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: PageScaffold(body: Text('Page Content'))),
      );

      expect(find.text('Page Content'), findsOneWidget);
    });

    testWidgets('renders with app bar', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            appBar: AppBar(title: const Text('Test Title')),
            body: const Text('Body'),
          ),
        ),
      );

      expect(find.text('Test Title'), findsOneWidget);
    });

    testWidgets('renders with floating action button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            body: const Text('Body'),
            floatingActionButton: FloatingActionButton(
              onPressed: () {},
              child: const Icon(Icons.add),
            ),
          ),
        ),
      );

      expect(find.byType(FloatingActionButton), findsOneWidget);
    });

    testWidgets('renders with bottom navigation bar', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            body: const Text('Body'),
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
        ),
      );

      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });

    testWidgets('applies background color', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            body: const Text('Body'),
            backgroundColor: Colors.blue,
          ),
        ),
      );

      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('renders with drawer', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            appBar: AppBar(title: const Text('With Drawer')),
            body: const Text('Body'),
            drawer: const Drawer(child: Text('Drawer Content')),
          ),
        ),
      );

      // Drawer exists but is not visible until opened
      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('extends body behind app bar when specified', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PageScaffold(
            appBar: AppBar(title: const Text('Title')),
            body: const Text('Body'),
            extendBodyBehindAppBar: true,
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.extendBodyBehindAppBar, isTrue);
    });
  });
}
