import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';

/// Tests for GenericModal - COMPOSITION TESTING ONLY
///
/// Philosophy:
/// - Test that widgets are MOUNTED (composition)
/// - Test that props are PASSED (data flow)
/// - DO NOT test implementation details
void main() {
  group('GenericModal - Composition Tests', () {
    testWidgets('composes Dialog with content', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(content: const Text('Test Content')),
          ),
        ),
      );

      // Verify composition
      expect(find.byType(Dialog), findsOneWidget);
      expect(find.text('Test Content'), findsOneWidget);
    });

    testWidgets('mounts title when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              title: 'Test Title',
              content: const Text('Content'),
            ),
          ),
        ),
      );

      // Verify title is mounted
      expect(find.text('Test Title'), findsOneWidget);
    });

    testWidgets('mounts close button by default', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(title: 'Test', content: const Text('Content')),
          ),
        ),
      );

      // Verify close button mounted
      expect(find.byIcon(Icons.close), findsOneWidget);
    });

    testWidgets('does not mount close button when showCloseButton=false', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              title: 'Test',
              content: const Text('Content'),
              showCloseButton: false,
            ),
          ),
        ),
      );

      // Verify close button NOT mounted
      expect(find.byIcon(Icons.close), findsNothing);
    });

    testWidgets('mounts Divider when header present', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(title: 'Test', content: const Text('Content')),
          ),
        ),
      );

      // Verify divider mounted
      expect(find.byType(Divider), findsAtLeastNWidgets(1));
    });

    testWidgets('composes content with Scrollbar', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(content: const Text('Scrollable Content')),
          ),
        ),
      );

      // Verify Scrollbar mounted
      expect(find.byType(Scrollbar), findsOneWidget);
      expect(find.text('Scrollable Content'), findsOneWidget);
    });

    testWidgets('mounts action Row when actions provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              content: const Text('Content'),
              actions: [
                TextButton(onPressed: () {}, child: const Text('Cancel')),
                FilledButton(onPressed: () {}, child: const Text('Save')),
              ],
            ),
          ),
        ),
      );

      // Verify actions are rendered
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Save'), findsOneWidget);
    });

    testWidgets('does not mount actions when no actions', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: GenericModal(content: const Text('Content'))),
        ),
      );

      // Verify action buttons NOT mounted
      expect(find.byType(TextButton), findsNothing);
      expect(find.byType(FilledButton), findsNothing);
    });

    testWidgets('mounts Divider before actions', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              content: const Text('Content'),
              actions: [TextButton(onPressed: () {}, child: const Text('OK'))],
            ),
          ),
        ),
      );

      // Verify divider mounted (should find at least one for actions)
      expect(find.byType(Divider), findsAtLeastNWidgets(1));
    });

    testWidgets('calls onClose when close button tapped', (tester) async {
      bool closeCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              title: 'Test',
              content: const Text('Content'),
              onClose: () => closeCalled = true,
            ),
          ),
        ),
      );

      // Tap close button
      await tester.tap(find.byIcon(Icons.close));
      await tester.pump(
        const Duration(milliseconds: 300),
      ); // Modal close animation

      // Verify callback called (data flow)
      expect(closeCalled, isTrue);
    });

    testWidgets('show() static method mounts modal', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    GenericModal.show(
                      context: context,
                      title: 'Static Modal',
                      content: const Text('Static Content'),
                    );
                  },
                  child: const Text('Show Modal'),
                );
              },
            ),
          ),
        ),
      );

      // Show modal
      await tester.tap(find.text('Show Modal'));
      await tester.pump(); // Start animation
      await tester.pump(const Duration(milliseconds: 300)); // Complete fade-in

      // Verify modal mounted
      expect(find.text('Static Modal'), findsOneWidget);
      expect(find.text('Static Content'), findsOneWidget);
    });

    testWidgets('show() returns value on pop', (tester) async {
      String? result;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () async {
                    result = await GenericModal.show<String>(
                      context: context,
                      title: 'Test',
                      content: const Text('Content'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop('success'),
                          child: const Text('OK'),
                        ),
                      ],
                    );
                  },
                  child: const Text('Show Modal'),
                );
              },
            ),
          ),
        ),
      );

      // Show modal and tap OK
      await tester.tap(find.text('Show Modal'));
      await tester.pump(); // Start animation
      await tester.pump(const Duration(milliseconds: 300)); // Complete fade-in
      await tester.tap(find.text('OK'));
      await tester.pump(
        const Duration(milliseconds: 300),
      ); // Modal close animation

      // Verify return value (data flow)
      expect(result, equals('success'));
    });

    testWidgets('mounts header without title but with close button', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              content: const Text('Content'),
              showCloseButton: true,
            ),
          ),
        ),
      );

      // Header mounted (close button present)
      expect(find.byIcon(Icons.close), findsOneWidget);
      expect(find.byType(Divider), findsAtLeastNWidgets(1));
    });

    testWidgets('does not mount header when no title and no close button', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GenericModal(
              content: const Text('Content'),
              showCloseButton: false,
            ),
          ),
        ),
      );

      // No header components mounted
      expect(find.byIcon(Icons.close), findsNothing);
      // Still has Scrollbar for content
      expect(find.byType(Scrollbar), findsOneWidget);
    });
  });
}
