/// PlaceholderCard Molecule Tests
///
/// Tests the "coming soon" placeholder card molecule.
/// Shows icon, title, and message for features under development.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/cards/placeholder_card.dart';
import 'package:tross_app/config/app_colors.dart';

void main() {
  group('PlaceholderCard Molecule', () {
    // =========================================================================
    // Basic Rendering
    // =========================================================================
    group('Basic Rendering', () {
      testWidgets('renders icon, title, and message', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.tune,
                title: 'Preferences',
                message: 'Coming soon!',
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.tune), findsOneWidget);
        expect(find.text('Preferences'), findsOneWidget);
        expect(find.text('Coming soon!'), findsOneWidget);
      });

      testWidgets('renders inside a Card widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.settings,
                title: 'Settings',
                message: 'Under development',
              ),
            ),
          ),
        );

        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('shows construction icon in placeholder content', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.notifications,
                title: 'Notifications',
                message: 'Feature coming soon',
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.construction), findsOneWidget);
      });

      testWidgets('renders divider between header and content', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.palette,
                title: 'Themes',
                message: 'Dark mode coming',
              ),
            ),
          ),
        );

        expect(find.byType(Divider), findsOneWidget);
      });
    });

    // =========================================================================
    // Icon Styling
    // =========================================================================
    group('Icon Styling', () {
      testWidgets('uses brand primary color by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.star,
                title: 'Favorites',
                message: 'Coming soon',
              ),
            ),
          ),
        );

        final icons = tester.widgetList<Icon>(find.byType(Icon)).toList();
        // First icon is the header icon
        final headerIcon = icons.firstWhere((i) => i.icon == Icons.star);
        expect(headerIcon.color, AppColors.brandPrimary);
      });

      testWidgets('uses custom icon color when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.warning,
                title: 'Warnings',
                message: 'Alerts coming',
                iconColor: Colors.orange,
              ),
            ),
          ),
        );

        final icons = tester.widgetList<Icon>(find.byType(Icon)).toList();
        final headerIcon = icons.firstWhere((i) => i.icon == Icons.warning);
        expect(headerIcon.color, Colors.orange);
      });
    });

    // =========================================================================
    // Title Styling
    // =========================================================================
    group('Title Styling', () {
      testWidgets('title has bold font weight', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.language,
                title: 'Language',
                message: 'Multi-language coming',
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Language'));
        expect(text.style?.fontWeight, FontWeight.bold);
      });
    });

    // =========================================================================
    // Message Styling
    // =========================================================================
    group('Message Styling', () {
      testWidgets('message uses secondary text color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.cloud,
                title: 'Cloud Sync',
                message: 'Sync feature coming',
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Sync feature coming'));
        expect(text.style?.color, AppColors.textSecondary);
      });

      testWidgets('message is center aligned', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.backup,
                title: 'Backup',
                message: 'Automatic backups coming',
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Automatic backups coming'));
        expect(text.textAlign, TextAlign.center);
      });
    });

    // =========================================================================
    // Layout
    // =========================================================================
    group('Layout', () {
      testWidgets('header icon and title are in a Row', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.security,
                title: 'Security',
                message: 'Two-factor auth coming',
              ),
            ),
          ),
        );

        // Icon and title should be siblings in a Row
        final row = find.ancestor(
          of: find.text('Security'),
          matching: find.byType(Row),
        );
        expect(row, findsWidgets);
      });

      testWidgets('content is centered', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.analytics,
                title: 'Analytics',
                message: 'Reports coming',
              ),
            ),
          ),
        );

        // Construction icon should be inside a Center widget
        final center = find.ancestor(
          of: find.byIcon(Icons.construction),
          matching: find.byType(Center),
        );
        expect(center, findsOneWidget);
      });
    });

    // =========================================================================
    // Different Content Scenarios
    // =========================================================================
    group('Content Scenarios', () {
      testWidgets('handles long message text', (tester) async {
        const longMessage =
            'This is a very long message that describes the upcoming feature '
            'in great detail, explaining all the wonderful things it will do '
            'when it is finally implemented.';

        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.auto_awesome,
                title: 'Magic Feature',
                message: longMessage,
              ),
            ),
          ),
        );

        expect(find.text(longMessage), findsOneWidget);
      });

      testWidgets('handles short title', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PlaceholderCard(
                icon: Icons.abc,
                title: 'A',
                message: 'Short',
              ),
            ),
          ),
        );

        expect(find.text('A'), findsOneWidget);
        expect(find.text('Short'), findsOneWidget);
      });
    });
  });
}
