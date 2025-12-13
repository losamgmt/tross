// DevModeIndicator Molecule Tests
//
// Tests pure composition behavior with props:
// - Badge rendering based on isDevelopment
// - Visibility controlled by show prop
// - Tap handling
// - Compact mode

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/dev_mode_indicator.dart';
import 'package:tross_app/widgets/atoms/indicators/app_badge.dart';

void main() {
  group('DevModeIndicator', () {
    testWidgets('shows warning badge when isDevelopment is true', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
            ),
          ),
        ),
      );

      expect(find.byType(AppBadge), findsOneWidget);
      expect(find.text('Development'), findsOneWidget);
      expect(find.byIcon(Icons.code), findsOneWidget);

      final badge = tester.widget<AppBadge>(find.byType(AppBadge));
      expect(badge.style, BadgeStyle.warning);
    });

    testWidgets('shows success badge when isDevelopment is false', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Production',
              isDevelopment: false,
            ),
          ),
        ),
      );

      expect(find.byType(AppBadge), findsOneWidget);
      expect(find.text('Production'), findsOneWidget);
      expect(find.byIcon(Icons.verified_user), findsOneWidget);

      final badge = tester.widget<AppBadge>(find.byType(AppBadge));
      expect(badge.style, BadgeStyle.success);
    });

    testWidgets('hides when show is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
              show: false,
            ),
          ),
        ),
      );

      expect(find.byType(AppBadge), findsNothing);
      expect(find.byType(SizedBox), findsOneWidget);
    });

    testWidgets('shows when show is true (default)', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
            ),
          ),
        ),
      );

      expect(find.byType(AppBadge), findsOneWidget);
    });

    testWidgets('uses compact mode when specified', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
              compact: true,
            ),
          ),
        ),
      );

      final badge = tester.widget<AppBadge>(find.byType(AppBadge));
      expect(badge.compact, true);
    });

    testWidgets('handles tap when onTap provided', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.byType(InkWell), findsOneWidget);

      await tester.tap(find.byType(DevModeIndicator));
      await tester.pump();

      expect(tapped, true);
    });

    testWidgets('does not wrap in InkWell when onTap is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicator(
              environmentName: 'Development',
              isDevelopment: true,
            ),
          ),
        ),
      );

      expect(find.byType(InkWell), findsNothing);
      expect(find.byType(AppBadge), findsOneWidget);
    });
  });

  group('DevModeIndicatorWithTooltip', () {
    testWidgets('shows indicator with tooltip', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicatorWithTooltip(
              environmentName: 'Development',
              isDevelopment: true,
              tooltipMessage: 'Environment: Development\nVersion: 1.0.0',
            ),
          ),
        ),
      );

      expect(find.byType(DevModeIndicator), findsOneWidget);
      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('tooltip has provided message', (tester) async {
      const message = 'Test tooltip message';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicatorWithTooltip(
              environmentName: 'Development',
              isDevelopment: true,
              tooltipMessage: message,
            ),
          ),
        ),
      );

      final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
      expect(tooltip.message, message);
    });

    testWidgets('hides when show is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeIndicatorWithTooltip(
              environmentName: 'Development',
              isDevelopment: true,
              tooltipMessage: 'Test',
              show: false,
            ),
          ),
        ),
      );

      expect(find.byType(DevModeIndicator), findsNothing);
      expect(find.byType(Tooltip), findsNothing);
    });
  });

  group('DevModeBanner', () {
    testWidgets('shows banner with title and message', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeBanner(
              title: 'Development Environment',
              message: 'Test mode enabled',
            ),
          ),
        ),
      );

      expect(find.text('Development Environment'), findsOneWidget);
      expect(find.text('Test mode enabled'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
    });

    testWidgets('hides when show is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeBanner(
              title: 'Development Environment',
              message: 'Test mode enabled',
              show: false,
            ),
          ),
        ),
      );

      expect(find.text('Development Environment'), findsNothing);
    });

    testWidgets('shows action button when provided', (tester) async {
      bool actionPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DevModeBanner(
              title: 'Development Environment',
              message: 'Test mode enabled',
              actionLabel: 'View Details',
              onActionPressed: () => actionPressed = true,
            ),
          ),
        ),
      );

      expect(find.text('View Details'), findsOneWidget);
      expect(find.byType(TextButton), findsOneWidget);

      await tester.tap(find.byType(TextButton));
      await tester.pump();

      expect(actionPressed, true);
    });

    testWidgets('does not show action button when not provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DevModeBanner(
              title: 'Development Environment',
              message: 'Test mode enabled',
            ),
          ),
        ),
      );

      expect(find.byType(TextButton), findsNothing);
    });
  });
}
