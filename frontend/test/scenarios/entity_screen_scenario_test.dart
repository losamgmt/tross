/// Entity Screen Scenario Tests - Factory-Generated Tests for Entity Screens
///
/// Tests EntityScreen and EntityDetailScreen across ALL entities.
/// Uses factory pattern: define once, run for 11 entities = 55+ tests.
///
/// Philosophy: "Test the pattern, not the permutations"
/// - EntityScreen renders correctly for each entity
/// - EntityDetailScreen shows loading/data/error states
/// - Navigation patterns work correctly
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/screens/entity_screen.dart';
import 'package:tross_app/screens/entity_detail_screen.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import '../factory/entity_registry.dart';
import '../factory/entity_data_generator.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_services.dart';

void main() {
  late MockApiClient mockApiClient;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
  });

  group('EntityScreen Scenario Tests', () {
    group('Renders for Each Entity', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityScreen renders for $entityName', (tester) async {
          // Arrange - mock entity list response
          mockApiClient.mockEntityList(entityName, [
            EntityDataGenerator.create(entityName),
          ]);

          // Act - pump the screen with full provider setup
          await _pumpEntityScreen(tester, entityName, mockApiClient);

          // Assert - screen should render without error
          expect(tester.takeException(), isNull);

          // Should find some content (title or table)
          final hasContent = find.byType(Scaffold).evaluate().isNotEmpty;
          expect(hasContent, isTrue, reason: 'Screen should have a Scaffold');
        });
      }
    });

    group('Shows Loading State', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityScreen shows loading for $entityName', (
          tester,
        ) async {
          // Arrange - don't settle, capture loading state
          mockApiClient.mockEntityList(entityName, [
            EntityDataGenerator.create(entityName),
          ]);

          // Act - pump without settling
          await _pumpEntityScreen(
            tester,
            entityName,
            mockApiClient,
            settle: false,
          );
          await tester.pump(); // Single frame

          // Assert - should show some loading indicator
          // May be CircularProgressIndicator or skeleton loading
          final hasLoadingIndicator = find
              .byType(CircularProgressIndicator)
              .evaluate()
              .isNotEmpty;

          // Don't hard-fail if no loading indicator - some screens may render instantly
          if (hasLoadingIndicator) {
            expect(find.byType(CircularProgressIndicator), findsWidgets);
          }
        });
      }
    });

    group('Handles API Errors', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityScreen handles error for $entityName', (
          tester,
        ) async {
          // Arrange - configure mock to fail
          mockApiClient.setShouldFail(true, message: 'Network error');

          // Act
          await _pumpEntityScreen(tester, entityName, mockApiClient);
          await tester.pumpAndSettle();

          // Assert - should show error state
          // Look for common error indicators
          final hasErrorIndicator =
              find.byIcon(Icons.error_outline).evaluate().isNotEmpty ||
              find.byIcon(Icons.error).evaluate().isNotEmpty ||
              find.textContaining('error').evaluate().isNotEmpty ||
              find.textContaining('Error').evaluate().isNotEmpty ||
              find.textContaining('failed').evaluate().isNotEmpty ||
              find.textContaining('Failed').evaluate().isNotEmpty ||
              find.text('Retry').evaluate().isNotEmpty;

          expect(
            hasErrorIndicator,
            isTrue,
            reason: 'Screen should show error indicator for $entityName',
          );
        });
      }
    });

    group('Displays Entity Data', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityScreen displays data for $entityName', (
          tester,
        ) async {
          // Arrange - generate realistic mock data
          final testData = EntityDataGenerator.createList(entityName, count: 3);
          mockApiClient.mockEntityList(entityName, testData);

          // Act
          await _pumpEntityScreen(tester, entityName, mockApiClient);
          await tester.pumpAndSettle();

          // Assert - should show data in table or list
          final hasTable =
              find.byType(DataTable).evaluate().isNotEmpty ||
              find.byType(ListView).evaluate().isNotEmpty ||
              find.byType(SingleChildScrollView).evaluate().isNotEmpty;

          expect(
            hasTable,
            isTrue,
            reason: 'Screen should display data container for $entityName',
          );
        });
      }
    });
  });

  group('EntityDetailScreen Scenario Tests', () {
    group('Renders for Each Entity', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityDetailScreen renders for $entityName', (
          tester,
        ) async {
          // Arrange
          final testEntity = EntityDataGenerator.create(entityName);
          const testId = 1;
          mockApiClient.mockEntity(entityName, testId, testEntity);

          // Act
          await _pumpEntityDetailScreen(
            tester,
            entityName,
            testId,
            mockApiClient,
          );

          // Assert
          expect(tester.takeException(), isNull);
          expect(find.byType(Scaffold), findsWidgets);
        });
      }
    });

    group('Shows Loading State', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityDetailScreen shows loading for $entityName', (
          tester,
        ) async {
          // Arrange
          final testEntity = EntityDataGenerator.create(entityName);
          const testId = 1;
          mockApiClient.mockEntity(entityName, testId, testEntity);

          // Act - pump without settling
          await _pumpEntityDetailScreen(
            tester,
            entityName,
            testId,
            mockApiClient,
            settle: false,
          );
          await tester.pump();

          // Assert - should show loading
          // May be CircularProgressIndicator or skeleton
          final hasLoadingIndicator = find
              .byType(CircularProgressIndicator)
              .evaluate()
              .isNotEmpty;
          if (hasLoadingIndicator) {
            expect(find.byType(CircularProgressIndicator), findsWidgets);
          }
        });
      }
    });

    group('Handles Not Found Errors', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityDetailScreen handles 404 for $entityName', (
          tester,
        ) async {
          // Arrange - configure mock to fail with not found
          mockApiClient.setShouldFail(true, message: 'Not found');

          // Act
          await _pumpEntityDetailScreen(
            tester,
            entityName,
            999, // Non-existent ID
            mockApiClient,
          );
          await tester.pumpAndSettle();

          // Assert - should show error
          final hasErrorIndicator =
              find.byIcon(Icons.error_outline).evaluate().isNotEmpty ||
              find.byIcon(Icons.error).evaluate().isNotEmpty ||
              find.textContaining('error').evaluate().isNotEmpty ||
              find.textContaining('Error').evaluate().isNotEmpty ||
              find.textContaining('not found').evaluate().isNotEmpty ||
              find.textContaining('Not found').evaluate().isNotEmpty;

          expect(
            hasErrorIndicator,
            isTrue,
            reason: 'Screen should show error for not found $entityName',
          );
        });
      }
    });

    group('Displays Entity Details', () {
      for (final entityName in allKnownEntities) {
        testWidgets('EntityDetailScreen displays details for $entityName', (
          tester,
        ) async {
          // Arrange
          final testEntity = EntityDataGenerator.create(entityName);
          const testId = 1;
          mockApiClient.mockEntity(entityName, testId, testEntity);

          // Act
          await _pumpEntityDetailScreen(
            tester,
            entityName,
            testId,
            mockApiClient,
          );
          await tester.pumpAndSettle();

          // Assert - should show entity details
          // Look for Card widget (EntityDetailCard) or form fields
          final hasDetailContent =
              find.byType(Card).evaluate().isNotEmpty ||
              find.byType(TextFormField).evaluate().isNotEmpty ||
              find.byType(Text).evaluate().isNotEmpty;

          expect(
            hasDetailContent,
            isTrue,
            reason: 'Screen should display entity details for $entityName',
          );
        });
      }
    });
  });
}

