/// AuditLogEntry.userDisplayName — prefers the canonical server `user_name` (UDN).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/models/audit_log_entry.dart';

void main() {
  Map<String, dynamic> base(Map<String, dynamic> extra) => {
    'id': 1,
    'resource_type': 'work_order',
    'action': 'update',
    'created_at': '2026-01-01T12:00:00.000Z',
    ...extra,
  };

  group('AuditLogEntry.userDisplayName', () {
    test('prefers the canonical user_name', () {
      final e = AuditLogEntry.fromJson(
        base({
          'user_name': 'Jane Smith',
          'user_first_name': 'Jane',
          'user_last_name': 'Smith',
          'user_email': 'jane@example.com',
        }),
      );
      expect(e.userDisplayName, 'Jane Smith');
    });

    test('falls back to first + last when user_name is absent', () {
      final e = AuditLogEntry.fromJson(
        base({
          'user_first_name': 'Bob',
          'user_last_name': 'Lee',
          'user_email': 'bob@example.com',
        }),
      );
      expect(e.userDisplayName, 'Bob Lee');
    });

    test('treats an empty user_name as absent', () {
      final e = AuditLogEntry.fromJson(
        base({
          'user_name': '',
          'user_first_name': 'Ann',
          'user_last_name': 'Poe',
        }),
      );
      expect(e.userDisplayName, 'Ann Poe');
    });

    test('falls back to email when there are no name parts', () {
      final e = AuditLogEntry.fromJson(
        base({'user_id': 7, 'user_email': 'ops@example.com'}),
      );
      expect(e.userDisplayName, 'ops@example.com');
    });

    test('falls back to User #id when only an id is present', () {
      final e = AuditLogEntry.fromJson(base({'user_id': 9}));
      expect(e.userDisplayName, 'User #9');
    });

    test('returns System when there is no user', () {
      final e = AuditLogEntry.fromJson(base({}));
      expect(e.userDisplayName, 'System');
    });
  });
}
