/// ErrorCard Widget Tests
///
/// Factory-driven tests for the ErrorCard molecule component.
/// Covers all factory constructors, variants, and render scenarios.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/cards/error_card.dart';
import 'package:tross_app/widgets/molecules/buttons/button_group.dart';

import '../../../helpers/helpers.dart';

void main() {
  setUpAll(() {
    initializeTestBinding();
  });

  group('ErrorCard', () {
    group('Default Constructor', () {
      testWidgets('renders with required props only', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Test Error',
                message: 'Something went wrong',
              ),
            ),
          ),
        );

        expect(find.text('Test Error'), findsOneWidget);
        expect(find.text('Something went wrong'), findsOneWidget);
        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('renders with custom icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Error',
                message: 'Details',
                icon: Icons.warning_amber,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.warning_amber), findsOneWidget);
      });

      testWidgets('renders with custom icon color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Error',
                message: 'Details',
                icon: Icons.error,
                iconColor: Colors.orange,
              ),
            ),
          ),
        );

        final iconWidget = tester.widget<Icon>(find.byIcon(Icons.error));
        expect(iconWidget.color, Colors.orange);
      });

      testWidgets('renders with buttons', (tester) async {
        var buttonPressed = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Error',
                message: 'Details',
                buttons: [
                  ButtonConfig(
                    label: 'Retry',
                    onPressed: () => buttonPressed = true,
                    isPrimary: true,
                  ),
                ],
              ),
            ),
          ),
        );

        expect(find.text('Retry'), findsOneWidget);
        expect(find.byType(ButtonGroup), findsOneWidget);

        await tester.tap(find.text('Retry'));
        await tester.pump();

        expect(buttonPressed, isTrue);
      });

      testWidgets('renders with custom padding', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Error',
                message: 'Details',
                padding: const EdgeInsets.all(32),
              ),
            ),
          ),
        );

        expect(find.byType(ErrorCard), findsOneWidget);
      });

      testWidgets('message is selectable', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Error',
                message: 'This message should be selectable',
              ),
            ),
          ),
        );

        expect(find.byType(SelectableText), findsOneWidget);
      });
    });

    group('Compact Factory', () {
      testWidgets('renders compact variant', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: ErrorCard.compact(message: 'Quick error')),
          ),
        );

        expect(find.text('Quick error'), findsOneWidget);
        expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      });

      testWidgets('compact with retry button', (tester) async {
        var retryCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard.compact(
                message: 'Failed',
                onRetry: () => retryCalled = true,
              ),
            ),
          ),
        );

        expect(find.text('Retry'), findsOneWidget);

        await tester.tap(find.text('Retry'));
        await tester.pump();

        expect(retryCalled, isTrue);
      });

      testWidgets('compact without retry button', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: ErrorCard.compact(message: 'No action')),
          ),
        );

        expect(find.text('Retry'), findsNothing);
      });
    });

    group('Network Factory', () {
      testWidgets('renders network error card', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: ErrorCard.network(onRetry: () {})),
          ),
        );

        expect(find.text('Connection Error'), findsOneWidget);
        expect(
          find.text(
            'Unable to connect to server. Please check your internet connection.',
          ),
          findsOneWidget,
        );
        expect(find.byIcon(Icons.cloud_off_rounded), findsOneWidget);
      });

      testWidgets('network card with custom title and message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard.network(
                title: 'Server Unreachable',
                message: 'Custom network error',
                onRetry: () {},
              ),
            ),
          ),
        );

        expect(find.text('Server Unreachable'), findsOneWidget);
        expect(find.text('Custom network error'), findsOneWidget);
      });

      testWidgets('network card retry works', (tester) async {
        var retryCount = 0;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard.network(onRetry: () => retryCount++),
            ),
          ),
        );

        await tester.tap(find.text('Retry'));
        await tester.pump();

        expect(retryCount, 1);
      });
    });

    group('LoadFailed Factory', () {
      testWidgets('renders load failed card', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard.loadFailed(
                resourceName: 'Users',
                error: 'Timeout after 30 seconds',
                onRetry: () {},
              ),
            ),
          ),
        );

        expect(find.text('Failed to Load Users'), findsOneWidget);
        expect(find.text('Timeout after 30 seconds'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
      });

      testWidgets('load failed retry button works', (tester) async {
        var retryCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard.loadFailed(
                resourceName: 'Data',
                error: 'Error',
                onRetry: () => retryCalled = true,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Retry'));
        await tester.pump();

        expect(retryCalled, isTrue);
      });
    });

    group('Theme Integration', () {
      testWidgets('renders in dark theme', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData.dark(),
            home: Scaffold(
              body: ErrorCard(
                title: 'Dark Theme Error',
                message: 'Testing dark mode',
              ),
            ),
          ),
        );

        expect(find.text('Dark Theme Error'), findsOneWidget);
      });

      testWidgets('renders in light theme', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData.light(),
            home: Scaffold(
              body: ErrorCard(
                title: 'Light Theme Error',
                message: 'Testing light mode',
              ),
            ),
          ),
        );

        expect(find.text('Light Theme Error'), findsOneWidget);
      });
    });

    group('Multiple Buttons', () {
      testWidgets('renders multiple action buttons', (tester) async {
        var primaryPressed = false;
        var secondaryPressed = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ErrorCard(
                title: 'Multi-action Error',
                message: 'Choose an action',
                buttons: [
                  ButtonConfig(
                    label: 'Retry',
                    onPressed: () => primaryPressed = true,
                    isPrimary: true,
                  ),
                  ButtonConfig(
                    label: 'Cancel',
                    onPressed: () => secondaryPressed = true,
                    isPrimary: false,
                  ),
                ],
              ),
            ),
          ),
        );

        expect(find.text('Retry'), findsOneWidget);
        expect(find.text('Cancel'), findsOneWidget);

        await tester.tap(find.text('Cancel'));
        await tester.pump();
        expect(secondaryPressed, isTrue);
        expect(primaryPressed, isFalse); // Primary not tapped yet
      });
    });
  });
}
