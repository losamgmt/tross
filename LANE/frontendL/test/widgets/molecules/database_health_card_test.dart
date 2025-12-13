/// DatabaseHealthCard Molecule Tests
///
/// Tests for database health card component covering:
/// - Basic rendering
/// - Status states (healthy, degraded, critical, unknown)
/// - Metrics display (response time, connections)
/// - Error messages
/// - Time formatting
/// - Visual styling
/// - Edge cases
/// - Accessibility
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/database_health.dart';
import 'package:tross_app/widgets/molecules/cards/database_health_card.dart';
import 'package:tross_app/widgets/atoms/indicators/connection_status_badge.dart';
import 'package:tross_app/config/app_colors.dart';

void main() {
  group('DatabaseHealthCard Molecule', () {
    // Test helper: Create card with default values
    DatabaseHealthCard createCard({
      String databaseName = 'Test Database',
      HealthStatus status = HealthStatus.healthy,
      Duration responseTime = const Duration(milliseconds: 50),
      int connectionCount = 10,
      DateTime? lastChecked,
      String? errorMessage,
      bool showDetails = true,
    }) {
      return DatabaseHealthCard(
        databaseName: databaseName,
        status: status,
        responseTime: responseTime,
        connectionCount: connectionCount,
        lastChecked: lastChecked ?? DateTime.now(),
        errorMessage: errorMessage,
        showDetails: showDetails,
      );
    }

    // Test helper: Wrap widget in MaterialApp for testing
    Widget wrapWidget(Widget widget) {
      return MaterialApp(home: Scaffold(body: widget));
    }

    group('Basic Rendering', () {
      testWidgets('renders with required properties', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Test Database'), findsOneWidget);
        expect(find.byType(ConnectionStatusBadge), findsOneWidget);
        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('renders database name correctly', (tester) async {
        final card = createCard(databaseName: 'Users Database');

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Users Database'), findsOneWidget);
      });

      testWidgets('renders status badge', (tester) async {
        final card = createCard(status: HealthStatus.healthy);

        await tester.pumpWidget(wrapWidget(card));

        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.healthy));
        expect(badge.showLabel, isFalse); // Badge should be compact
      });
    });

    group('Status States', () {
      testWidgets('displays healthy status correctly', (tester) async {
        final card = createCard(status: HealthStatus.healthy);

        await tester.pumpWidget(wrapWidget(card));

        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.healthy));
      });

      testWidgets('displays degraded status correctly', (tester) async {
        final card = createCard(status: HealthStatus.degraded);

        await tester.pumpWidget(wrapWidget(card));

        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.degraded));
      });

      testWidgets('displays critical status correctly', (tester) async {
        final card = createCard(status: HealthStatus.critical);

        await tester.pumpWidget(wrapWidget(card));

        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.critical));
      });

      testWidgets('displays unknown status correctly', (tester) async {
        final card = createCard(status: HealthStatus.unknown);

        await tester.pumpWidget(wrapWidget(card));

        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.unknown));
      });
    });

    group('Metrics Display', () {
      testWidgets('displays response time in milliseconds', (tester) async {
        final card = createCard(responseTime: const Duration(milliseconds: 45));

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('45ms'), findsOneWidget);
        expect(find.text('Response Time'), findsOneWidget);
      });

      testWidgets('displays response time in seconds for > 1000ms', (
        tester,
      ) async {
        final card = createCard(
          responseTime: const Duration(milliseconds: 1500),
        );

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('1.5s'), findsOneWidget);
      });

      testWidgets('displays connection count', (tester) async {
        final card = createCard(connectionCount: 25);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('25'), findsOneWidget);
        expect(find.text('Connections'), findsOneWidget);
      });

      testWidgets('response time shows green color for fast (<100ms)', (
        tester,
      ) async {
        final card = createCard(responseTime: const Duration(milliseconds: 50));

        await tester.pumpWidget(wrapWidget(card));

        // Find the text widget showing "50ms"
        final textWidget = tester.widget<Text>(find.text('50ms'));
        expect(textWidget.style?.color, equals(AppColors.success));
      });

      testWidgets('response time shows amber color for medium (100-500ms)', (
        tester,
      ) async {
        final card = createCard(
          responseTime: const Duration(milliseconds: 250),
        );

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(find.text('250ms'));
        expect(textWidget.style?.color, equals(AppColors.warning));
      });

      testWidgets('response time shows red color for slow (>500ms)', (
        tester,
      ) async {
        final card = createCard(
          responseTime: const Duration(milliseconds: 750),
        );

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(find.text('750ms'));
        expect(textWidget.style?.color, equals(AppColors.error));
      });

      testWidgets('hides metrics when showDetails is false', (tester) async {
        final card = createCard(
          responseTime: const Duration(milliseconds: 50),
          connectionCount: 10,
          showDetails: false,
        );

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Response Time'), findsNothing);
        expect(find.text('Connections'), findsNothing);
        expect(find.text('50ms'), findsNothing);
        expect(find.text('10'), findsNothing);
      });
    });

    group('Error Messages', () {
      testWidgets('displays error message when provided', (tester) async {
        final card = createCard(
          status: HealthStatus.critical,
          errorMessage: 'Connection timeout',
        );

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Connection timeout'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
      });

      testWidgets('error message has red styling', (tester) async {
        final card = createCard(errorMessage: 'Database unreachable');

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(
          find.text('Database unreachable'),
        );
        expect(textWidget.style?.color, equals(AppColors.error));
      });

      testWidgets('does not display error section when no error', (
        tester,
      ) async {
        final card = createCard(errorMessage: null);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.byIcon(Icons.error_outline), findsNothing);
      });

      testWidgets('error message truncates if too long', (tester) async {
        final card = createCard(
          errorMessage:
              'This is a very long error message that should be truncated after two lines of text to prevent it from taking up too much space in the card',
        );

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(
          find.text(
            'This is a very long error message that should be truncated after two lines of text to prevent it from taking up too much space in the card',
          ),
        );
        expect(textWidget.maxLines, equals(2));
        expect(textWidget.overflow, equals(TextOverflow.ellipsis));
      });
    });

    group('Time Formatting', () {
      testWidgets('formats last checked time in seconds', (tester) async {
        final lastChecked = DateTime.now().subtract(
          const Duration(seconds: 30),
        );
        final card = createCard(lastChecked: lastChecked);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.textContaining('30s ago'), findsOneWidget);
      });

      testWidgets('formats last checked time in minutes', (tester) async {
        final lastChecked = DateTime.now().subtract(const Duration(minutes: 5));
        final card = createCard(lastChecked: lastChecked);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.textContaining('5m ago'), findsOneWidget);
      });

      testWidgets('formats last checked time in hours', (tester) async {
        final lastChecked = DateTime.now().subtract(const Duration(hours: 3));
        final card = createCard(lastChecked: lastChecked);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.textContaining('3h ago'), findsOneWidget);
      });

      testWidgets('formats last checked time in days', (tester) async {
        final lastChecked = DateTime.now().subtract(const Duration(days: 2));
        final card = createCard(lastChecked: lastChecked);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.textContaining('2d ago'), findsOneWidget);
      });

      testWidgets('displays last checked icon', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        expect(find.byIcon(Icons.schedule), findsOneWidget);
      });
    });

    group('Visual Styling', () {
      testWidgets('renders without errors', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        // Test behavior: card renders successfully with all required content
        expect(find.byType(DatabaseHealthCard), findsOneWidget);
        expect(find.text('Test Database'), findsOneWidget);
        expect(find.byType(ConnectionStatusBadge), findsOneWidget);
      });

      testWidgets('has proper padding', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        // Card should be wrapped in Padding
        expect(find.byType(Padding), findsWidgets);
      });

      testWidgets('database name is styled as title', (tester) async {
        final card = createCard(databaseName: 'Production DB');

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(find.text('Production DB'));
        expect(textWidget.style?.fontWeight, equals(FontWeight.w600));
      });

      testWidgets('metrics have proper icon and label', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        expect(find.byIcon(Icons.timer_outlined), findsOneWidget);
        expect(find.byIcon(Icons.link), findsOneWidget);
      });
    });

    group('Edge Cases', () {
      testWidgets('handles zero response time', (tester) async {
        final card = createCard(responseTime: const Duration(milliseconds: 0));

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('0ms'), findsOneWidget);
      });

      testWidgets('handles zero connections', (tester) async {
        final card = createCard(connectionCount: 0);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('0'), findsOneWidget);
      });

      testWidgets('handles very high connection count', (tester) async {
        final card = createCard(connectionCount: 9999);

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('9999'), findsOneWidget);
      });

      testWidgets('handles very long database name', (tester) async {
        final card = createCard(
          databaseName:
              'This Is A Very Long Database Name That Should Be Truncated',
        );

        await tester.pumpWidget(wrapWidget(card));

        final textWidget = tester.widget<Text>(
          find.text(
            'This Is A Very Long Database Name That Should Be Truncated',
          ),
        );
        expect(textWidget.overflow, equals(TextOverflow.ellipsis));
      });

      testWidgets('handles very recent last checked time', (tester) async {
        final lastChecked = DateTime.now().subtract(const Duration(seconds: 1));
        final card = createCard(lastChecked: lastChecked);

        await tester.pumpWidget(wrapWidget(card));

        // Should show "1s ago" or similar
        expect(find.textContaining('ago'), findsOneWidget);
      });

      testWidgets('handles exactly 1 second response time', (tester) async {
        final card = createCard(
          responseTime: const Duration(milliseconds: 1000),
        );

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('1.0s'), findsOneWidget);
      });
    });

    group('Accessibility', () {
      testWidgets('database name is accessible', (tester) async {
        final card = createCard(databaseName: 'Users Database');

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Users Database'), findsOneWidget);
      });

      testWidgets('metrics labels are descriptive', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Response Time'), findsOneWidget);
        expect(find.text('Connections'), findsOneWidget);
      });

      testWidgets('last checked has descriptive text', (tester) async {
        final card = createCard();

        await tester.pumpWidget(wrapWidget(card));

        expect(find.textContaining('Last checked:'), findsOneWidget);
      });

      testWidgets('error message is accessible when present', (tester) async {
        final card = createCard(errorMessage: 'Database connection failed');

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Database connection failed'), findsOneWidget);
      });
    });

    group('Integration', () {
      testWidgets('card displays all components together', (tester) async {
        final card = createCard(
          databaseName: 'Production Users',
          status: HealthStatus.healthy,
          responseTime: const Duration(milliseconds: 75),
          connectionCount: 15,
          errorMessage: null,
          showDetails: true,
        );

        await tester.pumpWidget(wrapWidget(card));

        // Header
        expect(find.text('Production Users'), findsOneWidget);
        expect(find.byType(ConnectionStatusBadge), findsOneWidget);

        // Metrics
        expect(find.text('Response Time'), findsOneWidget);
        expect(find.text('75ms'), findsOneWidget);
        expect(find.text('Connections'), findsOneWidget);
        expect(find.text('15'), findsOneWidget);

        // Footer
        expect(find.textContaining('Last checked:'), findsOneWidget);
      });

      testWidgets('card with error displays all error components', (
        tester,
      ) async {
        final card = createCard(
          status: HealthStatus.critical,
          errorMessage: 'Connection timeout after 30s',
        );

        await tester.pumpWidget(wrapWidget(card));

        expect(find.text('Connection timeout after 30s'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
        final badge = tester.widget<ConnectionStatusBadge>(
          find.byType(ConnectionStatusBadge),
        );
        expect(badge.status, equals(HealthStatus.critical));
      });
    });
  });
}
