/// UserAvatar Atom Tests
///
/// Tests for UserAvatar component
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/avatars/user_avatar.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('UserAvatar Atom Tests', () {
    testWidgets('renders with name', (tester) async {
      await pumpTestWidget(tester, const UserAvatar(name: 'John Doe'));

      expect(find.byType(UserAvatar), findsOneWidget);
      expect(find.byType(CircleAvatar), findsOneWidget);
    });

    testWidgets('displays first letters of name', (tester) async {
      await pumpTestWidget(tester, const UserAvatar(name: 'Alice Smith'));

      // Should show "AS" initials
      expect(find.text('AS'), findsOneWidget);
    });

    testWidgets('handles single name', (tester) async {
      await pumpTestWidget(tester, const UserAvatar(name: 'Admin'));

      // Should show "A" initial
      expect(find.text('A'), findsOneWidget);
    });

    testWidgets('handles empty name gracefully', (tester) async {
      await pumpTestWidget(tester, const UserAvatar(name: ''));

      expect(find.byType(UserAvatar), findsOneWidget);
    });
  });
}
