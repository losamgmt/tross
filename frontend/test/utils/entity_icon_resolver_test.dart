/// EntityIconResolver Tests
///
/// Tests for the pure static icon resolution utility.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/entity_icon_resolver.dart';

void main() {
  group('EntityIconResolver', () {
    group('fromString', () {
      test('resolves dashboard icon', () {
        expect(EntityIconResolver.fromString('dashboard'), Icons.dashboard);
      });

      test('resolves outlined icons', () {
        expect(
          EntityIconResolver.fromString('dashboard_outlined'),
          Icons.dashboard_outlined,
        );
      });

      test('resolves settings icon', () {
        expect(EntityIconResolver.fromString('settings'), Icons.settings);
      });

      test('resolves people icons', () {
        expect(EntityIconResolver.fromString('people'), Icons.people);
        expect(
          EntityIconResolver.fromString('people_outlined'),
          Icons.people_outlined,
        );
      });

      test('resolves admin icons', () {
        expect(
          EntityIconResolver.fromString('admin_panel_settings'),
          Icons.admin_panel_settings,
        );
        expect(
          EntityIconResolver.fromString('admin_panel_settings_outlined'),
          Icons.admin_panel_settings_outlined,
        );
      });

      test('returns null for null input', () {
        expect(EntityIconResolver.fromString(null), isNull);
      });

      test('returns null for empty string', () {
        expect(EntityIconResolver.fromString(''), isNull);
      });

      test('returns null for unknown icon', () {
        expect(EntityIconResolver.fromString('nonexistent_icon'), isNull);
      });

      test('resolves business icons', () {
        expect(EntityIconResolver.fromString('business'), Icons.business);
        expect(
          EntityIconResolver.fromString('business_outlined'),
          Icons.business_outlined,
        );
      });

      test('resolves document icons', () {
        expect(EntityIconResolver.fromString('description'), Icons.description);
        expect(EntityIconResolver.fromString('assignment'), Icons.assignment);
        expect(
          EntityIconResolver.fromString('receipt_long'),
          Icons.receipt_long,
        );
      });

      test('resolves inventory icons', () {
        expect(EntityIconResolver.fromString('inventory'), Icons.inventory);
        expect(EntityIconResolver.fromString('inventory_2'), Icons.inventory_2);
        expect(
          EntityIconResolver.fromString('shopping_bag'),
          Icons.shopping_bag,
        );
      });
    });

    group('getIcon', () {
      test('uses metadataIcon when provided', () {
        final icon = EntityIconResolver.getIcon(
          'unknown_entity',
          metadataIcon: 'settings',
        );
        expect(icon, Icons.settings);
      });

      test('falls back to pattern matching when metadataIcon is null', () {
        final icon = EntityIconResolver.getIcon('user_management');
        expect(icon, Icons.person_outlined);
      });

      test('falls back to pattern when metadataIcon is invalid', () {
        final icon = EntityIconResolver.getIcon(
          'user',
          metadataIcon: 'invalid_icon_name',
        );
        expect(icon, Icons.person_outlined);
      });
    });

    group('getStaticIcon', () {
      test('returns dashboard icon', () {
        expect(
          EntityIconResolver.getStaticIcon('dashboard'),
          Icons.dashboard_outlined,
        );
      });

      test('returns admin panel icon', () {
        expect(
          EntityIconResolver.getStaticIcon('admin_panel'),
          Icons.admin_panel_settings_outlined,
        );
      });

      test('returns settings icon', () {
        expect(
          EntityIconResolver.getStaticIcon('settings'),
          Icons.settings_outlined,
        );
      });

      test('returns folder for unknown', () {
        expect(
          EntityIconResolver.getStaticIcon('unknown'),
          Icons.folder_outlined,
        );
      });
    });

    group('Pattern matching (getIcon fallback)', () {
      test('user patterns return person icon', () {
        expect(EntityIconResolver.getIcon('user'), Icons.person_outlined);
        expect(EntityIconResolver.getIcon('person'), Icons.person_outlined);
        expect(
          EntityIconResolver.getIcon('user_account'),
          Icons.person_outlined,
        );
      });

      test('role patterns return security icon', () {
        expect(EntityIconResolver.getIcon('role'), Icons.security_outlined);
        expect(
          EntityIconResolver.getIcon('permission'),
          Icons.security_outlined,
        );
      });

      test('customer patterns return business icon', () {
        expect(EntityIconResolver.getIcon('customer'), Icons.business_outlined);
        expect(EntityIconResolver.getIcon('client'), Icons.business_outlined);
      });

      test('technician patterns return engineering icon', () {
        expect(
          EntityIconResolver.getIcon('technician'),
          Icons.engineering_outlined,
        );
        expect(
          EntityIconResolver.getIcon('worker'),
          Icons.engineering_outlined,
        );
      });

      test('work order patterns return assignment icon', () {
        expect(
          EntityIconResolver.getIcon('work_order'),
          Icons.assignment_outlined,
        );
        expect(EntityIconResolver.getIcon('order'), Icons.assignment_outlined);
        expect(EntityIconResolver.getIcon('job'), Icons.assignment_outlined);
      });

      test('contract patterns return description icon', () {
        expect(
          EntityIconResolver.getIcon('contract'),
          Icons.description_outlined,
        );
        expect(
          EntityIconResolver.getIcon('agreement'),
          Icons.description_outlined,
        );
      });

      test('invoice patterns return receipt icon', () {
        expect(
          EntityIconResolver.getIcon('invoice'),
          Icons.receipt_long_outlined,
        );
        expect(EntityIconResolver.getIcon('bill'), Icons.receipt_long_outlined);
      });

      test('inventory patterns return inventory icon', () {
        expect(
          EntityIconResolver.getIcon('inventory'),
          Icons.inventory_2_outlined,
        );
        expect(EntityIconResolver.getIcon('stock'), Icons.inventory_2_outlined);
      });

      test('product patterns return shopping bag icon', () {
        expect(
          EntityIconResolver.getIcon('product'),
          Icons.shopping_bag_outlined,
        );
        expect(EntityIconResolver.getIcon('item'), Icons.shopping_bag_outlined);
      });

      test('settings patterns return settings icon', () {
        expect(EntityIconResolver.getIcon('setting'), Icons.settings_outlined);
        expect(EntityIconResolver.getIcon('config'), Icons.settings_outlined);
      });

      test('unknown patterns return folder icon', () {
        expect(EntityIconResolver.getIcon('xyz123'), Icons.folder_outlined);
      });
    });
  });
}
