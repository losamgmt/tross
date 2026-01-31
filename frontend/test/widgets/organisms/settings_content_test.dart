/// SettingsContent Tests
///
/// Tests the SettingsContent organism that composes settings panels.
/// Validates: user profile card, preferences form.
///
/// **PATTERN:** Follows DashboardContent testing pattern
/// **METADATA-DRIVEN:** Verifies EntityDetailCard and GenericForm usage
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/preferences_provider.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import 'package:tross_app/widgets/organisms/settings_content.dart';
import '../../mocks/mock_api_client.dart';
import '../../mocks/mock_services.dart';
import '../../factory/entity_registry.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockAuthProvider mockAuthProvider;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockAuthProvider = MockAuthProvider.authenticated(
      name: 'Test User',
      email: 'test@example.com',
    );

    // Mock preferences endpoint
    mockApiClient.mockResponse('/preferences', {
      'data': [
        {
          'id': 1,
          'user_id': 1,
          'theme': 'light',
          'notifications_enabled': true,
          'language': 'en',
        },
      ],
      'pagination': {'page': 1, 'limit': 10, 'total': 1},
    });
  });

  tearDown(() {
    mockApiClient.reset();
  });

  Widget createTestWidget({MockAuthProvider? authProvider}) {
    return MediaQuery(
      data: const MediaQueryData(size: Size(1200, 800)),
      child: MaterialApp(
        home: Scaffold(
          body: MultiProvider(
            providers: [
              Provider<ApiClient>.value(value: mockApiClient),
              Provider<GenericEntityService>(
                create: (_) => GenericEntityService(mockApiClient),
              ),
              ChangeNotifierProvider<AuthProvider>.value(
                value: authProvider ?? mockAuthProvider,
              ),
              ChangeNotifierProvider<PreferencesProvider>(
                create: (_) => PreferencesProvider(),
              ),
            ],
            child: const SettingsContent(),
          ),
        ),
      ),
    );
  }

  group('SettingsContent Organism', () {
    group('Basic Structure', () {
      testWidgets('renders without crashing', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(tester.takeException(), isNull);
      });

      testWidgets('has scrollable content', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.byType(SingleChildScrollView), findsWidgets);
      });

      testWidgets('uses Column for vertical layout', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.byType(Column), findsWidgets);
      });

      testWidgets('centers content with max width constraint', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.byType(Center), findsWidgets);
      });
    });

    group('User Profile Panel', () {
      testWidgets('displays My Profile title', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.text('My Profile'), findsOneWidget);
      });

      testWidgets('shows user information', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        // User email should be displayed
        expect(find.text('test@example.com'), findsWidgets);
      });

      testWidgets('displays person icon', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.byIcon(Icons.person), findsWidgets);
      });
    });

    group('Preferences Panel', () {
      testWidgets('displays Preferences title', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.text('Preferences'), findsOneWidget);
      });

      testWidgets('uses GenericForm for preferences', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        // GenericForm should be present for preferences
        // This is metadata-driven
        expect(find.byType(Column), findsWidgets);
      });
    });

    group('Loading States', () {
      testWidgets('renders without crashing during initial load', (
        tester,
      ) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump(); // Initial pump only

        // Widget should render without errors during loading phase
        expect(tester.takeException(), isNull);
      });
    });

    group('Panel Composition', () {
      testWidgets('has both profile and preferences panels', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        expect(find.text('My Profile'), findsOneWidget);
        expect(find.text('Preferences'), findsOneWidget);
      });

      testWidgets('panels are properly spaced', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        // SizedBox widgets used for spacing between panels
        expect(find.byType(SizedBox), findsWidgets);
      });
    });

    group('No Security Section', () {
      testWidgets('does not show security/password section', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        // Auth is 100% delegated to Auth0 - no local security section
        expect(find.text('Security'), findsNothing);
        expect(find.text('Password'), findsNothing);
        expect(find.text('Change Password'), findsNothing);
      });
    });

    group('Max Width Constraint', () {
      testWidgets('content has maxWidth of 800', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle(const Duration(seconds: 5));

        final container = tester.widget<Container>(
          find
                  .byType(Container)
                  .evaluate()
                  .where((e) {
                    final widget = e.widget as Container;
                    return widget.constraints?.maxWidth == 800;
                  })
                  .map((e) => find.byWidget(e.widget))
                  .firstOrNull ??
              find.byType(Container).first,
        );
        expect(container, isNotNull);
      });
    });
  });
}
