import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/refreshable_data_provider.dart';
import '../../../helpers/test_helpers.dart';

void main() {
  group('RefreshableDataProvider Organism Tests', () {
    testWidgets('loads data on initialization', (tester) async {
      var loadCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RefreshableDataProvider<String>(
              loadData: () async {
                loadCount++;
                return 'Data $loadCount';
              },
              builder: (context, data) => Text(data),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Should load data once
      expect(loadCount, 1);
      expect(find.text('Data 1'), findsOneWidget);
    });

    testWidgets('refresh() reloads data', (tester) async {
      var loadCount = 0;
      final key = GlobalKey<RefreshableDataProviderState<String>>();

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          key: key,
          loadData: () async {
            loadCount++;
            await Future.delayed(TestConstants.shortDelay);
            return 'Data $loadCount';
          },
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();
      expect(loadCount, 1);
      expect(find.text('Data 1'), findsOneWidget);

      // Trigger refresh
      key.currentState!.refresh();
      await tester.pump(); // Pump to start the refresh
      await tester.pumpAndSettle(); // Wait for completion

      // Should reload data
      expect(loadCount, 2);
      expect(find.text('Data 2'), findsOneWidget);
    });

    testWidgets('prevents concurrent refreshes', (tester) async {
      var loadCount = 0;
      final key = GlobalKey<RefreshableDataProviderState<String>>();

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          key: key,
          loadData: () async {
            loadCount++;
            await Future.delayed(const Duration(milliseconds: 50));
            return 'Data $loadCount';
          },
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();
      expect(loadCount, 1);

      // Trigger refresh (don't await the returned future)
      key.currentState!.refresh();

      // Try to refresh again immediately (should be ignored)
      key.currentState!.refresh();
      key.currentState!.refresh();

      // Pump to progress the widget state
      await tester.pump();
      await tester.pumpAndSettle();

      // Should only reload once (concurrent calls ignored)
      expect(loadCount, 2);
    });

    testWidgets('calls onDataLoaded when data loads successfully', (
      tester,
    ) async {
      String? loadedData;

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          loadData: () async => 'Success',
          builder: (context, data) => Text(data),
          onDataLoaded: (data) {
            loadedData = data;
          },
        ),
      );

      await tester.pumpAndSettle();

      // Should call callback with loaded data
      expect(loadedData, 'Success');
    });

    testWidgets('calls onError when data loading fails', (tester) async {
      Object? capturedError;

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          loadData: () async => throw Exception('Load failed'),
          builder: (context, data) => Text(data),
          onError: (error) {
            capturedError = error;
          },
        ),
      );

      await tester.pumpAndSettle();

      // Should call error callback
      expect(capturedError, isA<Exception>());
      expect(capturedError.toString(), contains('Load failed'));
    });

    testWidgets('is fully generic - works with any type T', (tester) async {
      // Test with List<int>
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RefreshableDataProvider<List<int>>(
              loadData: () async => [1, 2, 3],
              builder: (context, data) => Text('Count: ${data.length}'),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Count: 3'), findsOneWidget);

      // Test with custom class
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RefreshableDataProvider<_TestModel>(
              loadData: () async => _TestModel('test'),
              builder: (context, data) => Text(data.name),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('test'), findsOneWidget);
    });

    testWidgets('is an organism - composes AsyncDataProvider organism', (
      tester,
    ) async {
      // RefreshableDataProvider should compose AsyncDataProvider
      // This is tested implicitly by all the above tests working
      // (loading states, error states, data states all handled by AsyncDataProvider)

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          loadData: () async => 'Composed',
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Composed'), findsOneWidget);
    });

    testWidgets('exposes public state for parent control', (tester) async {
      final key = GlobalKey<RefreshableDataProviderState<String>>();

      await tester.pumpTestWidget(
        RefreshableDataProvider<String>(
          key: key,
          loadData: () async => 'Data',
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();

      // State should be accessible from parent
      expect(key.currentState, isNotNull);
      expect(key.currentState, isA<RefreshableDataProviderState<String>>());

      // Should expose refresh method
      expect(() => key.currentState!.refresh(), returnsNormally);
    });
  });
}

// Test model for generic type testing
class _TestModel {
  final String name;
  _TestModel(this.name);
}
