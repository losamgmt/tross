/// technicianDisplayLabel — prefers the server `name`, else composes first+last (UDN).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/dashboard_content.dart';

void main() {
  group('technicianDisplayLabel', () {
    test('prefers the server name', () {
      expect(
        technicianDisplayLabel({
          'name': 'Zoe Zenith',
          'first_name': 'Zoe',
          'last_name': 'Zenith',
        }),
        'Zoe Zenith',
      );
    });

    test('composes first + last when name is absent', () {
      expect(
        technicianDisplayLabel({'first_name': 'Bob', 'last_name': 'Lee'}),
        'Bob Lee',
      );
    });

    test('treats an empty name as absent', () {
      expect(
        technicianDisplayLabel({
          'name': '',
          'first_name': 'Ann',
          'last_name': 'Poe',
        }),
        'Ann Poe',
      );
    });

    test('handles missing first/last gracefully', () {
      expect(technicianDisplayLabel(<String, dynamic>{}), '');
    });
  });
}
