import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/navigation/notification_tray.dart';

void main() {
  /// Build test widget with pure data injection - just pass data as props
  Widget buildTestWidget({
    List<Map<String, dynamic>> notifications = const [],
    VoidCallback? onOpen,
    OnNotificationTap? onNotificationTap,
    VoidCallback? onViewAll,
  }) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          actions: [
            NotificationTray(
              notifications: notifications,
              onOpen: onOpen,
              onNotificationTap: onNotificationTap,
              onViewAll: onViewAll,
            ),
          ],
        ),
        body: const SizedBox(),
      ),
    );
  }

  group('NotificationTray', () {
    group('Bell Icon', () {
      testWidgets('renders bell icon', (tester) async {
        await tester.pumpWidget(buildTestWidget());

        expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
      });

      testWidgets('hides badge when no unread notifications', (tester) async {
        await tester.pumpWidget(buildTestWidget(notifications: []));

        final badge = find.byType(Badge);
        expect(badge, findsOneWidget);

        final badgeWidget = tester.widget<Badge>(badge);
        expect(badgeWidget.isLabelVisible, isFalse);
      });

      testWidgets('shows badge when unread notifications exist', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Test', 'is_read': false},
              {'id': 2, 'title': 'Test2', 'is_read': false},
              {'id': 3, 'title': 'Test3', 'is_read': true},
            ],
          ),
        );

        final badge = find.byType(Badge);
        expect(badge, findsOneWidget);

        final badgeWidget = tester.widget<Badge>(badge);
        expect(badgeWidget.isLabelVisible, isTrue);
      });

      testWidgets('displays correct unread count in badge', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Unread1', 'is_read': false},
              {'id': 2, 'title': 'Unread2', 'is_read': false},
              {'id': 3, 'title': 'Unread3', 'is_read': false},
              {'id': 4, 'title': 'Read', 'is_read': true},
            ],
          ),
        );

        // 3 unread notifications
        expect(find.text('3'), findsOneWidget);
      });

      testWidgets('caps badge at 99+', (tester) async {
        // Create 150 unread notifications
        final manyNotifications = List.generate(
          150,
          (i) => {'id': i, 'title': 'N$i', 'is_read': false},
        );

        await tester.pumpWidget(
          buildTestWidget(notifications: manyNotifications),
        );

        expect(find.text('99+'), findsOneWidget);
      });
    });

    group('Dropdown', () {
      testWidgets('opens on tap and shows empty state', (tester) async {
        await tester.pumpWidget(buildTestWidget(notifications: []));

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('No notifications'), findsOneWidget);
      });

      testWidgets('displays notifications from data', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {
                'id': 1,
                'title': 'Test Notification',
                'body': 'This is a test message',
                'type': 'info',
                'is_read': false,
                'created_at': DateTime.now().toIso8601String(),
              },
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('Test Notification'), findsOneWidget);
        expect(find.text('This is a test message'), findsOneWidget);
      });

      testWidgets('shows correct icon for different types', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Success', 'type': 'success', 'is_read': true},
              {'id': 2, 'title': 'Warning', 'type': 'warning', 'is_read': true},
              {'id': 3, 'title': 'Error', 'type': 'error', 'is_read': true},
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.check_circle), findsOneWidget);
        expect(find.byIcon(Icons.warning), findsOneWidget);
        expect(find.byIcon(Icons.error), findsOneWidget);
      });

      testWidgets('shows unread indicator for unread notifications', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Unread', 'type': 'info', 'is_read': false},
              {'id': 2, 'title': 'Read', 'type': 'info', 'is_read': true},
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('Unread'), findsOneWidget);
        expect(find.text('Read'), findsOneWidget);
      });
    });

    group('Callbacks', () {
      testWidgets('calls onOpen when dropdown opens', (tester) async {
        bool opened = false;

        await tester.pumpWidget(
          buildTestWidget(notifications: [], onOpen: () => opened = true),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(opened, isTrue);
      });

      testWidgets('calls onNotificationTap when notification tapped', (
        tester,
      ) async {
        Map<String, dynamic>? tappedNotification;

        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Tap me', 'type': 'info', 'is_read': false},
            ],
            onNotificationTap: (n) => tappedNotification = n,
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Tap me'));
        await tester.pumpAndSettle();

        expect(tappedNotification, isNotNull);
        expect(tappedNotification!['id'], 1);
      });

      testWidgets('shows View All when onViewAll provided', (tester) async {
        bool viewAllTapped = false;

        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Test', 'type': 'info', 'is_read': false},
            ],
            onViewAll: () => viewAllTapped = true,
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('View All Notifications'), findsOneWidget);

        await tester.tap(find.text('View All Notifications'));
        await tester.pumpAndSettle();

        expect(viewAllTapped, isTrue);
      });

      testWidgets('hides View All when onViewAll not provided', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Test', 'type': 'info', 'is_read': false},
            ],
            onViewAll: null,
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('View All Notifications'), findsNothing);
      });
    });

    group('Timestamp Formatting', () {
      testWidgets('shows "Just now" for recent notifications', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {
                'id': 1,
                'title': 'Recent',
                'type': 'info',
                'is_read': false,
                'created_at': DateTime.now().toIso8601String(),
              },
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('Just now'), findsOneWidget);
      });

      testWidgets('shows hours ago for older notifications', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {
                'id': 1,
                'title': 'Older',
                'type': 'info',
                'is_read': false,
                'created_at': DateTime.now()
                    .subtract(const Duration(hours: 2))
                    .toIso8601String(),
              },
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('2h ago'), findsOneWidget);
      });

      testWidgets('shows days ago for old notifications', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {
                'id': 1,
                'title': 'Old',
                'type': 'info',
                'is_read': false,
                'created_at': DateTime.now()
                    .subtract(const Duration(days: 3))
                    .toIso8601String(),
              },
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('3d ago'), findsOneWidget);
      });
    });

    group('Header', () {
      testWidgets('shows Notifications header when items exist', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'title': 'Test', 'type': 'info', 'is_read': false},
            ],
          ),
        );

        await tester.tap(find.byIcon(Icons.notifications_outlined));
        await tester.pumpAndSettle();

        expect(find.text('Notifications'), findsOneWidget);
      });
    });

    group('Derived unread count', () {
      testWidgets('correctly counts only unread notifications', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1, 'is_read': false},
              {'id': 2, 'is_read': false},
              {'id': 3, 'is_read': true},
              {'id': 4, 'is_read': true},
              {'id': 5, 'is_read': false},
            ],
          ),
        );

        // 3 unread out of 5 total
        expect(find.text('3'), findsOneWidget);
      });

      testWidgets('handles missing is_read field as unread', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            notifications: [
              {'id': 1}, // No is_read field - should count as unread
              {'id': 2, 'is_read': true},
            ],
          ),
        );

        // 1 unread (missing field counts as unread)
        expect(find.text('1'), findsOneWidget);
      });
    });
  });
}
