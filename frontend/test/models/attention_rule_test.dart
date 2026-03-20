import 'package:flutter_test/flutter_test.dart';
import 'package:tross/models/attention_rule.dart';

void main() {
  group('AttentionRules', () {
    group('_isOverdue (timezone-aware)', () {
      test('work order in future (UTC) is NOT overdue when now is local', () {
        // Simulate: Work order scheduled for 4 PM local time (which is 11 PM UTC)
        // Current local time: 12 PM (which is 7 PM UTC)
        // The work order should NOT be overdue

        final nowLocal = DateTime(2026, 3, 19, 12, 0); // 12 PM local
        final workOrder = <String, dynamic>{
          'status': 'scheduled',
          'scheduled_start': '2026-03-19T23:00:00.000Z', // 4 PM local (in PT)
          'scheduled_end': '2026-03-20T00:00:00.000Z', // 5 PM local (in PT)
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
        );

        // Should NOT have overdue violation
        expect(
          violations.any((r) => r.label == 'Overdue'),
          isFalse,
          reason: 'Work order scheduled for future should not be overdue',
        );
      });

      test('work order in past (UTC) IS overdue when now is local', () {
        // Simulate: Work order was scheduled for yesterday
        // Current time: today
        // The work order SHOULD be overdue

        final nowLocal = DateTime(2026, 3, 19, 12, 0); // Today 12 PM
        final workOrder = <String, dynamic>{
          'status': 'scheduled',
          'scheduled_start': '2026-03-18T10:00:00.000Z', // Yesterday
          'scheduled_end': '2026-03-18T12:00:00.000Z', // Yesterday
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
        );

        expect(
          violations.any((r) => r.label == 'Overdue'),
          isTrue,
          reason: 'Work order scheduled for past should be overdue',
        );
      });

      test('completed work order is never overdue', () {
        final nowLocal = DateTime(2026, 3, 19, 12, 0);
        final workOrder = <String, dynamic>{
          'status': 'completed',
          'scheduled_start': '2026-03-18T10:00:00.000Z',
          'scheduled_end': '2026-03-18T12:00:00.000Z',
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
        );

        expect(violations.any((r) => r.label == 'Overdue'), isFalse);
      });

      test('handles UTC DateTime objects correctly', () {
        final nowUtc = DateTime.utc(2026, 3, 19, 19, 0); // 7 PM UTC
        final workOrder = <String, dynamic>{
          'status': 'scheduled',
          'scheduled_start': DateTime.utc(2026, 3, 19, 23, 0), // 11 PM UTC
          'scheduled_end': DateTime.utc(2026, 3, 20, 0, 0), // midnight UTC
        };

        final violations = AttentionRules.getViolations(workOrder, now: nowUtc);

        expect(
          violations.any((r) => r.label == 'Overdue'),
          isFalse,
          reason: 'Future UTC datetime should not be overdue',
        );
      });
    });

    group('_isUnassigned', () {
      test('scheduled without technician is unassigned', () {
        final workOrder = <String, dynamic>{
          'scheduled_start': '2026-03-19T23:00:00.000Z',
          'assigned_technician_id': null,
        };

        final violations = AttentionRules.getViolations(workOrder);

        expect(violations.any((r) => r.label == 'Unassigned'), isTrue);
      });

      test('scheduled with technician is NOT unassigned', () {
        final workOrder = <String, dynamic>{
          'scheduled_start': '2026-03-19T23:00:00.000Z',
          'assigned_technician_id': 1,
        };

        final violations = AttentionRules.getViolations(workOrder);

        expect(violations.any((r) => r.label == 'Unassigned'), isFalse);
      });

      test('unscheduled is NOT flagged as unassigned', () {
        final workOrder = <String, dynamic>{
          'scheduled_start': null,
          'assigned_technician_id': null,
        };

        final violations = AttentionRules.getViolations(workOrder);

        expect(violations.any((r) => r.label == 'Unassigned'), isFalse);
      });
    });

    group('_isStalePending (timezone-aware)', () {
      test('recent pending is NOT stale', () {
        final nowLocal = DateTime(2026, 3, 19, 12, 0);
        final workOrder = <String, dynamic>{
          'status': 'pending',
          'created_at': '2026-03-19T10:00:00.000Z', // 2 hours ago
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
          stalePendingHours: 48,
        );

        expect(violations.any((r) => r.label == 'Stale'), isFalse);
      });

      test('old pending IS stale', () {
        final nowLocal = DateTime(2026, 3, 19, 12, 0);
        final workOrder = <String, dynamic>{
          'status': 'pending',
          'created_at': '2026-03-15T10:00:00.000Z', // 4+ days ago
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
          stalePendingHours: 48,
        );

        expect(violations.any((r) => r.label == 'Stale'), isTrue);
      });

      test('non-pending status is never stale', () {
        final nowLocal = DateTime(2026, 3, 19, 12, 0);
        final workOrder = <String, dynamic>{
          'status': 'scheduled',
          'created_at': '2026-03-15T10:00:00.000Z', // Old
        };

        final violations = AttentionRules.getViolations(
          workOrder,
          now: nowLocal,
          stalePendingHours: 48,
        );

        expect(violations.any((r) => r.label == 'Stale'), isFalse);
      });
    });

    group('AttentionItem', () {
      test('primaryViolation returns highest priority', () {
        // Create work order that violates multiple rules
        final nowLocal = DateTime(2026, 3, 19, 12, 0);
        final workOrder = <String, dynamic>{
          'id': 1,
          'work_order_number': 'WO-2026-0001',
          'status': 'scheduled', // Not pending, so no stale
          'scheduled_start': '2026-03-18T10:00:00.000Z', // Past - overdue
          'scheduled_end': '2026-03-18T12:00:00.000Z', // Past - overdue
          'assigned_technician_id': null, // Unassigned
        };

        final item = AttentionRules.evaluate(workOrder, now: nowLocal);

        expect(item, isNotNull);
        expect(item!.violations.length, 2); // Overdue + Unassigned
        expect(item.primaryViolation?.label, 'Overdue'); // Priority 1
      });
    });
  });
}
