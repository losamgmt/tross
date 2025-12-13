// ignore_for_file: avoid_print

/// Parse Flutter test JSON output and show only failures
///
/// Usage: flutter test --reporter json | dart run tool/parse_failures.dart
///
library;

import 'dart:convert';
import 'dart:io';

void main() async {
  final tests = <int, String>{};
  final errors = <int, String>{};
  final failures = <String>[];

  await for (final line
      in stdin.transform(utf8.decoder).transform(const LineSplitter())) {
    try {
      final event = jsonDecode(line) as Map<String, dynamic>;
      final type = event['type'] as String?;

      if (type == 'testStart') {
        final test = event['test'] as Map<String, dynamic>;
        tests[test['id'] as int] = test['name'] as String? ?? 'Unknown';
      } else if (type == 'error') {
        final testId = event['testID'] as int?;
        if (testId != null) {
          errors[testId] = (event['error'] as String? ?? '').replaceAll(
            RegExp(r'\x1B\[[0-9;]*m'),
            '',
          );
        }
      } else if (type == 'testDone' && event['result'] == 'failure') {
        final testId = event['testID'] as int?;
        if (testId != null) {
          final name = tests[testId] ?? 'Unknown test';
          final error = errors[testId] ?? 'No error message';
          failures.add('❌ $name\n   → ${error.split('\n').first}');
        }
      }
    } catch (_) {}
  }

  print('\n${'═' * 50}');
  if (failures.isEmpty) {
    print('✅ ALL TESTS PASSED');
  } else {
    print('❌ ${failures.length} FAILURE(S):\n');
    for (var i = 0; i < failures.length; i++) {
      print('${i + 1}. ${failures[i]}\n');
    }
  }
  print('${'═' * 50}\n');

  exit(failures.isEmpty ? 0 : 1);
}
