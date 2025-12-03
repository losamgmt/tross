/// AppLogo Atom Tests
///
/// Tests for AppLogo branding component
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('AppLogo Atom Tests', () {
    testWidgets('renders without error', (tester) async {
      await pumpTestWidget(tester, const AppLogo());

      expect(find.byType(AppLogo), findsOneWidget);
    });

    testWidgets('displays icon or image', (tester) async {
      await pumpTestWidget(tester, const AppLogo());

      // Should have either an Icon or Image widget
      final hasIcon = find.byType(Icon).evaluate().isNotEmpty;
      final hasImage = find.byType(Image).evaluate().isNotEmpty;

      expect(
        hasIcon || hasImage,
        true,
        reason: 'Logo should render icon or image',
      );
    });
  });
}
