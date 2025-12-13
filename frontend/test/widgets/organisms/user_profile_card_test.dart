/// Tests for UserProfileCard organism
///
/// **BEHAVIORAL FOCUS:**
/// - Displays user profile information correctly
/// - Shows error state with retry button
/// - Shows welcome message when enabled
/// - Uses proper molecules (UserAvatar, ErrorCard)
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/user_profile_card.dart';
import 'package:tross_app/widgets/molecules/user_avatar.dart';
import 'package:tross_app/widgets/molecules/cards/error_card.dart';

import '../../helpers/test_helpers.dart';

void main() {
  group('UserProfileCard', () {
    group('profile display', () {
      testWidgets('renders in a Card', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {'first_name': 'John', 'last_name': 'Doe'},
          ),
        );

        expect(find.byType(Card), findsOneWidget);
      });

      testWidgets('displays user first and last name', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Jane',
              'last_name': 'Smith',
              'email': 'jane@test.com',
            },
          ),
        );

        // Name appears in header and in profile field
        expect(find.textContaining('Jane Smith'), findsWidgets);
      });

      testWidgets('displays user email', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'User',
              'last_name': 'Test',
              'email': 'user@example.com',
            },
          ),
        );

        expect(find.text('user@example.com'), findsWidgets);
      });

      testWidgets('displays user role uppercased', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Admin',
              'last_name': 'User',
              'email': 'admin@test.com',
              'role': 'administrator',
            },
          ),
        );

        expect(find.text('ADMINISTRATOR'), findsOneWidget);
      });

      testWidgets('uses UserAvatar molecule', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Avatar',
              'last_name': 'Test',
              'email': 'avatar@test.com',
            },
          ),
        );

        expect(find.byType(UserAvatar), findsOneWidget);
      });

      testWidgets('shows default "User" name when names are empty', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(userProfile: {'email': 'no-name@test.com'}),
        );

        expect(find.textContaining('User'), findsWidgets);
      });

      testWidgets('shows default "No email" when email missing', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(userProfile: {'first_name': 'Test'}),
        );

        expect(find.text('No email'), findsWidgets);
      });

      testWidgets('shows default "User" role when role missing', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {'first_name': 'Test', 'email': 'test@test.com'},
          ),
        );

        expect(find.text('USER'), findsOneWidget);
      });
    });

    group('welcome message', () {
      testWidgets('shows welcome message when showWelcome is true', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Welcome',
              'last_name': 'User',
              'email': 'welcome@test.com',
            },
            showWelcome: true,
          ),
        );

        expect(find.textContaining('Welcome,'), findsOneWidget);
      });

      testWidgets('does not show welcome message by default', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Normal',
              'last_name': 'User',
              'email': 'normal@test.com',
            },
          ),
        );

        expect(find.textContaining('Welcome,'), findsNothing);
      });
    });

    group('error state', () {
      testWidgets('shows ErrorCard when error provided', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(error: 'Failed to load profile'),
        );

        expect(find.byType(ErrorCard), findsOneWidget);
      });

      testWidgets('displays error message', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(error: 'Network connection failed'),
        );

        expect(find.text('Network connection failed'), findsOneWidget);
      });

      testWidgets('shows Profile Error title on error', (tester) async {
        await tester.pumpTestWidget(const UserProfileCard(error: 'Some error'));

        expect(find.text('Profile Error'), findsOneWidget);
      });

      testWidgets('shows retry button when onRetry provided', (tester) async {
        await tester.pumpTestWidget(
          UserProfileCard(error: 'Retry test', onRetry: () {}),
        );

        expect(find.text('Retry'), findsOneWidget);
      });

      testWidgets('calls onRetry when retry button tapped', (tester) async {
        var retryCount = 0;
        await tester.pumpTestWidget(
          UserProfileCard(error: 'Test error', onRetry: () => retryCount++),
        );

        await tester.tap(find.text('Retry'));
        await tester.pumpAndSettle();

        expect(retryCount, 1);
      });

      testWidgets('does not show retry button when onRetry is null', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(error: 'No retry error'),
        );

        expect(find.text('Retry'), findsNothing);
      });

      testWidgets('empty error string does not trigger error state', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            error: '',
            userProfile: {'first_name': 'User', 'email': 'test@test.com'},
          ),
        );

        expect(find.byType(ErrorCard), findsNothing);
        expect(find.byType(Card), findsOneWidget);
      });
    });

    group('profile fields', () {
      testWidgets('shows Full Name field with icon', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Field',
              'last_name': 'Test',
              'email': 'field@test.com',
            },
          ),
        );

        expect(find.text('Full Name'), findsOneWidget);
        expect(find.byIcon(Icons.person), findsOneWidget);
      });

      testWidgets('shows Email field with icon', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Email',
              'last_name': 'Test',
              'email': 'email@test.com',
            },
          ),
        );

        expect(find.text('Email'), findsOneWidget);
        expect(find.byIcon(Icons.email), findsOneWidget);
      });

      testWidgets('shows Role field with icon', (tester) async {
        await tester.pumpTestWidget(
          const UserProfileCard(
            userProfile: {
              'first_name': 'Role',
              'last_name': 'Test',
              'email': 'role@test.com',
              'role': 'viewer',
            },
          ),
        );

        expect(find.text('Role'), findsOneWidget);
        expect(find.byIcon(Icons.badge), findsOneWidget);
      });
    });

    group('null profile', () {
      testWidgets('handles null userProfile gracefully', (tester) async {
        await tester.pumpTestWidget(const UserProfileCard());

        // Should still render with defaults
        expect(find.byType(Card), findsOneWidget);
        expect(find.textContaining('User'), findsWidgets);
      });
    });
  });
}
