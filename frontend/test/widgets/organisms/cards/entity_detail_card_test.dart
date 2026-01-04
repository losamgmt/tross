/// EntityDetailCard Organism Tests
///
/// Tests for the metadata-driven entity display card.
/// Follows behavioral testing patterns - verifies user-facing behavior.
///
/// NOTE: This widget requires EntityMetadataRegistry to be initialized
/// for full entity rendering. Tests are split into:
/// 1. State tests (loading/error/empty) - no metadata needed
/// 2. Entity rendering tests - require metadata initialization
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/cards/entity_detail_card.dart';
import 'package:tross_app/services/entity_metadata.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('EntityDetailCard', () {
    // =========================================================================
    // STATE TESTS - No metadata initialization needed
    // These test loading, error, and empty states which don't use metadata
    // =========================================================================

    group('loading state', () {
      testWidgets('shows loading indicator when isLoading is true', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'Loading User',
            isLoading: true,
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Loading User'), findsWidgets);
      });

      testWidgets('shows title and icon in loading state', (tester) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'User Profile',
            icon: Icons.person,
            isLoading: true,
          ),
        );

        expect(find.text('User Profile'), findsWidgets);
        expect(find.byIcon(Icons.person), findsWidgets);
      });
    });

    group('error state', () {
      testWidgets('shows error message when error is provided', (tester) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'User Error',
            error: 'Failed to load user data',
          ),
        );

        expect(find.text('Failed to load user data'), findsWidgets);
      });

      testWidgets('shows error icon with error message', (tester) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'Error State',
            error: 'Network error occurred',
          ),
        );

        // ErrorCard uses error_outline icon
        expect(find.byIcon(Icons.error_outline), findsWidgets);
      });
    });

    group('empty state', () {
      testWidgets('shows custom empty message when entity is null', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'No User',
            emptyMessage: 'No user data available',
          ),
        );

        expect(find.text('No user data available'), findsWidgets);
      });

      testWidgets('uses default empty message based on entity name', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'No User',
          ),
        );

        // Default message includes entity display name: "No User found"
        expect(find.textContaining('No'), findsWidgets);
        expect(find.textContaining('found'), findsWidgets);
      });

      testWidgets('shows inbox icon for empty state', (tester) async {
        await pumpTestWidget(
          tester,
          const EntityDetailCard(
            entityName: 'user',
            entity: null,
            title: 'Empty',
          ),
        );

        expect(find.byIcon(Icons.inbox_outlined), findsWidgets);
      });
    });

    // =========================================================================
    // ENTITY RENDERING TESTS - Require metadata initialization
    // These test actual entity display functionality
    // =========================================================================

    group('entity rendering (with metadata)', () {
      // Test entity data
      final testUser = {
        'id': 1,
        'email': 'test@example.com',
        'name': 'Test User',
        'auth0_id': 'auth0|123456',
        'role_id': 2,
        'created_at': '2024-01-15T10:00:00Z',
        'updated_at': '2024-01-20T15:30:00Z',
      };

      setUpAll(() async {
        TestWidgetsFlutterBinding.ensureInitialized();
        await EntityMetadataRegistry.instance.initialize();
      });

      testWidgets('renders title and icon with entity data', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'User Profile',
            icon: Icons.person,
          ),
          withProviders: true,
        );

        expect(find.text('User Profile'), findsWidgets);
        expect(find.byIcon(Icons.person), findsWidgets);
      });

      testWidgets('renders entity field values', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'User Details',
          ),
          withProviders: true,
        );

        // Should show the email field value
        expect(find.text('test@example.com'), findsWidgets);
      });

      testWidgets('shows edit button when onEdit is provided', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'Editable User',
            onEdit: () {},
          ),
          withProviders: true,
        );

        expect(find.byIcon(Icons.edit), findsWidgets);
      });

      testWidgets('calls onEdit when edit button is tapped', (tester) async {
        bool editCalled = false;

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'Editable User',
            onEdit: () => editCalled = true,
          ),
          withProviders: true,
        );

        await tester.tap(find.byIcon(Icons.edit));
        await tester.pump();

        expect(editCalled, isTrue);
      });

      testWidgets('shows custom edit label', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'User',
            onEdit: () {},
            editLabel: 'Modify Profile',
          ),
          withProviders: true,
        );

        expect(find.text('Modify Profile'), findsWidgets);
      });

      testWidgets('excludes specified fields from display', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'User Profile',
            excludeFields: const ['auth0_id', 'role_id'],
          ),
          withProviders: true,
        );

        // Excluded field values should not appear
        expect(find.text('auth0|123456'), findsNothing);
        // But email should still show
        expect(find.text('test@example.com'), findsWidgets);
      });

      testWidgets('renders as a Card widget', (tester) async {
        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: 'user',
            entity: testUser,
            title: 'User Profile',
          ),
          withProviders: true,
        );

        expect(find.byType(Card), findsWidgets);
      });
    });
  });
}
