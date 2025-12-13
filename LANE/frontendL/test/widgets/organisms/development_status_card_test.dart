import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/development_status_card.dart';
import '../../helpers/helpers.dart';

/// Tests for DevelopmentStatusCard Widget
///
/// Focused tests for widget structure, states, and token handling
void main() {
  group('DevelopmentStatusCard', () {
    setUp(() {
      initializeTestBinding();
    });

    Widget createTestWidget({String? authToken}) {
      return MaterialApp(
        home: Scaffold(body: DevelopmentStatusCard(authToken: authToken)),
      );
    }

    group('Widget Structure', () {
      testWidgets('renders Card widget', (WidgetTester tester) async {
        await tester.pumpWidget(createTestWidget());
        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('has "Environment Status" title', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();
        expect(find.text('Environment Status'), findsOneWidget);
      });

      testWidgets('displays info icon', (WidgetTester tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();
        expect(find.byIcon(Icons.info_outline), findsOneWidget);
      });
    });

    group('Error State - No Auth Token', () {
      testWidgets('shows error when authToken is null', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget(authToken: null));
        await tester.pumpAndSettle();

        expect(
          find.textContaining('Unable to load environment data'),
          findsOneWidget,
        );
      });

      testWidgets('does not show loading indicator in error state', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget(authToken: null));
        await tester.pumpAndSettle();

        expect(find.byType(CircularProgressIndicator), findsNothing);
      });
    });

    group('Loading State', () {
      testWidgets('initially renders without error', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget(authToken: 'test-token'));
        await tester.pump();

        // Widget should render without throwing
        expect(find.byType(DevelopmentStatusCard), findsOneWidget);
      });

      testWidgets('settles after async load attempt', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget(authToken: 'test-token'));

        // Should complete without hanging
        await tester.pumpAndSettle();
        expect(find.byType(DevelopmentStatusCard), findsOneWidget);
      });
    });

    group('Success State', () {
      testWidgets('displays environment info after loading', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(createTestWidget(authToken: 'test-token'));
        await tester.pumpAndSettle();

        expect(find.textContaining('Backend'), findsOneWidget);
        expect(find.textContaining('Auth Mode'), findsOneWidget);
      });

      testWidgets('hides loading after success', (WidgetTester tester) async {
        await tester.pumpWidget(createTestWidget(authToken: 'test-token'));
        await tester.pumpAndSettle();

        expect(find.text('Loading environment data...'), findsNothing);
      });
    });

    group('Widget Properties', () {
      testWidgets('is StatefulWidget', (WidgetTester tester) async {
        await tester.pumpWidget(createTestWidget());

        final widget = tester.widget(find.byType(DevelopmentStatusCard));
        expect(widget, isA<StatefulWidget>());
      });

      testWidgets('accepts authToken parameter', (WidgetTester tester) async {
        await tester.pumpWidget(createTestWidget(authToken: 'my-token'));

        final widget = tester.widget<DevelopmentStatusCard>(
          find.byType(DevelopmentStatusCard),
        );
        expect(widget.authToken, equals('my-token'));
      });
    });
  });
}
