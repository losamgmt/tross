/// P6a — ForeignKeyLookupCell embedded-display fast path (UDN FK display).
///
/// Proves that when the server embeds `<fk>_display` on the row, the cell renders
/// it with NO getById lookup (kills the N+1), while an absent/empty embedded value
/// still falls back to the lookup.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/services/generic_entity_service.dart';
import 'package:tross/widgets/atoms/cells/foreign_key_lookup_cell.dart';

import '../../../mocks/mock_services.dart';

void main() {
  Widget wrap(GenericEntityService service, Widget child) {
    return Provider<GenericEntityService>.value(
      value: service,
      child: MaterialApp(home: Scaffold(body: child)),
    );
  }

  group('ForeignKeyLookupCell', () {
    testWidgets('renders embeddedDisplay and performs NO lookup', (
      tester,
    ) async {
      final service = MockGenericEntityService();

      await tester.pumpWidget(
        wrap(
          service,
          const ForeignKeyLookupCell(
            entityId: 42,
            references: 'customer',
            displayField: 'name',
            embeddedDisplay: 'Jane Smith',
          ),
        ),
      );

      expect(find.text('Jane Smith'), findsOneWidget);
      expect(service.wasCalled('getById:customer:42'), isFalse);
    });

    testWidgets('falls back to getById when embeddedDisplay is absent', (
      tester,
    ) async {
      final service = MockGenericEntityService();
      service.mockEntities('customer', [
        {'id': 42, 'name': 'Bob Fallback'},
      ]);

      await tester.pumpWidget(
        wrap(
          service,
          const ForeignKeyLookupCell(
            entityId: 42,
            references: 'customer',
            displayField: 'name',
          ),
        ),
      );
      await tester.pump(); // resolve the getById future + rebuild

      expect(find.text('Bob Fallback'), findsOneWidget);
      expect(service.wasCalled('getById:customer:42'), isTrue);
    });

    testWidgets('treats an empty embeddedDisplay as absent (falls back)', (
      tester,
    ) async {
      final service = MockGenericEntityService();
      service.mockEntities('customer', [
        {'id': 7, 'name': 'Empty Fallback'},
      ]);

      await tester.pumpWidget(
        wrap(
          service,
          const ForeignKeyLookupCell(
            entityId: 7,
            references: 'customer',
            displayField: 'name',
            embeddedDisplay: '',
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Empty Fallback'), findsOneWidget);
      expect(service.wasCalled('getById:customer:7'), isTrue);
    });
  });
}
