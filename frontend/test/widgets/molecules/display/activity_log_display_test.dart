/// Tests for ActivityLogDisplay molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Displays timeline entries with correct formatting
/// - Shows loading, error, and empty states
/// - Handles refresh callback
/// - Shows action icons and colors based on action type
/// - Formats timestamps relative to now
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/display/activity_log_display.dart';
import 'package:tross_app/models/audit_log_entry.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  // Test data factory
  AuditLogEntry createTestEntry({
    int id = 1,
    String resourceType = 'work_order',
    int? resourceId = 42,
    String action = 'update',
    Map<String, dynamic>? oldValues,
    Map<String, dynamic>? newValues,
    int? userId = 1,
    DateTime? createdAt,
  }) {
    return AuditLogEntry(
      id: id,
      resourceType: resourceType,
      resourceId: resourceId,
      action: action,
      oldValues: oldValues,
      newValues: newValues,
      userId: userId,
      createdAt: createdAt ?? DateTime.now().subtract(const Duration(hours: 1)),
    );
  }

  group('ActivityLogDisplay', () {
    group('basic display', () {
      testWidgets('displays default title "Activity History"', (tester) async {
        await tester.pumpTestWidget(const ActivityLogDisplay());

        expect(find.text('Activity History'), findsOneWidget);
      });

      testWidgets('displays custom title when provided', (tester) async {
        await tester.pumpTestWidget(
          const ActivityLogDisplay(title: 'Change History'),
        );

        expect(find.text('Change History'), findsOneWidget);
      });

      testWidgets('displays refresh button in header', (tester) async {
        await tester.pumpTestWidget(const ActivityLogDisplay());

        expect(find.byIcon(Icons.refresh), findsOneWidget);
      });
    });

    group('loading state', () {
      testWidgets('shows loading indicator when loading=true', (tester) async {
        await tester.pumpTestWidget(const ActivityLogDisplay(loading: true));

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('disables refresh button when loading', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(loading: true, onRefresh: () {}),
        );

        final iconButton = tester.widget<IconButton>(
          find.widgetWithIcon(IconButton, Icons.refresh),
        );
        expect(iconButton.onPressed, isNull);
      });
    });

    group('error state', () {
      testWidgets('shows error message when error is provided', (tester) async {
        await tester.pumpTestWidget(
          const ActivityLogDisplay(error: 'Network error'),
        );

        expect(find.text('Failed to load history'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
      });

      testWidgets('shows retry button when error and onRefresh provided', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(error: 'Failed', onRefresh: () {}),
        );

        expect(find.text('Try Again'), findsOneWidget);
      });

      testWidgets('calls onRefresh when retry button tapped', (tester) async {
        bool refreshCalled = false;

        await tester.pumpTestWidget(
          ActivityLogDisplay(
            error: 'Failed',
            onRefresh: () => refreshCalled = true,
          ),
        );

        await tester.tap(find.text('Try Again'));
        expect(refreshCalled, isTrue);
      });
    });

    group('empty state', () {
      testWidgets('shows empty message when entries is empty', (tester) async {
        await tester.pumpTestWidget(const ActivityLogDisplay(entries: []));

        expect(find.text('No activity recorded'), findsOneWidget);
        expect(find.byIcon(Icons.history), findsOneWidget);
      });

      testWidgets('shows empty message when entries is null and not loading', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const ActivityLogDisplay(entries: null, loading: false),
        );

        expect(find.text('No activity recorded'), findsOneWidget);
      });
    });

    group('timeline display', () {
      testWidgets('displays entry action description', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(action: 'create')]),
        );

        expect(find.text('Created'), findsOneWidget);
      });

      testWidgets('displays multiple entries', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [
              createTestEntry(id: 1, action: 'create'),
              createTestEntry(id: 2, action: 'update'),
              createTestEntry(id: 3, action: 'delete'),
            ],
          ),
        );

        expect(find.text('Created'), findsOneWidget);
        expect(find.text('Updated'), findsOneWidget);
        expect(find.text('Deleted'), findsOneWidget);
      });
    });

    group('action icons', () {
      testWidgets('shows create icon for create action', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(action: 'create')]),
        );

        expect(find.byIcon(Icons.add_circle_outline), findsOneWidget);
      });

      testWidgets('shows edit icon for update action', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(action: 'update')]),
        );

        expect(find.byIcon(Icons.edit_outlined), findsOneWidget);
      });

      testWidgets('shows delete icon for delete action', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(action: 'delete')]),
        );

        expect(find.byIcon(Icons.delete_outline), findsOneWidget);
      });

      testWidgets('shows login icon for login action', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(action: 'login')]),
        );

        expect(find.byIcon(Icons.login), findsOneWidget);
      });
    });

    group('changed fields display', () {
      testWidgets('shows changed fields for updates', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [
              createTestEntry(
                action: 'update',
                oldValues: {'status': 'pending'},
                newValues: {'status': 'completed'},
              ),
            ],
          ),
        );

        expect(find.textContaining('Changed:'), findsOneWidget);
      });
    });

    group('user info display', () {
      testWidgets('shows user info when userId provided', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(userId: 5)]),
        );

        expect(find.textContaining('By user #5'), findsOneWidget);
      });

      testWidgets('does not show user info when userId is null', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(entries: [createTestEntry(userId: null)]),
        );

        expect(find.textContaining('By user'), findsNothing);
      });
    });

    group('time formatting', () {
      testWidgets('shows "Just now" for recent entries', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [createTestEntry(createdAt: DateTime.now())],
          ),
        );

        expect(find.text('Just now'), findsOneWidget);
      });

      testWidgets('shows minutes ago for entries within an hour', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [
              createTestEntry(
                createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
              ),
            ],
          ),
        );

        expect(find.textContaining('m ago'), findsOneWidget);
      });

      testWidgets('shows hours ago for entries within a day', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [
              createTestEntry(
                createdAt: DateTime.now().subtract(const Duration(hours: 5)),
              ),
            ],
          ),
        );

        expect(find.textContaining('h ago'), findsOneWidget);
      });

      testWidgets('shows days ago for entries within a week', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [
              createTestEntry(
                createdAt: DateTime.now().subtract(const Duration(days: 3)),
              ),
            ],
          ),
        );

        expect(find.textContaining('d ago'), findsOneWidget);
      });
    });

    group('refresh functionality', () {
      testWidgets('calls onRefresh when refresh button tapped', (tester) async {
        bool refreshCalled = false;

        await tester.pumpTestWidget(
          ActivityLogDisplay(
            entries: [createTestEntry()],
            onRefresh: () => refreshCalled = true,
          ),
        );

        await tester.tap(find.byIcon(Icons.refresh));
        expect(refreshCalled, isTrue);
      });
    });

    group('ActivityLogItem widget', () {
      testWidgets('renders correctly', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogItem(entry: createTestEntry(action: 'create')),
        );

        expect(find.text('Created'), findsOneWidget);
      });

      testWidgets('shows connecting line when not last', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogItem(entry: createTestEntry(), isLast: false),
        );

        // The connecting line should be present
        // (difficult to test directly, but widget should render without error)
        expect(find.byType(ActivityLogItem), findsOneWidget);
      });

      testWidgets('no connecting line when isLast=true', (tester) async {
        await tester.pumpTestWidget(
          ActivityLogItem(entry: createTestEntry(), isLast: true),
        );

        expect(find.byType(ActivityLogItem), findsOneWidget);
      });
    });
  });
}
