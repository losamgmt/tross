/// AppFooter Atom Tests
///
/// Tests for AppFooter branding component
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('AppFooter Atom Tests', () {
    testWidgets('renders without error', (tester) async {
      await pumpTestWidget(
        tester,
        const AppFooter(
          copyright: '© 2025 Tross',
          description: 'Work Order Management',
        ),
      );

      expect(find.byType(AppFooter), findsOneWidget);
    });

    testWidgets('displays copyright and description', (tester) async {
      await pumpTestWidget(
        tester,
        const AppFooter(
          copyright: '© 2025 Tross',
          description: 'Work Order Management',
        ),
      );

      expect(find.text('© 2025 Tross'), findsOneWidget);
      expect(find.text('Work Order Management'), findsOneWidget);
    });
  });
}
