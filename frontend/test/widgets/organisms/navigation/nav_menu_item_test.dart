/// Tests for NavMenuItem data model
///
/// **BEHAVIORAL FOCUS:**
/// - Constructors and factory methods
/// - Visibility rules (requiresAuth, requiresAdmin, visibleWhen)
/// - Divider and section header factories
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/navigation/nav_menu_item.dart';

void main() {
  group('NavMenuItem', () {
    group('constructors', () {
      test('creates item with required fields', () {
        final item = NavMenuItem(id: 'test', label: 'Test Label');

        expect(item.id, 'test');
        expect(item.label, 'Test Label');
        expect(item.isDivider, isFalse);
        expect(item.isSectionHeader, isFalse);
      });

      test('creates item with icon and route', () {
        final item = NavMenuItem(
          id: 'settings',
          label: 'Settings',
          icon: Icons.settings,
          route: '/settings',
        );

        expect(item.icon, Icons.settings);
        expect(item.route, '/settings');
      });

      test('defaults requiresAuth to true', () {
        final item = NavMenuItem(id: 'test', label: 'Test');
        expect(item.requiresAuth, isTrue);
      });

      test('allows requiresAuth to be false', () {
        final item = NavMenuItem(
          id: 'public',
          label: 'Public',
          requiresAuth: false,
        );
        expect(item.requiresAuth, isFalse);
      });
    });

    group('factory methods', () {
      test('divider creates divider item', () {
        final divider = NavMenuItem.divider();

        expect(divider.isDivider, isTrue);
        expect(divider.id, 'divider');
      });

      test('divider accepts custom id', () {
        final divider = NavMenuItem.divider(id: 'custom-divider');
        expect(divider.id, 'custom-divider');
      });

      test('section creates section header', () {
        final section = NavMenuItem.section(
          id: 'admin',
          label: 'Admin Section',
        );

        expect(section.isSectionHeader, isTrue);
        expect(section.label, 'Admin Section');
        expect(section.id, 'admin');
      });
    });

    group('visibility rules', () {
      test('isVisibleFor hides auth items when user is null', () {
        final authItem = NavMenuItem(
          id: 'private',
          label: 'Private',
          requiresAuth: true,
        );

        expect(authItem.isVisibleFor(null), isFalse);
      });

      test('isVisibleFor shows public items when user is null', () {
        final publicItem = NavMenuItem(
          id: 'public',
          label: 'Public',
          requiresAuth: false,
        );

        expect(publicItem.isVisibleFor(null), isTrue);
      });

      test('isVisibleFor shows auth items when user is provided', () {
        final item = NavMenuItem(
          id: 'private',
          label: 'Private',
          requiresAuth: true,
        );

        expect(item.isVisibleFor({'id': 'user123'}), isTrue);
      });

      test('isVisibleFor hides admin items from non-admins', () {
        final adminItem = NavMenuItem(
          id: 'admin',
          label: 'Admin Panel',
          requiresAdmin: true,
        );

        expect(adminItem.isVisibleFor(null), isFalse);
        expect(adminItem.isVisibleFor({'role': 'user'}), isFalse);
      });

      test('isVisibleFor shows admin items to admins', () {
        final adminItem = NavMenuItem(
          id: 'admin',
          label: 'Admin Panel',
          requiresAdmin: true,
        );

        expect(adminItem.isVisibleFor({'role': 'admin'}), isTrue);
      });

      test('isVisibleFor respects custom visibleWhen function', () {
        final item = NavMenuItem(
          id: 'premium',
          label: 'Premium Feature',
          visibleWhen: (user) => user?['premium'] == true,
        );

        expect(item.isVisibleFor(null), isFalse);
        expect(item.isVisibleFor({'premium': false}), isFalse);
        expect(item.isVisibleFor({'premium': true}), isTrue);
      });

      test('visibleWhen takes precedence over requiresAuth', () {
        final item = NavMenuItem(
          id: 'custom',
          label: 'Custom',
          requiresAuth: true,
          visibleWhen: (user) => true, // Always visible
        );

        expect(item.isVisibleFor(null), isTrue);
      });
    });
  });
}
