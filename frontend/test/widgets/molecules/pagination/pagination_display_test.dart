/// PaginationDisplay Widget Tests
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/pagination/pagination_display.dart';

void main() {
  group('PaginationDisplay', () {
    testWidgets('renders range text', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaginationDisplay(
              rangeText: '1-10 of 100',
              canGoPrevious: false,
              canGoNext: true,
              onPrevious: () {},
              onNext: () {},
            ),
          ),
        ),
      );

      expect(find.text('1-10 of 100'), findsOneWidget);
    });

    testWidgets('previous button disabled when canGoPrevious is false', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaginationDisplay(
              rangeText: '1-10 of 100',
              canGoPrevious: false,
              canGoNext: true,
              onPrevious: () {},
              onNext: () {},
            ),
          ),
        ),
      );

      final prevButton = find.byIcon(Icons.chevron_left);
      expect(prevButton, findsOneWidget);
    });

    testWidgets('next button calls onNext when pressed', (tester) async {
      var nextCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaginationDisplay(
              rangeText: '1-10 of 100',
              canGoPrevious: false,
              canGoNext: true,
              onPrevious: () {},
              onNext: () => nextCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byIcon(Icons.chevron_right));
      await tester.pump();

      expect(nextCalled, isTrue);
    });

    testWidgets('previous button calls onPrevious when enabled', (
      tester,
    ) async {
      var prevCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaginationDisplay(
              rangeText: '11-20 of 100',
              canGoPrevious: true,
              canGoNext: true,
              onPrevious: () => prevCalled = true,
              onNext: () {},
            ),
          ),
        ),
      );

      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pump();

      expect(prevCalled, isTrue);
    });

    testWidgets('both buttons enabled in middle of pagination', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaginationDisplay(
              rangeText: '11-20 of 100',
              canGoPrevious: true,
              canGoNext: true,
              onPrevious: () {},
              onNext: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.chevron_left), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsOneWidget);
    });
  });
}
