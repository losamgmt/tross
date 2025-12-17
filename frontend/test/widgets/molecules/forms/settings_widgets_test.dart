import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/forms/setting_toggle_row.dart';
import 'package:tross_app/widgets/molecules/forms/setting_dropdown_row.dart';
import 'package:tross_app/config/preference_keys.dart';

void main() {
  group('SettingToggleRow', () {
    testWidgets('renders label and toggle', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Test Setting',
              value: true,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Test Setting'), findsOneWidget);
      expect(find.byType(Switch), findsOneWidget);
    });

    testWidgets('renders description when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Test Setting',
              description: 'This is a description',
              value: false,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('This is a description'), findsOneWidget);
    });

    testWidgets('calls onChanged when toggled', (tester) async {
      bool? changedValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Test Setting',
              value: false,
              onChanged: (value) => changedValue = value,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(Switch));
      expect(changedValue, isTrue);
    });

    testWidgets('respects enabled state', (tester) async {
      bool? changedValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Disabled Setting',
              value: false,
              enabled: false,
              onChanged: (value) => changedValue = value,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(Switch));
      expect(changedValue, isNull);
    });

    testWidgets('displays correct initial value (true)', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Test',
              value: true,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      final switchWidget = tester.widget<Switch>(find.byType(Switch));
      expect(switchWidget.value, isTrue);
    });

    testWidgets('displays correct initial value (false)', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingToggleRow(
              label: 'Test',
              value: false,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      final switchWidget = tester.widget<Switch>(find.byType(Switch));
      expect(switchWidget.value, isFalse);
    });

    testWidgets('can be used for notifications preference', (tester) async {
      bool notificationsEnabled = true;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return SettingToggleRow(
                  label: 'Notifications',
                  description: 'Receive push notifications',
                  value: notificationsEnabled,
                  onChanged: (value) {
                    setState(() => notificationsEnabled = value);
                  },
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Receive push notifications'), findsOneWidget);

      // Toggle off
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();

      expect(notificationsEnabled, isFalse);
    });
  });

  group('SettingDropdownRow', () {
    testWidgets('renders label and dropdown', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingDropdownRow<String>(
              label: 'Theme',
              value: 'system',
              items: const ['system', 'light', 'dark'],
              displayText: (value) => value,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Theme'), findsOneWidget);
      expect(find.byType(DropdownButton<String>), findsOneWidget);
    });

    testWidgets('can be used for theme preference', (tester) async {
      ThemePreference selectedTheme = ThemePreference.system;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return SettingDropdownRow<ThemePreference>(
                  label: 'Theme',
                  description: 'Choose your preferred theme',
                  value: selectedTheme,
                  items: ThemePreference.values,
                  displayText: (theme) {
                    switch (theme) {
                      case ThemePreference.system:
                        return 'System';
                      case ThemePreference.light:
                        return 'Light';
                      case ThemePreference.dark:
                        return 'Dark';
                    }
                  },
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => selectedTheme = value);
                    }
                  },
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('Theme'), findsOneWidget);
      expect(find.text('Choose your preferred theme'), findsOneWidget);

      // Open dropdown
      await tester.tap(find.byType(DropdownButton<ThemePreference>));
      await tester.pumpAndSettle();

      // Select dark theme
      await tester.tap(find.text('Dark').last);
      await tester.pumpAndSettle();

      expect(selectedTheme, ThemePreference.dark);
    });
  });

  group('Preferences Integration Scenarios', () {
    testWidgets('theme and notifications settings together', (tester) async {
      ThemePreference theme = ThemePreference.system;
      bool notifications = true;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: StatefulBuilder(
                  builder: (context, setState) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SettingDropdownRow<ThemePreference>(
                          label: 'Theme',
                          value: theme,
                          items: ThemePreference.values,
                          displayText: (t) => t.value,
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => theme = value);
                            }
                          },
                        ),
                        SettingToggleRow(
                          label: 'Notifications',
                          value: notifications,
                          onChanged: (value) {
                            setState(() => notifications = value);
                          },
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      );

      // Both settings rendered
      expect(find.text('Theme'), findsOneWidget);
      expect(find.text('Notifications'), findsOneWidget);

      // Toggle notifications off
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      expect(notifications, isFalse);

      // Open theme dropdown
      await tester.tap(find.byType(DropdownButton<ThemePreference>));
      await tester.pumpAndSettle();

      // Select dark
      await tester.tap(find.text('dark').last);
      await tester.pumpAndSettle();
      expect(theme, ThemePreference.dark);
    });
  });
}
