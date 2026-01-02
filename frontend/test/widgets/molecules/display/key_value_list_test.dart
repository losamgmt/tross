/// KeyValueList Molecule Tests
///
/// Tests observable BEHAVIOR:
/// - User sees label:value pairs
/// - User sees icons and tooltips when configured
/// - Layout adapts to screen width
/// - Highlighted items are emphasized
///
/// NO implementation details:
/// - ❌ Widget counts (findsNWidgets)
/// - ❌ Container/SizedBox structure
/// - ❌ Internal widget hierarchy
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/display/key_value_list.dart';

import '../../../helpers/behavioral_test_helpers.dart';
import '../../../helpers/test_helpers.dart';

void main() {
  group('KeyValueList Molecule', () {
    // =========================================================================
    // User Sees Content
    // =========================================================================
    group('User Sees Content', () {
      testWidgets('user sees all labels and text values', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(label: 'Name', value: 'John Doe'),
              KeyValueItem.text(label: 'Email', value: 'john@example.com'),
            ],
          ),
        );

        assertTextVisible('Name');
        assertTextVisible('John Doe');
        assertTextVisible('Email');
        assertTextVisible('john@example.com');
      });

      testWidgets('user sees nothing when list is empty', (tester) async {
        await tester.pumpTestWidget(
          const KeyValueList(items: []),
        );

        // Empty state - should render minimal
        expect(find.byType(KeyValueList), findsOneWidget);
      });

      testWidgets('user sees custom widget values', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem(
                label: 'Status',
                value: Container(
                  padding: const EdgeInsets.all(4),
                  color: Colors.green,
                  child: const Text('Active'),
                ),
              ),
            ],
          ),
        );

        assertTextVisible('Status');
        assertTextVisible('Active');
      });
    });

    // =========================================================================
    // Value Type Factories
    // =========================================================================
    group('Value Type Factories', () {
      testWidgets('text factory displays text value', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(label: 'Field', value: 'Text Value'),
            ],
          ),
        );

        assertTextVisible('Field');
        assertTextVisible('Text Value');
      });

      testWidgets('boolean true shows check icon', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.boolean(label: 'Enabled', value: true),
            ],
          ),
        );

        assertTextVisible('Enabled');
        assertIconVisible(Icons.check_circle);
      });

      testWidgets('boolean false shows cancel icon', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.boolean(label: 'Enabled', value: false),
            ],
          ),
        );

        assertTextVisible('Enabled');
        assertIconVisible(Icons.cancel);
      });

      testWidgets('number factory displays formatted number', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.number(
                label: 'Price',
                value: 99.99,
                prefix: r'$',
              ),
            ],
          ),
        );

        assertTextVisible('Price');
        // FieldDisplay formats number with prefix
        assertTextVisible(r'$99.99');
      });
    });

    // =========================================================================
    // Visual Options
    // =========================================================================
    group('Visual Options', () {
      testWidgets('dividers appear between items when enabled', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            showDividers: true,
            items: [
              KeyValueItem.text(label: 'First', value: '1'),
              KeyValueItem.text(label: 'Second', value: '2'),
              KeyValueItem.text(label: 'Third', value: '3'),
            ],
          ),
        );

        // Dividers exist (we don't count how many - that's implementation)
        expect(find.byType(Divider), findsWidgets);
      });

      testWidgets('dense mode renders without error', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            dense: true,
            items: [
              KeyValueItem.text(label: 'First', value: '1'),
              KeyValueItem.text(label: 'Second', value: '2'),
            ],
          ),
        );

        assertTextVisible('First');
        assertTextVisible('Second');
      });

      testWidgets('custom labelWidth renders without error', (tester) async {
        await tester.pumpTestWidget(
          SizedBox(
            width: 400,
            child: KeyValueList(
              labelWidth: 200,
              items: [
                KeyValueItem.text(label: 'Wide Label', value: 'Value'),
              ],
            ),
          ),
        );

        assertTextVisible('Wide Label');
        assertTextVisible('Value');
      });
    });

    // =========================================================================
    // Icons and Tooltips
    // =========================================================================
    group('Icons and Tooltips', () {
      testWidgets('user sees icon next to label', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(
                label: 'Email',
                value: 'test@example.com',
                icon: Icons.email,
              ),
            ],
          ),
        );

        assertIconVisible(Icons.email);
        assertTextVisible('Email');
      });

      testWidgets('tooltip is present when provided', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(
                label: 'Help',
                value: 'Value',
                tooltip: 'This is a tooltip',
              ),
            ],
          ),
        );

        expect(find.byType(Tooltip), findsWidgets);
      });
    });

    // =========================================================================
    // Highlighting
    // =========================================================================
    group('Highlighting', () {
      testWidgets('highlighted items render successfully', (tester) async {
        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(
                label: 'Important',
                value: 'Critical Value',
                isHighlighted: true,
              ),
            ],
          ),
        );

        assertTextVisible('Important');
        assertTextVisible('Critical Value');
      });
    });

    // =========================================================================
    // Responsive Layout
    // =========================================================================
    group('Responsive Layout', () {
      testWidgets('renders on narrow screens', (tester) async {
        // Set narrow screen size
        tester.view.physicalSize = const Size(250, 600);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(label: 'Label', value: 'Value'),
            ],
          ),
        );

        // User still sees content regardless of layout
        assertTextVisible('Label');
        assertTextVisible('Value');
      });

      testWidgets('renders on wide screens', (tester) async {
        // Set wide screen size
        tester.view.physicalSize = const Size(800, 600);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpTestWidget(
          KeyValueList(
            items: [
              KeyValueItem.text(label: 'Label', value: 'Value'),
            ],
          ),
        );

        assertTextVisible('Label');
        assertTextVisible('Value');
      });
    });
  });
}
