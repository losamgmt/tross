import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

void main() {
  group('InfoSnackBar', () {
    testWidgets('renders with correct message', (tester) async {
      const message = 'Info notification';
      final snackBar = InfoSnackBar(message: message);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(snackBar);
                  },
                  child: const Text('Show'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);
    });

    testWidgets('has correct styling', (tester) async {
      const message = 'Information';
      final snackBar = InfoSnackBar(message: message);

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          ),
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(snackBar);
                  },
                  child: const Text('Show'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final snackBarWidget = tester.widget<SnackBar>(find.byType(SnackBar));

      // InfoSnackBar uses theme colors (backgroundColor is null by design)
      expect(snackBarWidget.behavior, SnackBarBehavior.floating);
      expect(snackBarWidget.duration, const Duration(seconds: 3));
    });
  });
}
