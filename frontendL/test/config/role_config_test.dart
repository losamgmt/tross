/// Tests for RoleConfig - Centralized role badge configuration
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/role_config.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

void main() {
  group('RoleConfig', () {
    group('getBadgeConfig', () {
      test('returns correct config for admin role', () {
        final config = RoleConfig.getBadgeConfig('admin');

        expect(config.$1, BadgeStyle.admin);
        expect(config.$2, Icons.admin_panel_settings);
      });

      test('returns correct config for technician role', () {
        final config = RoleConfig.getBadgeConfig('technician');

        expect(config.$1, BadgeStyle.technician);
        expect(config.$2, Icons.build);
      });

      test('is case-insensitive', () {
        final lower = RoleConfig.getBadgeConfig('admin');
        final upper = RoleConfig.getBadgeConfig('ADMIN');
        final mixed = RoleConfig.getBadgeConfig('Admin');

        expect(lower, equals(upper));
        expect(lower, equals(mixed));
      });

      test('returns default config for unknown role', () {
        final config = RoleConfig.getBadgeConfig('unknown_role');

        expect(config.$1, BadgeStyle.neutral);
        expect(config.$2, Icons.help_outline);
      });
    });

    group('allRoles', () {
      test('returns all valid role names', () {
        final roles = RoleConfig.allRoles;

        expect(roles, contains('admin'));
        expect(roles, contains('technician'));
        expect(roles, contains('manager'));
        expect(roles, contains('dispatcher'));
        expect(roles, contains('client'));
        expect(roles.length, 5);
      });
    });

    group('isValidRole', () {
      test('returns true for valid roles', () {
        expect(RoleConfig.isValidRole('admin'), isTrue);
        expect(RoleConfig.isValidRole('technician'), isTrue);
      });

      test('is case-insensitive', () {
        expect(RoleConfig.isValidRole('ADMIN'), isTrue);
        expect(RoleConfig.isValidRole('Admin'), isTrue);
      });

      test('returns false for invalid roles', () {
        expect(RoleConfig.isValidRole('invalid'), isFalse);
        expect(RoleConfig.isValidRole(''), isFalse);
      });
    });
  });
}
