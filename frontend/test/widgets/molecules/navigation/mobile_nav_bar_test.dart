/// Tests for MobileNavBar molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Renders navigation items
/// - Highlights active route
/// - Handles item taps
/// - Respects Material Design 5-item limit
/// - Shows/hides labels
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/navigation/mobile_nav_bar.dart';
import 'package:tross_app/widgets/organisms/navigation/nav_menu_item.dart';

void main() {
  group('MobileNavBar', () {
    final testItems = [
      NavMenuItem(id: 'home', label: 'Home', icon: Icons.home, route: '/home'),
      NavMenuItem(
        id: 'search',
        label: 'Search',
        icon: Icons.search,
        route: '/search',
      ),
      NavMenuItem(
        id: 'profile',
        label: 'Profile',
        icon: Icons.person,
        route: '/profile',
      ),
    ];

    group('basic rendering', () {
      testWidgets('renders NavigationBar', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
              ),
            ),
          ),
        );

        expect(find.byType(NavigationBar), findsOneWidget);
      });

      testWidgets('renders navigation destinations for each item', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
              ),
            ),
          ),
        );

        expect(find.byType(NavigationDestination), findsNWidgets(3));
      });

      testWidgets('shows item labels', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
              ),
            ),
          ),
        );

        expect(find.text('Home'), findsOneWidget);
        expect(find.text('Search'), findsOneWidget);
        expect(find.text('Profile'), findsOneWidget);
      });

      testWidgets('shows item icons', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.home), findsWidgets);
        expect(find.byIcon(Icons.search), findsWidgets);
        expect(find.byIcon(Icons.person), findsWidgets);
      });

      testWidgets('returns empty widget when no items', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: [],
                currentRoute: '/home',
              ),
            ),
          ),
        );

        expect(find.byType(NavigationBar), findsNothing);
        expect(find.byType(SizedBox), findsWidgets);
      });
    });

    group('active route highlighting', () {
      testWidgets('selects correct index for exact route match', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/search',
              ),
            ),
          ),
        );

        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        expect(navBar.selectedIndex, 1); // Search is index 1
      });

      testWidgets('selects correct index for nested route', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/profile/settings',
              ),
            ),
          ),
        );

        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        expect(navBar.selectedIndex, 2); // Profile is index 2
      });

      testWidgets('defaults to first item when no match', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/unknown',
              ),
            ),
          ),
        );

        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        expect(navBar.selectedIndex, 0);
      });
    });

    group('item tap handling', () {
      testWidgets('calls onItemTap when destination selected', (tester) async {
        NavMenuItem? tappedItem;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
                onItemTap: (item) => tappedItem = item,
              ),
            ),
          ),
        );

        // Tap on Search (index 1)
        await tester.tap(find.text('Search'));
        await tester.pumpAndSettle();

        expect(tappedItem, isNotNull);
        expect(tappedItem!.id, 'search');
      });
    });

    group('label visibility', () {
      testWidgets('hides labels when showLabels is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
                showLabels: false,
              ),
            ),
          ),
        );

        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        expect(
          navBar.labelBehavior,
          NavigationDestinationLabelBehavior.alwaysHide,
        );
      });

      testWidgets(
        'shows only selected label when showSelectedLabelsOnly is true',
        (tester) async {
          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                bottomNavigationBar: MobileNavBar(
                  items: testItems,
                  currentRoute: '/home',
                  showSelectedLabelsOnly: true,
                ),
              ),
            ),
          );

          final navBar = tester.widget<NavigationBar>(
            find.byType(NavigationBar),
          );
          expect(
            navBar.labelBehavior,
            NavigationDestinationLabelBehavior.onlyShowSelected,
          );
        },
      );
    });

    group('fromItems factory', () {
      testWidgets('filters to max 5 items', (tester) async {
        final manyItems = List.generate(
          10,
          (i) => NavMenuItem(
            id: 'item$i',
            label: 'Item $i',
            icon: Icons.circle,
            route: '/item$i',
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar.fromItems(
                allItems: manyItems,
                currentRoute: '/item0',
              ),
            ),
          ),
        );

        expect(find.byType(NavigationDestination), findsNWidgets(5));
      });

      testWidgets('filters out items without icons', (tester) async {
        final mixedItems = [
          NavMenuItem(
            id: 'with',
            label: 'With Icon',
            icon: Icons.star,
            route: '/with',
          ),
          NavMenuItem(
            id: 'without',
            label: 'Without',
            route: '/without',
          ), // No icon
          NavMenuItem(
            id: 'also',
            label: 'Also Icon',
            icon: Icons.favorite,
            route: '/also',
          ),
        ];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar.fromItems(
                allItems: mixedItems,
                currentRoute: '/with',
              ),
            ),
          ),
        );

        expect(find.byType(NavigationDestination), findsNWidgets(2));
      });

      testWidgets('filters out items without routes', (tester) async {
        final mixedItems = [
          NavMenuItem(
            id: 'with1',
            label: 'With Route 1',
            icon: Icons.star,
            route: '/with1',
          ),
          NavMenuItem(
            id: 'with2',
            label: 'With Route 2',
            icon: Icons.home,
            route: '/with2',
          ),
          NavMenuItem(
            id: 'without',
            label: 'No Route',
            icon: Icons.circle,
          ), // No route
        ];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar.fromItems(
                allItems: mixedItems,
                currentRoute: '/with1',
              ),
            ),
          ),
        );

        // Only items with routes are included (2 items)
        expect(find.byType(NavigationDestination), findsNWidgets(2));
      });

      testWidgets('returns empty when less than 2 valid items', (tester) async {
        final singleItem = [
          NavMenuItem(
            id: 'single',
            label: 'Single',
            icon: Icons.star,
            route: '/single',
          ),
        ];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar.fromItems(
                allItems: singleItem,
                currentRoute: '/single',
              ),
            ),
          ),
        );

        // NavigationBar requires minimum 2 destinations, so returns empty
        expect(find.byType(NavigationBar), findsNothing);
        expect(find.byType(SizedBox), findsWidgets);
      });

      testWidgets('respects custom maxItems', (tester) async {
        final items = List.generate(
          10,
          (i) => NavMenuItem(
            id: 'item$i',
            label: 'Item $i',
            icon: Icons.circle,
            route: '/item$i',
          ),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar.fromItems(
                allItems: items,
                currentRoute: '/item0',
                maxItems: 3,
              ),
            ),
          ),
        );

        expect(find.byType(NavigationDestination), findsNWidgets(3));
      });
    });

    group('customization', () {
      testWidgets('applies custom background color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              bottomNavigationBar: MobileNavBar(
                items: testItems,
                currentRoute: '/home',
                backgroundColor: Colors.purple,
              ),
            ),
          ),
        );

        final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
        expect(navBar.backgroundColor, Colors.purple);
      });
    });
  });
}
