import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/stream_data_provider.dart';
import '../../../helpers/test_helpers.dart';
import 'package:tross_app/widgets/atoms/indicators/loading_indicator.dart';
import 'package:tross_app/widgets/molecules/error_card.dart';

void main() {
  group('StreamDataProvider Organism Tests', () {
    testWidgets('shows loading while waiting for first stream event', (
      tester,
    ) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          builder: (context, data) => Text(data),
        ),
      );

      // Should show loading indicator
      expect(find.byType(LoadingIndicator), findsOneWidget);
      expect(find.text('data'), findsNothing);

      controller.close();
    });

    testWidgets('shows data when stream emits', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          builder: (context, data) => Text(data),
        ),
      );

      // Emit data
      controller.add('Stream Data');
      await tester.pump();

      // Should show data
      expect(find.text('Stream Data'), findsOneWidget);
      expect(find.byType(LoadingIndicator), findsNothing);

      controller.close();
    });

    testWidgets('updates when stream emits new data', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          builder: (context, data) => Text(data),
        ),
      );

      // Emit first data
      controller.add('First');
      await tester.pump();
      expect(find.text('First'), findsOneWidget);

      // Emit second data
      controller.add('Second');
      await tester.pump();
      expect(find.text('Second'), findsOneWidget);
      expect(find.text('First'), findsNothing);

      controller.close();
    });

    testWidgets('shows initial data immediately if provided', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          initialData: 'Initial',
          builder: (context, data) => Text(data),
        ),
      );

      // Should show initial data immediately (no loading)
      expect(find.text('Initial'), findsOneWidget);
      expect(find.byType(LoadingIndicator), findsNothing);

      controller.close();
    });

    testWidgets('shows error card when stream emits error', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          builder: (context, data) => Text(data),
          errorTitle: 'Stream Failed',
        ),
      );

      // Emit error
      controller.addError(Exception('Test error'));
      await tester.pump();

      // Should show error card
      expect(find.byType(ErrorCard), findsOneWidget);
      expect(find.text('Stream Failed'), findsOneWidget);

      controller.close();
    });

    testWidgets('uses custom error builder when provided', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          errorBuilder: (error) => const Text('Custom Stream Error'),
          builder: (context, data) => Text(data),
        ),
      );

      controller.addError(Exception('Error'));
      await tester.pump();

      // Should show custom error widget
      expect(find.text('Custom Stream Error'), findsOneWidget);
      expect(find.byType(ErrorCard), findsNothing);

      controller.close();
    });

    testWidgets('is fully generic - works with any type T', (tester) async {
      // Test with List<int>
      final controller = StreamController<List<int>>();

      await tester.pumpTestWidget(
        StreamDataProvider<List<int>>(
          stream: controller.stream,
          builder: (context, data) => Text('Count: ${data.length}'),
        ),
      );

      controller.add([1, 2, 3, 4]);
      await tester.pump();

      expect(find.text('Count: 4'), findsOneWidget);

      controller.close();
    });

    testWidgets('is an organism - composes molecules', (tester) async {
      final controller = StreamController<String>();

      // Verify it composes ErrorCard molecule for errors
      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          builder: (context, data) => Text(data),
        ),
      );

      controller.addError(Exception('Error'));
      await tester.pump();

      // Should use ErrorCard molecule (not raw widgets)
      expect(find.byType(ErrorCard), findsOneWidget);

      controller.close();
    });

    testWidgets('handles stream closure gracefully', (tester) async {
      final controller = StreamController<String>();

      await tester.pumpTestWidget(
        StreamDataProvider<String>(
          stream: controller.stream,
          initialData: 'Initial',
          builder: (context, data) => Text(data),
        ),
      );

      expect(find.text('Initial'), findsOneWidget);

      // Close stream
      await controller.close();
      await tester.pump();

      // Should still show last data
      expect(find.text('Initial'), findsOneWidget);
    });
  });
}
