/// Tests for InfoBanner molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Displays message correctly
/// - Shows correct icons for each BannerStyle
/// - Handles action buttons
/// - Handles dismiss functionality
/// - Compact mode works correctly
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/feedback/info_banner.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  group('InfoBanner', () {
    group('message display', () {
      testWidgets('displays the provided message', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Your trial expires in 7 days'),
        );

        expect(find.text('Your trial expires in 7 days'), findsOneWidget);
      });

      testWidgets('message is in an Expanded widget for proper layout', (
        tester,
      ) async {
        await tester.pumpTestWidget(const InfoBanner(message: 'Test message'));

        expect(find.byType(Expanded), findsOneWidget);
      });
    });

    group('BannerStyle icons', () {
      testWidgets('info style shows info_outline icon by default', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Info', style: BannerStyle.info),
        );

        expect(find.byIcon(Icons.info_outline), findsOneWidget);
      });

      testWidgets('success style shows check_circle_outline icon', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Success', style: BannerStyle.success),
        );

        expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
      });

      testWidgets('warning style shows warning_amber_outlined icon', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Warning', style: BannerStyle.warning),
        );

        expect(find.byIcon(Icons.warning_amber_outlined), findsOneWidget);
      });

      testWidgets('error style shows error_outline icon', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Error', style: BannerStyle.error),
        );

        expect(find.byIcon(Icons.error_outline), findsOneWidget);
      });

      testWidgets('custom icon overrides default', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(
            message: 'Custom',
            icon: Icons.star,
            style: BannerStyle.info,
          ),
        );

        expect(find.byIcon(Icons.star), findsOneWidget);
        expect(find.byIcon(Icons.info_outline), findsNothing);
      });
    });

    group('action button', () {
      testWidgets('displays action widget when provided', (tester) async {
        await tester.pumpTestWidget(
          InfoBanner(
            message: 'Upgrade available',
            action: TextButton(onPressed: () {}, child: const Text('Upgrade')),
          ),
        );

        expect(find.text('Upgrade'), findsOneWidget);
        expect(find.byType(TextButton), findsOneWidget);
      });

      testWidgets('action button is tappable', (tester) async {
        var tapped = false;
        await tester.pumpTestWidget(
          InfoBanner(
            message: 'Action test',
            action: TextButton(
              onPressed: () => tapped = true,
              child: const Text('Click'),
            ),
          ),
        );

        await tester.tap(find.text('Click'));
        await tester.pumpAndSettle();

        expect(tapped, isTrue);
      });

      testWidgets('no action widget when not provided', (tester) async {
        await tester.pumpTestWidget(const InfoBanner(message: 'No action'));

        expect(find.byType(TextButton), findsNothing);
      });
    });

    group('dismiss functionality', () {
      testWidgets('shows dismiss button when onDismiss provided', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          InfoBanner(message: 'Dismissible', onDismiss: () {}),
        );

        expect(find.byIcon(Icons.close), findsOneWidget);
      });

      testWidgets('dismiss button calls onDismiss when tapped', (tester) async {
        var dismissed = false;
        await tester.pumpTestWidget(
          InfoBanner(message: 'Dismiss me', onDismiss: () => dismissed = true),
        );

        await tester.tap(find.byIcon(Icons.close));
        await tester.pumpAndSettle();

        expect(dismissed, isTrue);
      });

      testWidgets('no dismiss button when onDismiss is null', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Not dismissible'),
        );

        expect(find.byIcon(Icons.close), findsNothing);
      });

      testWidgets('dismiss button has tooltip', (tester) async {
        await tester.pumpTestWidget(
          InfoBanner(message: 'With tooltip', onDismiss: () {}),
        );

        final iconButton = tester.widget<IconButton>(find.byType(IconButton));
        expect(iconButton.tooltip, 'Dismiss');
      });
    });

    group('compact mode', () {
      testWidgets('compact false is default', (tester) async {
        await tester.pumpTestWidget(const InfoBanner(message: 'Default'));

        // Widget renders (default is not compact)
        expect(find.text('Default'), findsOneWidget);
      });

      testWidgets('compact true renders successfully', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Compact', compact: true),
        );

        expect(find.text('Compact'), findsOneWidget);
      });

      testWidgets('compact mode uses smaller icon', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Compact icon', compact: true),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.info_outline));
        expect(icon.size, 18);
      });

      testWidgets('non-compact mode uses larger icon', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Large icon', compact: false),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.info_outline));
        expect(icon.size, 24);
      });
    });

    group('layout structure', () {
      testWidgets('uses Container for styling', (tester) async {
        await tester.pumpTestWidget(
          const InfoBanner(message: 'Container test'),
        );

        expect(find.byType(Container), findsWidgets);
      });

      testWidgets('uses Row for horizontal layout', (tester) async {
        await tester.pumpTestWidget(const InfoBanner(message: 'Row test'));

        expect(find.byType(Row), findsOneWidget);
      });
    });

    group('BannerStyle enum', () {
      test('has all expected values', () {
        expect(
          BannerStyle.values,
          containsAll([
            BannerStyle.info,
            BannerStyle.success,
            BannerStyle.warning,
            BannerStyle.error,
          ]),
        );
      });

      test('has exactly 4 values', () {
        expect(BannerStyle.values.length, 4);
      });
    });

    group('combination scenarios', () {
      testWidgets('renders with all options enabled', (tester) async {
        var actionTapped = false;
        var dismissed = false;

        await tester.pumpTestWidget(
          InfoBanner(
            message: 'Full featured banner',
            style: BannerStyle.warning,
            icon: Icons.notifications,
            action: TextButton(
              onPressed: () => actionTapped = true,
              child: const Text('Action'),
            ),
            onDismiss: () => dismissed = true,
            compact: true,
          ),
        );

        expect(find.text('Full featured banner'), findsOneWidget);
        expect(find.byIcon(Icons.notifications), findsOneWidget);
        expect(find.text('Action'), findsOneWidget);
        expect(find.byIcon(Icons.close), findsOneWidget);

        // Test both interactions
        await tester.tap(find.text('Action'));
        await tester.pumpAndSettle();
        expect(actionTapped, isTrue);

        await tester.tap(find.byIcon(Icons.close));
        await tester.pumpAndSettle();
        expect(dismissed, isTrue);
      });
    });
  });
}
