/// Tests for ConfigCard Molecule
///
/// Verifies:
/// - Basic rendering with title
/// - Description display
/// - Status chip integration
/// - Leading/trailing widgets
/// - Child content
/// - Tap interaction
/// - Enabled/disabled states
/// - Styling options
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/cards/config_card.dart';
import 'package:tross/widgets/atoms/indicators/status_chip.dart';

void main() {
  group('ConfigCard', () {
    group('rendering', () {
      testWidgets('renders title', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ConfigCard(title: 'Test Config')),
          ),
        );

        expect(find.text('Test Config'), findsOneWidget);
      });

      testWidgets('renders description when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                description: 'This is a description',
              ),
            ),
          ),
        );

        expect(find.text('This is a description'), findsOneWidget);
      });

      testWidgets('renders status chip when status provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                statusLabel: 'Active',
                statusColor: Colors.green,
              ),
            ),
          ),
        );

        expect(find.byType(StatusChip), findsOneWidget);
        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('renders status chip with icon', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                statusLabel: 'Pending',
                statusColor: Colors.orange,
                statusIcon: Icons.hourglass_empty,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.hourglass_empty), findsOneWidget);
      });

      testWidgets('renders compact status chip when specified', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                statusLabel: 'Active',
                statusColor: Colors.green,
                compactStatus: true,
              ),
            ),
          ),
        );

        final statusChip = tester.widget<StatusChip>(find.byType(StatusChip));
        expect(statusChip.compact, isTrue);
      });
    });

    group('leading and trailing widgets', () {
      testWidgets('renders leading widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(title: 'Config', leading: Icon(Icons.storage)),
            ),
          ),
        );

        expect(find.byIcon(Icons.storage), findsOneWidget);
      });

      testWidgets('renders trailing widget', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                trailing: IconButton(
                  icon: const Icon(Icons.settings),
                  onPressed: () {},
                ),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('renders both leading and trailing', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                leading: const Icon(Icons.storage),
                trailing: IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {},
                ),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.storage), findsOneWidget);
        expect(find.byIcon(Icons.edit), findsOneWidget);
      });
    });

    group('child content', () {
      testWidgets('renders child widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(title: 'Config', child: Text('Child content')),
            ),
          ),
        );

        expect(find.text('Child content'), findsOneWidget);
      });

      testWidgets('child appears below title and description', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                description: 'Description',
                child: Text('Child'),
              ),
            ),
          ),
        );

        final titleRect = tester.getRect(find.text('Config'));
        final descRect = tester.getRect(find.text('Description'));
        final childRect = tester.getRect(find.text('Child'));

        expect(childRect.top, greaterThan(titleRect.bottom));
        expect(childRect.top, greaterThan(descRect.bottom));
      });
    });

    group('interaction', () {
      testWidgets('calls onTap when tapped', (tester) async {
        var tapped = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfigCard(title: 'Config', onTap: () => tapped = true),
            ),
          ),
        );

        await tester.tap(find.byType(ConfigCard));
        expect(tapped, isTrue);
      });

      testWidgets('does not call onTap when disabled', (tester) async {
        var tapped = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Config',
                onTap: () => tapped = true,
                enabled: false,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(ConfigCard));
        expect(tapped, isFalse);
      });

      testWidgets('has reduced opacity when disabled', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ConfigCard(title: 'Config', enabled: false)),
          ),
        );

        final opacity = tester.widget<Opacity>(find.byType(Opacity));
        expect(opacity.opacity, equals(0.5));
      });
    });

    group('styling', () {
      testWidgets('renders as Card widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ConfigCard(title: 'Config')),
          ),
        );

        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('applies custom background color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(title: 'Config', backgroundColor: Colors.blue),
            ),
          ),
        );

        final card = tester.widget<Card>(find.byType(Card));
        expect(card.color, equals(Colors.blue));
      });

      testWidgets('applies custom elevation', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ConfigCard(title: 'Config', elevation: 8.0)),
          ),
        );

        final card = tester.widget<Card>(find.byType(Card));
        expect(card.elevation, equals(8.0));
      });

      testWidgets('applies custom padding', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ConfigCard(title: 'Config', padding: EdgeInsets.all(32)),
            ),
          ),
        );

        // Should find Padding with custom insets
        final paddings = tester
            .widgetList<Padding>(find.byType(Padding))
            .toList();
        final hasCustomPadding = paddings.any(
          (p) => p.padding == const EdgeInsets.all(32),
        );
        expect(hasCustomPadding, isTrue);
      });
    });

    group('full composition', () {
      testWidgets('renders complete config card', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfigCard(
                title: 'Database Connection',
                description: 'PostgreSQL primary database',
                statusLabel: 'Connected',
                statusColor: Colors.green,
                statusIcon: Icons.check_circle,
                leading: const Icon(Icons.storage),
                trailing: IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () {},
                ),
                child: const Text('Last sync: 5 minutes ago'),
              ),
            ),
          ),
        );

        expect(find.text('Database Connection'), findsOneWidget);
        expect(find.text('PostgreSQL primary database'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
        expect(find.text('Connected'), findsOneWidget);
        expect(find.byIcon(Icons.check_circle), findsOneWidget);
        expect(find.byIcon(Icons.storage), findsOneWidget);
        expect(find.byIcon(Icons.refresh), findsOneWidget);
        expect(find.text('Last sync: 5 minutes ago'), findsOneWidget);
      });
    });
  });

  group('ConfigCardGroup', () {
    testWidgets('renders multiple config cards', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: ConfigCardGroup(
                cards: [
                  ConfigCard(title: 'Card 1'),
                  ConfigCard(title: 'Card 2'),
                  ConfigCard(title: 'Card 3'),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('Card 1'), findsOneWidget);
      expect(find.text('Card 2'), findsOneWidget);
      expect(find.text('Card 3'), findsOneWidget);
      expect(find.byType(ConfigCard), findsNWidgets(3));
    });

    testWidgets('renders header when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ConfigCardGroup(
              header: Text('Configuration Settings'),
              cards: [ConfigCard(title: 'Card 1')],
            ),
          ),
        ),
      );

      expect(find.text('Configuration Settings'), findsOneWidget);
    });

    testWidgets('header appears above cards', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ConfigCardGroup(
              header: Text('Header'),
              cards: [ConfigCard(title: 'Card 1')],
            ),
          ),
        ),
      );

      final headerRect = tester.getRect(find.text('Header'));
      final cardRect = tester.getRect(find.text('Card 1'));
      expect(cardRect.top, greaterThan(headerRect.bottom));
    });
  });
}
