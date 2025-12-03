/// AppTitle Atom Tests
///
/// Tests for AppTitle branding component
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('AppTitle Atom Tests', () {
    testWidgets('renders app title', (tester) async {
      await pumpTestWidget(tester, const AppTitle(title: 'Tross'));

      expect(find.byType(AppTitle), findsOneWidget);
      expect(find.byType(Text), findsOneWidget);
    });

    testWidgets('displays provided title text', (tester) async {
      await pumpTestWidget(tester, const AppTitle(title: 'Tross'));

      expect(find.text('Tross'), findsOneWidget);
    });

    testWidgets('renders with subtitle when provided', (tester) async {
      await pumpTestWidget(
        tester,
        const AppTitle(title: 'Tross', subtitle: 'Work Order Management'),
      );

      expect(find.text('Tross'), findsOneWidget);
      expect(find.text('Work Order Management'), findsOneWidget);
    });
  });
}
