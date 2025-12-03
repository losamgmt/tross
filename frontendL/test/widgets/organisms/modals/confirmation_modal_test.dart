import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/modals/confirmation_modal.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';

/// ConfirmationModal Composition Tests
///
/// Philosophy: Test COMPOSITION ONLY (what atoms/organisms are mounted)
/// NOT implementation (colors, spacing, styling)

void main() {
  group('ConfirmationModal Composition Tests', () {
    testWidgets('mounts GenericModal organism', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test Title',
              message: 'Test message',
            ),
          ),
        ),
      );

      expect(find.byType(GenericModal), findsOneWidget);
    });

    testWidgets('passes title to GenericModal', (tester) async {
      const testTitle = 'Delete User?';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(title: testTitle, message: 'Test message'),
          ),
        ),
      );

      expect(find.text(testTitle), findsOneWidget);
    });

    testWidgets('displays message text', (tester) async {
      const testMessage = 'This action cannot be undone.';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(title: 'Test', message: testMessage),
          ),
        ),
      );

      expect(find.text(testMessage), findsOneWidget);
    });

    testWidgets('displays icon when provided', (tester) async {
      const testIcon = Icons.warning;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              icon: testIcon,
            ),
          ),
        ),
      );

      expect(find.byIcon(testIcon), findsOneWidget);
    });

    testWidgets('does not display icon when not provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(title: 'Test', message: 'Test message'),
          ),
        ),
      );

      // No Icon widget should be found
      expect(find.byType(Icon), findsNothing);
    });

    testWidgets('displays custom confirm text', (tester) async {
      const customConfirmText = 'Delete';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              confirmText: customConfirmText,
            ),
          ),
        ),
      );

      expect(find.text(customConfirmText), findsOneWidget);
    });

    testWidgets('displays custom cancel text', (tester) async {
      const customCancelText = 'Go Back';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              cancelText: customCancelText,
            ),
          ),
        ),
      );

      expect(find.text(customCancelText), findsOneWidget);
    });

    testWidgets('calls onConfirm when confirm button pressed', (tester) async {
      bool confirmCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              confirmText: 'Confirm',
              onConfirm: () => confirmCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(confirmCalled, isTrue);
    });

    testWidgets('calls onCancel when cancel button pressed', (tester) async {
      bool cancelCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              cancelText: 'Cancel',
              onCancel: () => cancelCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(cancelCalled, isTrue);
    });

    testWidgets('displays FilledButton for confirm action', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              confirmText: 'Confirm',
            ),
          ),
        ),
      );

      expect(find.byType(FilledButton), findsOneWidget);
    });

    testWidgets('displays TextButton for cancel action', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationModal(
              title: 'Test',
              message: 'Test message',
              cancelText: 'Cancel',
            ),
          ),
        ),
      );

      expect(find.byType(TextButton), findsOneWidget);
    });

    testWidgets('static show() method returns Future<bool?>', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  ConfirmationModal.show(
                    context: context,
                    title: 'Test',
                    message: 'Test message',
                  );
                },
                child: const Text('Show Modal'),
              );
            },
          ),
        ),
      );

      await tester.tap(find.text('Show Modal'));
      await tester.pumpAndSettle();

      expect(find.byType(ConfirmationModal), findsOneWidget);
    });
  });
}
