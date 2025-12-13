import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/async_data_provider.dart';
import '../../../helpers/test_helpers.dart';
import 'package:tross_app/widgets/atoms/indicators/loading_indicator.dart';
import 'package:tross_app/widgets/molecules/error_card.dart';

void main() {
  group('AsyncDataProvider Organism Tests', () {
    testWidgets('shows loading indicator while future is pending', (
      tester,
    ) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.delayed(TestConstants.mediumDelay, () => 'data'),
          builder: (context, data) => Text(data),
        ),
      );

      // Should show loading indicator
      expect(find.byType(LoadingIndicator), findsOneWidget);
      expect(find.text('data'), findsNothing);

      // Wait for future to complete to avoid pending timer
      await tester.pumpAndSettle();
    });

    testWidgets('shows data when future completes successfully', (
      tester,
    ) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.value('Success!'),
          builder: (context, data) => Text(data),
        ),
      );

      // Wait for future to complete
      await tester.pumpAndSettle();

      // Should show data
      expect(find.text('Success!'), findsOneWidget);
      expect(find.byType(LoadingIndicator), findsNothing);
    });

    testWidgets('shows error card when future fails', (tester) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          // Use Future.delayed with Duration.zero to ensure error is caught by FutureBuilder
          future: Future.delayed(
            Duration.zero,
            () => throw Exception('Test error'),
          ),
          builder: (context, data) => Text(data),
          errorTitle: 'Load Failed',
        ),
      );

      // Wait for future to fail
      await tester.pumpAndSettle();

      // Should show error card
      expect(find.byType(ErrorCard), findsOneWidget);
      expect(find.text('Load Failed'), findsOneWidget);
      expect(find.text('Success!'), findsNothing);
    });

    testWidgets('uses custom loading widget when provided', (tester) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.delayed(TestConstants.mediumDelay, () => 'data'),
          loadingWidget: const Text('Custom Loading'),
          builder: (context, data) => Text(data),
        ),
      );

      // Should show custom loading widget
      expect(find.text('Custom Loading'), findsOneWidget);
      expect(find.byType(LoadingIndicator), findsNothing);

      // Wait for future to complete to avoid pending timer
      await tester.pumpAndSettle();
    });

    testWidgets('uses custom error builder when provided', (tester) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          // Use Future.delayed with Duration.zero to ensure error is caught by FutureBuilder
          future: Future.delayed(
            Duration.zero,
            () => throw Exception('Test error'),
          ),
          errorBuilder: (error, retry) => const Text('Custom Error'),
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();

      // Should show custom error widget
      expect(find.text('Custom Error'), findsOneWidget);
      expect(find.byType(ErrorCard), findsNothing);
    });

    testWidgets('centers loading and error by default', (tester) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.delayed(TestConstants.mediumDelay, () => 'data'),
          builder: (context, data) => Text(data),
        ),
      );

      // Loading should be centered
      expect(
        find.ancestor(
          of: find.byType(LoadingIndicator),
          matching: find.byType(Center),
        ),
        findsOneWidget,
      );

      // Wait for future to complete to avoid pending timer
      await tester.pumpAndSettle();
    });

    testWidgets('respects centered=false parameter', (tester) async {
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.delayed(TestConstants.mediumDelay, () => 'data'),
          builder: (context, data) => Text(data),
          centered: false,
        ),
      );

      // Loading should NOT be centered
      expect(
        find.ancestor(
          of: find.byType(LoadingIndicator),
          matching: find.byType(Center),
        ),
        findsNothing,
      );

      // Wait for future to complete to avoid pending timer
      await tester.pumpAndSettle();
    });

    testWidgets('is fully generic - works with any type T', (tester) async {
      // Test with List<int>
      await tester.pumpTestWidget(
        AsyncDataProvider<List<int>>(
          future: Future.value([1, 2, 3]),
          builder: (context, data) => Text('Count: ${data.length}'),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Count: 3'), findsOneWidget);

      // Test with custom class
      await tester.pumpTestWidget(
        AsyncDataProvider<_TestModel>(
          future: Future.value(_TestModel('test')),
          builder: (context, data) => Text(data.name),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('test'), findsOneWidget);
    });

    testWidgets('is an organism - composes molecules', (tester) async {
      // Verify it composes ErrorCard molecule for errors
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          // Use Future.delayed with Duration.zero to ensure error is caught by FutureBuilder
          future: Future.delayed(Duration.zero, () => throw Exception('Error')),
          builder: (context, data) => Text(data),
        ),
      );

      await tester.pumpAndSettle();

      // Should use ErrorCard molecule (not raw widgets)
      expect(find.byType(ErrorCard), findsOneWidget);

      // Verify it composes LoadingIndicator atom
      await tester.pumpTestWidget(
        AsyncDataProvider<String>(
          future: Future.delayed(TestConstants.mediumDelay, () => 'data'),
          builder: (context, data) => Text(data),
        ),
      );

      expect(find.byType(LoadingIndicator), findsOneWidget);

      // Wait for future to complete to avoid pending timer
      await tester.pumpAndSettle();
    });
  });
}

// Test model for generic type testing
class _TestModel {
  final String name;
  _TestModel(this.name);
}