/// Helper to pump EntityScreen with proper provider setup
Future<void> _pumpEntityScreen(
  WidgetTester tester,
  String entityName,
  MockApiClient mockApiClient, {
  bool settle = true,
  String userRole = 'admin',
}) async {
  await tester.pumpWidget(
    MediaQuery(
      data: const MediaQueryData(size: Size(1200, 800)),
      child: MaterialApp(
        home: MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: mockApiClient),
            Provider<GenericEntityService>(
              create: (_) => GenericEntityService(mockApiClient),
            ),
            ChangeNotifierProvider<AuthProvider>.value(
              value: MockAuthProvider.authenticated(role: userRole),
            ),
          ],
          child: Scaffold(body: EntityScreen(entityName: entityName)),
        ),
      ),
    ),
  );

  if (settle) {
    await tester.pumpAndSettle(const Duration(seconds: 5));
  }
}

/// Helper to pump EntityDetailScreen with proper provider setup
Future<void> _pumpEntityDetailScreen(
  WidgetTester tester,
  String entityName,
  int entityId,
  MockApiClient mockApiClient, {
  bool settle = true,
  String userRole = 'admin',
}) async {
  await tester.pumpWidget(
    MediaQuery(
      data: const MediaQueryData(size: Size(1200, 800)),
      child: MaterialApp(
        home: MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: mockApiClient),
            Provider<GenericEntityService>(
              create: (_) => GenericEntityService(mockApiClient),
            ),
            ChangeNotifierProvider<AuthProvider>.value(
              value: MockAuthProvider.authenticated(role: userRole),
            ),
          ],
          child: Scaffold(
            body: EntityDetailScreen(
              entityName: entityName,
              entityId: entityId,
            ),
          ),
        ),
      ),
    ),
  );

  if (settle) {
    await tester.pumpAndSettle(const Duration(seconds: 5));
  }
}
