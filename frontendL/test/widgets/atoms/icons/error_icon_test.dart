/// ErrorIcon Atom Tests
///
/// Tests for ErrorIcon component
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/icons/error_icon.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('ErrorIcon Atom Tests', () {
    testWidgets('renders error icon', (tester) async {
      await pumpTestWidget(tester, const ErrorIcon(icon: Icons.error_outline));

      expect(find.byType(ErrorIcon), findsOneWidget);
      expect(find.byType(Icon), findsOneWidget);
    });

    testWidgets('displays provided icon', (tester) async {
      await pumpTestWidget(tester, const ErrorIcon(icon: Icons.warning));

      final icon = tester.widget<Icon>(find.byType(Icon));
      expect(icon.icon, Icons.warning);
    });

    testWidgets('uses provided size and color', (tester) async {
      await pumpTestWidget(
        tester,
        const ErrorIcon(icon: Icons.error, size: 100, color: Colors.red),
      );

      final icon = tester.widget<Icon>(find.byType(Icon));
      expect(icon.size, 100);
      expect(icon.color, Colors.red);
    });
  });
}
