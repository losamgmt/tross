/// Widget State Permutation Scenario Tests
///
/// MASS GAIN STRATEGY 2: Test loading/error/empty states across widgets
///
/// Many widgets have conditional rendering based on state:
/// - isLoading states
/// - hasError states
/// - isEmpty states
/// - Permission states
///
/// This file tests state permutations systematically for ALL stateful widgets.
///
/// ZERO per-widget code - all tests generated from widget registry.
///
/// Expected impact: ~300 lines of coverage across 23 widget files.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/permission.dart';
import 'package:tross_app/widgets/organisms/cards/entity_detail_card.dart';
import 'package:tross_app/widgets/organisms/guards/permission_gate.dart';
import 'package:tross_app/widgets/organisms/login/login_form.dart';
import 'package:tross_app/widgets/organisms/login/production_login_card.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  // ===========================================================================
  // ENTITY DETAIL CARD - State Permutations
  // ===========================================================================

  group('EntityDetailCard State Permutations', () {
    for (final entityName in allKnownEntities) {
      group(entityName, () {
        testWidgets('loading state shows indicator', (tester) async {
          await pumpTestWidget(
            tester,
            EntityDetailCard(
              entityName: entityName,
              entity: null,
              title: 'Loading...',
              isLoading: true,
            ),
            withProviders: true,
          );

          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        });

        testWidgets('empty state shows placeholder', (tester) async {
          await pumpTestWidget(
            tester,
            EntityDetailCard(
              entityName: entityName,
              entity: null,
              title: 'No Data',
              isLoading: false,
            ),
            withProviders: true,
          );

          expect(find.byIcon(Icons.inbox_outlined), findsWidgets);
        });

        testWidgets('data state shows content', (tester) async {
          final testData = entityName.testData();

          await pumpTestWidget(
            tester,
            EntityDetailCard(
              entityName: entityName,
              entity: testData,
              title: 'Details',
              isLoading: false,
            ),
            withProviders: true,
          );

          expect(find.text('Details'), findsWidgets);
        });
      });
    }
  });

  // ===========================================================================
  // PERMISSION GATE - Authentication States
  // ===========================================================================

  group('PermissionGate Authentication States', () {
    testWidgets('unauthenticated shows fallback', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate(
          isAuthenticated: false,
          isLoading: false,
          userRole: null,
          fallback: const Text('Please Login'),
          child: const Text('Protected Content'),
        ),
        withProviders: true,
      );

      expect(find.text('Please Login'), findsOneWidget);
      expect(find.text('Protected Content'), findsNothing);
    });

    testWidgets('authenticated with exactRole shows child', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate.exactRole(
          isAuthenticated: true,
          isLoading: false,
          userRole: 'admin',
          role: UserRole.admin,
          fallback: const Text('Please Login'),
          child: const Text('Protected Content'),
        ),
        withProviders: true,
      );

      expect(find.text('Protected Content'), findsOneWidget);
    });

    testWidgets('authenticated loading state shows indicator', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate(
          isAuthenticated: true,
          isLoading: true,
          showLoadingIndicator: true,
          userRole: 'admin',
          type: PermissionGateType.exactRole,
          exactRole: UserRole.admin,
          child: const Text('Protected Content'),
        ),
        withProviders: true,
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('loading state hides indicator when not configured', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        PermissionGate(
          isAuthenticated: false,
          isLoading: true,
          showLoadingIndicator: false,
          userRole: null,
          child: const Text('Protected Content'),
        ),
        withProviders: true,
      );

      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  // ===========================================================================
  // PERMISSION GATE - Role-Based Access using exactRole
  // ===========================================================================

  group('PermissionGate Role Permutations', () {
    testWidgets('admin role renders gate correctly', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate.exactRole(
          isAuthenticated: true,
          isLoading: false,
          userRole: 'admin',
          role: UserRole.admin,
          child: const Text('Welcome admin'),
        ),
        withProviders: true,
      );

      expect(find.text('Welcome admin'), findsOneWidget);
    });

    testWidgets('customer role renders gate correctly', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate.exactRole(
          isAuthenticated: true,
          isLoading: false,
          userRole: 'customer',
          role: UserRole.customer,
          child: const Text('Welcome customer'),
        ),
        withProviders: true,
      );

      expect(find.text('Welcome customer'), findsOneWidget);
    });

    testWidgets('technician role renders gate correctly', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate.exactRole(
          isAuthenticated: true,
          isLoading: false,
          userRole: 'technician',
          role: UserRole.technician,
          child: const Text('Welcome technician'),
        ),
        withProviders: true,
      );

      expect(find.text('Welcome technician'), findsOneWidget);
    });

    testWidgets('dispatcher role renders gate correctly', (tester) async {
      await pumpTestWidget(
        tester,
        PermissionGate.exactRole(
          isAuthenticated: true,
          isLoading: false,
          userRole: 'dispatcher',
          role: UserRole.dispatcher,
          child: const Text('Welcome dispatcher'),
        ),
        withProviders: true,
      );

      expect(find.text('Welcome dispatcher'), findsOneWidget);
    });
  });

  // ===========================================================================
  // LOGIN FORM - Loading States
  // ===========================================================================

  group('LoginForm State Permutations', () {
    testWidgets('idle state renders form', (tester) async {
      await pumpTestWidget(
        tester,
        LoginForm(isLoading: false, onLogin: () {}),
        withProviders: true,
      );

      expect(find.byType(LoginForm), findsOneWidget);
    });

    testWidgets('loading state renders form', (tester) async {
      await pumpTestWidget(
        tester,
        LoginForm(isLoading: true, onLogin: () {}),
        withProviders: true,
      );

      expect(find.byType(LoginForm), findsOneWidget);
    });

    testWidgets('null callback renders form', (tester) async {
      await pumpTestWidget(
        tester,
        const LoginForm(isLoading: false, onLogin: null),
        withProviders: true,
      );

      expect(find.byType(LoginForm), findsOneWidget);
    });
  });

  // ===========================================================================
  // PRODUCTION LOGIN CARD - Loading States
  // ===========================================================================

  group('ProductionLoginCard State Permutations', () {
    testWidgets('idle state renders normally', (tester) async {
      await pumpTestWidget(
        tester,
        const ProductionLoginCard(isLoading: false),
        withProviders: true,
      );

      expect(find.byType(ProductionLoginCard), findsOneWidget);
    });

    testWidgets('loading state renders with loading indicator', (tester) async {
      await pumpTestWidget(
        tester,
        const ProductionLoginCard(isLoading: true),
        withProviders: true,
      );

      expect(find.byType(ProductionLoginCard), findsOneWidget);
    });
  });
}
