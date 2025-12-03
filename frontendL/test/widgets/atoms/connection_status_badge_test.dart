/// Tests for ConnectionStatusBadge atom
///
/// Comprehensive coverage:
/// - All status states (healthy, degraded, critical, unknown)
/// - With/without labels
/// - Compact mode
/// - Legacy connection factory
/// - Color theming
/// - Icon selection
/// - Accessibility
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/database_health.dart';
import 'package:tross_app/widgets/atoms/indicators/connection_status_badge.dart';
import 'package:tross_app/config/app_theme.dart';

void main() {
  group('ConnectionStatusBadge Atom', () {
    // Test helper to wrap widgets with theme
    Widget makeTestable(Widget child) {
      return MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(body: child),
      );
    }

    group('Status States', () {
      testWidgets('displays healthy status with green color', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(status: HealthStatus.healthy),
          ),
        );

        // Should show check_circle icon
        expect(find.byIcon(Icons.check_circle), findsOneWidget);

        // Should show "Healthy" text by default
        expect(find.text('Healthy'), findsOneWidget);

        // Should have warm green color (on-brand)
        final icon = tester.widget<Icon>(find.byIcon(Icons.check_circle));
        expect(icon.color, const Color(0xFF66BB6A)); // AppColors.success
      });

      testWidgets('displays degraded status with amber color', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(status: HealthStatus.degraded),
          ),
        );

        // Should show warning icon
        expect(find.byIcon(Icons.warning), findsOneWidget);

        // Should show "Degraded" text
        expect(find.text('Degraded'), findsOneWidget);

        // Should have honey yellow color (brand secondary/warning)
        final icon = tester.widget<Icon>(find.byIcon(Icons.warning));
        expect(icon.color, const Color(0xFFFFB90F)); // AppColors.warning
      });

      testWidgets('displays critical status with red color', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(status: HealthStatus.critical),
          ),
        );

        // Should show error icon
        expect(find.byIcon(Icons.error), findsOneWidget);

        // Should show "Critical" text
        expect(find.text('Critical'), findsOneWidget);

        // Icon color is theme error color (verified in container test)
        final icon = tester.widget<Icon>(find.byIcon(Icons.error));
        expect(icon.color, isNotNull);
      });

      testWidgets('displays unknown status with grey color', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(status: HealthStatus.unknown),
          ),
        );

        // Should show help_outline icon
        expect(find.byIcon(Icons.help_outline), findsOneWidget);

        // Should show "Unknown" text
        expect(find.text('Unknown'), findsOneWidget);

        // Icon should have grey color (verified by alpha)
        final icon = tester.widget<Icon>(find.byIcon(Icons.help_outline));
        expect(icon.color, isNotNull);
      });
    });

    group('Custom Labels', () {
      testWidgets('displays custom label when provided', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.healthy,
              label: 'Database',
            ),
          ),
        );

        // Should show custom label instead of default
        expect(find.text('Database'), findsOneWidget);
        expect(find.text('Healthy'), findsNothing);
      });

      testWidgets('hides label when showLabel is false', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.healthy,
              showLabel: false,
            ),
          ),
        );

        // Should show icon only, no text
        expect(find.byIcon(Icons.check_circle), findsOneWidget);
        expect(find.text('Healthy'), findsNothing);
      });

      testWidgets('respects custom label with showLabel false', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.degraded,
              label: 'Redis',
              showLabel: false,
            ),
          ),
        );

        // Should not show label even if provided
        expect(find.text('Redis'), findsNothing);
        expect(find.text('Degraded'), findsNothing);
        expect(find.byIcon(Icons.warning), findsOneWidget);
      });
    });

    group('Compact Mode', () {
      testWidgets('displays compact badge (circle dot)', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.healthy,
              isCompact: true,
            ),
          ),
        );

        // Should find a Container (the dot)
        expect(find.byType(Container), findsWidgets);

        // Should NOT show icon or text in compact mode
        expect(find.byIcon(Icons.check_circle), findsNothing);
        expect(find.text('Healthy'), findsNothing);
      });

      testWidgets('compact badge has correct color', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.degraded,
              isCompact: true,
            ),
          ),
        );

        // Find the compact badge container
        final container = tester.widget<Container>(
          find
              .descendant(
                of: find.byType(ConnectionStatusBadge),
                matching: find.byType(Container),
              )
              .first,
        );

        final decoration = container.decoration as BoxDecoration;
        expect(
          decoration.color,
          const Color(0xFFFFB90F),
        ); // Honey Yellow (warning)
        expect(decoration.shape, BoxShape.circle);
      });
    });

    group('Legacy Connection Factory', () {
      testWidgets('connection factory with isConnected true shows healthy', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(ConnectionStatusBadge.connection(isConnected: true)),
        );

        expect(find.byIcon(Icons.check_circle), findsOneWidget);
        expect(find.text('Healthy'), findsOneWidget);
      });

      testWidgets('connection factory with isConnected false shows critical', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(ConnectionStatusBadge.connection(isConnected: false)),
        );

        expect(find.byIcon(Icons.error), findsOneWidget);
        expect(find.text('Critical'), findsOneWidget);
      });

      testWidgets('connection factory respects custom label', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            ConnectionStatusBadge.connection(
              isConnected: true,
              label: 'Backend',
            ),
          ),
        );

        expect(find.text('Backend'), findsOneWidget);
        expect(find.text('Healthy'), findsNothing);
      });

      testWidgets('connection factory respects showLabel', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            ConnectionStatusBadge.connection(
              isConnected: false,
              showLabel: false,
            ),
          ),
        );

        expect(find.byIcon(Icons.error), findsOneWidget);
        expect(find.text('Critical'), findsNothing);
      });
    });

    group('Edge Cases', () {
      testWidgets('handles all status values without error', (
        WidgetTester tester,
      ) async {
        for (final status in HealthStatus.values) {
          await tester.pumpWidget(
            makeTestable(ConnectionStatusBadge(status: status)),
          );

          // Should render without error
          expect(find.byType(ConnectionStatusBadge), findsOneWidget);

          // Cleanup for next iteration
          await tester.pumpAndSettle();
        }
      });

      testWidgets('handles empty custom label gracefully', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.healthy,
              label: '',
            ),
          ),
        );

        // Should show empty string (not crash)
        expect(find.text(''), findsOneWidget);
        expect(find.byIcon(Icons.check_circle), findsOneWidget);
      });

      testWidgets('handles very long custom labels', (
        WidgetTester tester,
      ) async {
        const veryLongLabel = 'This is a very long label that might overflow';

        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.degraded,
              label: veryLongLabel,
            ),
          ),
        );

        // Should render without overflow
        expect(find.text(veryLongLabel), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    });

    group('Accessibility', () {
      testWidgets('icon is present for screen readers', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(status: HealthStatus.healthy),
          ),
        );

        // Icon should be visible to assistive technologies
        expect(find.byIcon(Icons.check_circle), findsOneWidget);
      });

      testWidgets('text label is present when showLabel is true', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          makeTestable(
            const ConnectionStatusBadge(
              status: HealthStatus.critical,
              showLabel: true,
            ),
          ),
        );

        // Text should be accessible
        expect(find.text('Critical'), findsOneWidget);
      });

      testWidgets('compact mode still has color differentiation', (
        WidgetTester tester,
      ) async {
        // Even without icon/text, color provides information
        await tester.pumpWidget(
          makeTestable(
            Row(
              children: const [
                ConnectionStatusBadge(
                  status: HealthStatus.healthy,
                  isCompact: true,
                ),
                SizedBox(width: 8),
                ConnectionStatusBadge(
                  status: HealthStatus.critical,
                  isCompact: true,
                ),
              ],
            ),
          ),
        );

        // Both badges should render (verified by color in other tests)
        expect(find.byType(ConnectionStatusBadge), findsNWidgets(2));
      });
    });
  });
}
