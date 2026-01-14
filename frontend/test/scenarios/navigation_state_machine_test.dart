/// Navigation State Machine Tests (Strategy 8)
///
/// Mass-gain pattern: Test navigation/shell components through
/// state transitions and viewport combinations.
///
/// Coverage targets:
/// - NavMenuBuilder (190 uncovered lines)
/// - NavMenuItem model patterns
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/navigation/nav_menu_item.dart';
import 'package:tross_app/services/nav_menu_builder.dart';

void main() {
  group('Strategy 8: Navigation State Machine Tests', () {
    group('NavMenuItem', () {
      test('basic construction', () {
        const item = NavMenuItem(
          id: 'test',
          label: 'Test',
          icon: Icons.home,
          route: '/test',
        );

        expect(item.id, 'test');
        expect(item.label, 'Test');
        expect(item.route, '/test');
        expect(item.requiresAuth, true); // default
      });

      test('isVisibleFor with requiresAuth=true', () {
        const item = NavMenuItem(
          id: 'protected',
          label: 'Protected',
          icon: Icons.lock,
          route: '/protected',
          requiresAuth: true,
        );

        expect(item.isVisibleFor(null), false);
        expect(item.isVisibleFor({'role': 'user'}), true);
      });

      test('isVisibleFor with requiresAuth=false', () {
        const item = NavMenuItem(
          id: 'public',
          label: 'Public',
          icon: Icons.public,
          route: '/public',
          requiresAuth: false,
        );

        expect(item.isVisibleFor(null), true);
        expect(item.isVisibleFor({'role': 'user'}), true);
      });

      test('isVisibleFor with visibleWhen callback', () {
        final item = NavMenuItem(
          id: 'admin',
          label: 'Admin',
          icon: Icons.admin_panel_settings,
          route: '/admin',
          visibleWhen: (user) => user?['role'] == 'admin',
        );

        expect(item.isVisibleFor(null), false);
        expect(item.isVisibleFor({'role': 'user'}), false);
        expect(item.isVisibleFor({'role': 'admin'}), true);
      });

      test('divider factory creates divider item', () {
        final divider = NavMenuItem.divider();
        expect(divider.isDivider, true);
        expect(divider.label, '');
      });

      test('section factory creates section header', () {
        final section = NavMenuItem.section(
          id: 'section1',
          label: 'Section 1',
          icon: Icons.folder,
        );

        expect(section.isSectionHeader, true);
        expect(section.label, 'Section 1');
      });

      test('requiresAdmin visibility check', () {
        const item = NavMenuItem(
          id: 'admin-only',
          label: 'Admin Only',
          icon: Icons.admin_panel_settings,
          route: '/admin',
          requiresAdmin: true,
        );

        expect(item.isVisibleFor(null), false);
        expect(item.isVisibleFor({'role': 'user'}), false);
        expect(item.isVisibleFor({'role': 'admin'}), true);
      });
    });

    group('NavMenuBuilder - filterForUser', () {
      test('filters out items user cannot see', () {
        final items = [
          NavMenuItem(
            id: 'admin',
            label: 'Admin',
            icon: Icons.admin_panel_settings,
            route: '/admin',
            visibleWhen: (user) => user?['role'] == 'admin',
          ),
          const NavMenuItem(
            id: 'home',
            label: 'Home',
            icon: Icons.home,
            route: '/home',
          ),
        ];

        final filtered = NavMenuBuilder.filterForUser(items, {
          'role': 'viewer',
        });
        expect(filtered.length, 1);
        expect(filtered.first.id, 'home');
      });

      test('includes all items for admin', () {
        final items = [
          NavMenuItem(
            id: 'admin',
            label: 'Admin',
            icon: Icons.admin_panel_settings,
            route: '/admin',
            visibleWhen: (user) => user?['role'] == 'admin',
          ),
          const NavMenuItem(
            id: 'home',
            label: 'Home',
            icon: Icons.home,
            route: '/home',
          ),
        ];

        final filtered = NavMenuBuilder.filterForUser(items, {'role': 'admin'});
        expect(filtered.length, 2);
      });

      test('returns empty for null user with protected items', () {
        const items = [
          NavMenuItem(
            id: 'protected',
            label: 'Protected',
            icon: Icons.lock,
            route: '/protected',
            requiresAuth: true,
          ),
        ];

        final filtered = NavMenuBuilder.filterForUser(items, null);
        expect(filtered, isEmpty);
      });

      test('returns public items for null user', () {
        const items = [
          NavMenuItem(
            id: 'public',
            label: 'Public',
            icon: Icons.public,
            route: '/public',
            requiresAuth: false,
          ),
        ];

        final filtered = NavMenuBuilder.filterForUser(items, null);
        expect(filtered.length, 1);
      });
    });

    group('NavMenuBuilder - buildSidebarItems', () {
      test('returns non-empty list', () {
        final items = NavMenuBuilder.buildSidebarItems();
        expect(items, isNotEmpty);
      });

      test('contains dashboard or home', () {
        final items = NavMenuBuilder.buildSidebarItems();
        final hasHomeOrDashboard = items.any(
          (i) => i.id == 'home' || i.id == 'dashboard',
        );
        expect(hasHomeOrDashboard, true);
      });
    });

    group('NavMenuBuilder - buildUserMenuItems', () {
      test('returns non-empty list', () {
        final items = NavMenuBuilder.buildUserMenuItems();
        expect(items, isNotEmpty);
      });

      test('contains settings', () {
        final items = NavMenuBuilder.buildUserMenuItems();
        final hasSettings = items.any((i) => i.id == 'settings');
        expect(hasSettings, true);
      });
    });
  });
}
