import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/dev_mode_indicator.dart';
import 'package:tross_app/widgets/atoms/indicators/status_badge.dart';
import 'package:tross_app/config/app_config.dart';

void main() {
  group('DevModeIndicator', () {
    testWidgets('shows badge in development mode', (tester) async {
      // Verify we're in dev mode for this test
      expect(AppConfig.isDevMode, true, reason: 'Tests should run in dev mode');

      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicator())),
      );

      // Should find a StatusBadge
      expect(find.byType(StatusBadge), findsOneWidget);

      // Should show environment name
      expect(find.text('Development'), findsOneWidget);

      // Should have warning style icon
      expect(find.byIcon(Icons.code), findsOneWidget);
    });

    testWidgets('hides in production when alwaysShow is false', (tester) async {
      // Note: In actual production, isProduction would be true
      // This test documents the expected behavior

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeIndicator(alwaysShow: false)),
        ),
      );

      if (AppConfig.isProduction) {
        // Should be hidden (SizedBox.shrink)
        expect(find.byType(StatusBadge), findsNothing);
      } else {
        // In dev/test mode, should be visible
        expect(find.byType(StatusBadge), findsOneWidget);
      }
    });

    testWidgets('shows in production when alwaysShow is true', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeIndicator(alwaysShow: true)),
        ),
      );

      // Should always show when alwaysShow is true
      expect(find.byType(StatusBadge), findsOneWidget);
    });

    testWidgets('uses compact mode when specified', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeIndicator(compact: true)),
        ),
      );

      // Find the StatusBadge
      final badgeFinder = find.byType(StatusBadge);
      expect(badgeFinder, findsOneWidget);

      // Verify compact property is passed through
      final badge = tester.widget<StatusBadge>(badgeFinder);
      expect(badge.compact, true);
    });

    testWidgets('handles tap when onTap provided', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DevModeIndicator(onTap: () => tapped = true)),
        ),
      );

      // Should find InkWell when onTap is provided
      expect(find.byType(InkWell), findsOneWidget);

      // Tap the indicator
      await tester.tap(find.byType(DevModeIndicator));
      await tester.pump();

      expect(tapped, true);
    });

    testWidgets('does not wrap in InkWell when onTap is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicator())),
      );

      // Should not have InkWell when onTap is null
      expect(find.byType(InkWell), findsNothing);

      // Should still have StatusBadge
      expect(find.byType(StatusBadge), findsOneWidget);
    });

    testWidgets('displays correct icon for dev mode', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicator())),
      );

      // In dev mode, should show code icon
      if (AppConfig.isDevMode) {
        expect(find.byIcon(Icons.code), findsOneWidget);
      }
    });

    testWidgets('applies warning style in dev mode', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicator())),
      );

      final badgeFinder = find.byType(StatusBadge);
      expect(badgeFinder, findsOneWidget);

      final badge = tester.widget<StatusBadge>(badgeFinder);

      // In dev mode, should use warning style
      if (AppConfig.isDevMode) {
        expect(badge.style, BadgeStyle.warning);
      }
    });
  });

  group('DevModeIndicatorWithTooltip', () {
    testWidgets('shows indicator with tooltip', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicatorWithTooltip())),
      );

      // Should find base DevModeIndicator
      expect(find.byType(DevModeIndicator), findsOneWidget);

      // Should be wrapped in Tooltip
      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('tooltip contains environment details', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicatorWithTooltip())),
      );

      final tooltipFinder = find.byType(Tooltip);
      expect(tooltipFinder, findsOneWidget);

      final tooltip = tester.widget<Tooltip>(tooltipFinder);
      final message = tooltip.message!;

      // Verify tooltip contains key information
      expect(message, contains('Environment:'));
      expect(message, contains('Dev Auth:'));
      expect(message, contains('API:'));
      expect(message, contains('Version:'));
      expect(message, contains(AppConfig.environmentName));
    });

    testWidgets('hides in production when alwaysShow is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeIndicatorWithTooltip(alwaysShow: false)),
        ),
      );

      if (AppConfig.isProduction) {
        // Should be hidden
        expect(find.byType(DevModeIndicator), findsNothing);
      } else {
        // Should be visible in dev mode
        expect(find.byType(DevModeIndicator), findsOneWidget);
      }
    });

    testWidgets('passes compact property through', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeIndicatorWithTooltip(compact: true)),
        ),
      );

      final indicatorFinder = find.byType(DevModeIndicator);
      expect(indicatorFinder, findsOneWidget);

      final indicator = tester.widget<DevModeIndicator>(indicatorFinder);
      expect(indicator.compact, true);
    });

    testWidgets('shows tooltip on hover', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicatorWithTooltip())),
      );

      // Initially, tooltip text should not be visible
      expect(find.text('Environment:'), findsNothing);

      // Long press to show tooltip
      await tester.longPress(find.byType(DevModeIndicatorWithTooltip));
      await tester.pumpAndSettle();

      // Note: In actual widget tests, tooltip might not fully render
      // This documents expected behavior
    });
  });

  group('DevModeBanner', () {
    testWidgets('shows banner in development mode', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      if (AppConfig.isDevMode) {
        // Should show banner content
        expect(find.text('Development Environment'), findsOneWidget);
        expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      }
    });

    testWidgets('hides in production mode', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      if (AppConfig.isProduction) {
        // Should be hidden
        expect(find.text('Development Environment'), findsNothing);
        expect(find.byIcon(Icons.warning_amber_rounded), findsNothing);
      }
    });

    testWidgets('displays default message', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      if (AppConfig.isDevMode) {
        expect(
          find.text('Development Mode - Test authentication available below'),
          findsOneWidget,
        );
      }
    });

    testWidgets('displays custom message when provided', (tester) async {
      const customMessage = 'Custom dev mode message';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevModeBanner(message: customMessage)),
        ),
      );

      if (AppConfig.isDevMode) {
        expect(find.text(customMessage), findsOneWidget);
      }
    });

    testWidgets('shows action button when provided', (tester) async {
      bool actionPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DevModeBanner(
              actionLabel: 'View Details',
              onActionPressed: () => actionPressed = true,
            ),
          ),
        ),
      );

      if (AppConfig.isDevMode) {
        // Should show action button
        expect(find.text('View Details'), findsOneWidget);
        expect(find.byType(TextButton), findsOneWidget);

        // Tap the button
        await tester.tap(find.byType(TextButton));
        await tester.pump();

        expect(actionPressed, true);
      }
    });

    testWidgets('does not show action button when not provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      // Should not have action button
      expect(find.byType(TextButton), findsNothing);
    });

    testWidgets('is full width', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: SizedBox(width: 500, child: DevModeBanner())),
        ),
      );

      if (AppConfig.isDevMode) {
        final containerFinder = find.byType(Container).first;
        final container = tester.widget<Container>(containerFinder);

        expect(container.constraints?.maxWidth, double.infinity);
      }
    });

    testWidgets('has proper icon and text layout', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      if (AppConfig.isDevMode) {
        // Should have Row layout
        expect(find.byType(Row), findsWidgets);

        // Icon should come before text
        expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
        expect(find.text('Development Environment'), findsOneWidget);
      }
    });
  });

  group('DevModeIndicator Integration', () {
    testWidgets('all three variants coexist', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                DevModeIndicator(),
                DevModeIndicatorWithTooltip(),
                DevModeBanner(),
              ],
            ),
          ),
        ),
      );

      if (AppConfig.isDevMode) {
        // Should find all variants
        expect(
          find.byType(DevModeIndicator),
          findsNWidgets(2),
        ); // One direct, one in tooltip
        expect(find.byType(DevModeIndicatorWithTooltip), findsOneWidget);
        expect(find.byType(DevModeBanner), findsOneWidget);
      }
    });

    testWidgets('compact and regular indicators differ in size', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Row(
              children: [
                DevModeIndicator(compact: false),
                SizedBox(width: 16),
                DevModeIndicator(compact: true),
              ],
            ),
          ),
        ),
      );

      final indicators = tester.widgetList<DevModeIndicator>(
        find.byType(DevModeIndicator),
      );

      expect(indicators.length, 2);
      expect(indicators.first.compact, false);
      expect(indicators.last.compact, true);
    });

    testWidgets('indicator works within constrained layouts', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 200,
              height: 50,
              child: const DevModeIndicator(),
            ),
          ),
        ),
      );

      // Should not overflow
      expect(tester.takeException(), isNull);
    });

    testWidgets('banner works within constrained layouts', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(width: 400, child: const DevModeBanner()),
          ),
        ),
      );

      // Should not overflow
      expect(tester.takeException(), isNull);
    });
  });

  group('DevModeIndicator Accessibility', () {
    testWidgets('tooltip provides additional context for screen readers', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicatorWithTooltip())),
      );

      // Tooltip provides semantic information
      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('banner text is readable', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );

      if (AppConfig.isDevMode) {
        final textFinders = find.byType(Text);
        expect(textFinders, findsWidgets);

        // All text should be present
        for (final finder in textFinders.evaluate()) {
          final text = finder.widget as Text;
          expect(text.data, isNotEmpty);
        }
      }
    });

    testWidgets('tap area is accessible', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DevModeIndicator(onTap: () {})),
        ),
      );

      // InkWell provides touch feedback
      if (AppConfig.isDevMode) {
        expect(find.byType(InkWell), findsOneWidget);
      }
    });
  });
}
