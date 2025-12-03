import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/notification_service.dart';

void main() {
  group('NotificationService', () {
    testWidgets('showSuccess displays success SnackBar', (tester) async {
      const message = 'Operation completed successfully';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showSuccess(context, message);
                  },
                  child: const Text('Show Success'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Success'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);

      final snackBar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(snackBar.backgroundColor, Colors.green);
    });

    testWidgets('showError displays error SnackBar', (tester) async {
      const message = 'An error occurred';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showError(context, message);
                  },
                  child: const Text('Show Error'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Error'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);

      final snackBar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(snackBar.backgroundColor, Colors.red);
    });

    testWidgets('showInfo displays info SnackBar', (tester) async {
      const message = 'Information message';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showInfo(context, message);
                  },
                  child: const Text('Show Info'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Info'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);
    });

    testWidgets('showErrorWithAction displays error with action button', (
      tester,
    ) async {
      const message = 'Error with action';
      const actionLabel = 'Retry';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showErrorWithAction(
                      context,
                      message,
                      actionLabel: actionLabel,
                      onAction: () {
                        // Action callback - interaction tested in integration tests
                      },
                    );
                  },
                  child: const Text('Show Error with Action'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Error with Action'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);
      expect(find.text(actionLabel), findsOneWidget);

      final snackBar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(snackBar.backgroundColor, Colors.red);
      expect(snackBar.action, isNotNull);

      // NOTE: SnackBar action button callback tested by verifying action exists
      // The interaction itself is tested in integration/E2E tests
    });

    testWidgets('multiple notifications queue correctly', (tester) async {
      const message1 = 'First notification';
      const message2 = 'Second notification';
      const message3 = 'Third notification';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showInfo(context, message1);
                    NotificationService.showSuccess(context, message2);
                    NotificationService.showError(context, message3);
                  },
                  child: const Text('Show Multiple'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Multiple'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Should show first message
      expect(find.text(message1), findsOneWidget);

      // Other messages are queued
      expect(find.text(message2), findsNothing);
      expect(find.text(message3), findsNothing);
    });

    testWidgets('notification respects theme', (tester) async {
      const message = 'Themed notification';
      final customTheme = ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.purple,
          brightness: Brightness.dark,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: customTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    NotificationService.showInfo(context, message);
                  },
                  child: const Text('Show'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);

      // InfoSnackBar uses theme colors (doesn't override backgroundColor)
      final snackBar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(snackBar.behavior, SnackBarBehavior.floating);
      expect(snackBar.duration, const Duration(seconds: 3));
    });
  });
}
