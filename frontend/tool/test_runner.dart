// ignore_for_file: avoid_print

/// Flutter Test Runner - Clean, Diagnostic Output
///
/// Usage:
///   dart run tool/test_runner.dart           # Run all tests, show failures only
///   dart run tool/test_runner.dart --all     # Show all results
///   dart run tool/test_runner.dart --watch   # Watch mode
///   dart run tool/test_runner.dart path/to/test.dart  # Run specific test
///
library;

import 'dart:convert';
import 'dart:io';

/// ANSI color codes for terminal output
class Colors {
  static const reset = '\x1B[0m';
  static const red = '\x1B[31m';
  static const green = '\x1B[32m';
  static const yellow = '\x1B[33m';
  static const blue = '\x1B[34m';
  static const cyan = '\x1B[36m';
  static const bold = '\x1B[1m';
  static const dim = '\x1B[2m';
}

/// Represents a test result
class TestResult {
  final int id;
  final String name;
  final String? suitePath;
  final bool passed;
  final bool skipped;
  final String? error;
  final String? stackTrace;
  final Duration? duration;

  TestResult({
    required this.id,
    required this.name,
    this.suitePath,
    this.passed = false,
    this.skipped = false,
    this.error,
    this.stackTrace,
    this.duration,
  });
}

/// Main test runner
Future<void> main(List<String> args) async {
  final showAll = args.contains('--all') || args.contains('-a');
  final watchMode = args.contains('--watch') || args.contains('-w');
  final verbose = args.contains('--verbose') || args.contains('-v');
  final testPath = args.where((a) => !a.startsWith('-')).firstOrNull;

  if (watchMode) {
    await runWatchMode(testPath, showAll: showAll, verbose: verbose);
  } else {
    final exitCode = await runTests(
      testPath,
      showAll: showAll,
      verbose: verbose,
    );
    exit(exitCode);
  }
}

/// Run tests once and return exit code
Future<int> runTests(
  String? testPath, {
  bool showAll = false,
  bool verbose = false,
}) async {
  print('${Colors.cyan}${Colors.bold}🧪 Flutter Test Runner${Colors.reset}');
  print(
    '${Colors.dim}─────────────────────────────────────────${Colors.reset}\n',
  );

  final testArgs = ['test', '--reporter', 'json'];
  if (testPath != null) testArgs.add(testPath);

  final process = await Process.start('flutter', testArgs, runInShell: true);

  final tests = <int, TestResult>{};
  final suites = <int, String>{};
  final errors = <int, String>{};
  final stackTraces = <int, String>{};

  int passed = 0;
  int failed = 0;
  int skipped = 0;

  await for (final line
      in process.stdout
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
    try {
      final event = jsonDecode(line) as Map<String, dynamic>;
      final type = event['type'] as String?;

      switch (type) {
        case 'suite':
          final suite = event['suite'] as Map<String, dynamic>;
          suites[suite['id'] as int] = suite['path'] as String? ?? '';
          break;

        case 'testStart':
          final test = event['test'] as Map<String, dynamic>;
          final id = test['id'] as int;
          tests[id] = TestResult(
            id: id,
            name: test['name'] as String? ?? 'Unknown test',
            suitePath: suites[test['suiteID'] as int?],
          );
          break;

        case 'error':
          final testId = event['testID'] as int?;
          if (testId != null) {
            errors[testId] = event['error'] as String? ?? 'Unknown error';
            stackTraces[testId] = event['stackTrace'] as String? ?? '';
          }
          break;

        case 'testDone':
          final testId = event['testID'] as int?;
          final result = event['result'] as String?;
          final hidden = event['hidden'] as bool? ?? false;

          if (testId != null && !hidden) {
            final test = tests[testId];
            if (test != null) {
              final isSkipped = result == 'skipped' || event['skipped'] == true;
              final isPassed = result == 'success';
              final isFailed = result == 'failure' || result == 'error';

              tests[testId] = TestResult(
                id: test.id,
                name: test.name,
                suitePath: test.suitePath,
                passed: isPassed,
                skipped: isSkipped,
                error: errors[testId],
                stackTrace: stackTraces[testId],
                duration: Duration(milliseconds: event['time'] as int? ?? 0),
              );

              if (isSkipped) {
                skipped++;
                if (showAll) {
                  print('${Colors.yellow}⏭️  SKIP${Colors.reset} ${test.name}');
                }
              } else if (isPassed) {
                passed++;
                if (showAll) {
                  print('${Colors.green}✓${Colors.reset} ${test.name}');
                }
              } else if (isFailed) {
                failed++;
                // Always show failures
                _printFailure(tests[testId]!, verbose: verbose);
              }
            }
          }
          break;

        case 'done':
          // Test run complete
          break;
      }
    } catch (_) {
      // Skip non-JSON lines
    }
  }

  // Wait for process to complete
  await process.stderr.drain();
  final exitCode = await process.exitCode;

  // Print summary
  print('');
  print(
    '${Colors.dim}─────────────────────────────────────────${Colors.reset}',
  );
  _printSummary(passed, failed, skipped);

  return failed > 0 ? 1 : exitCode;
}

/// Print a single test failure
void _printFailure(TestResult test, {bool verbose = false}) {
  print('');
  print('${Colors.red}${Colors.bold}❌ FAILED:${Colors.reset} ${test.name}');

  if (test.suitePath != null) {
    // Shorten the path for readability
    final shortPath = test.suitePath!.replaceAll(
      RegExp(r'^.*[/\\]test[/\\]'),
      'test/',
    );
    print('   ${Colors.dim}in $shortPath${Colors.reset}');
  }

  if (test.error != null) {
    // Clean up the error message
    var error = test.error!;

    // Remove ANSI codes from error message
    error = error.replaceAll(RegExp(r'\x1B\[[0-9;]*m'), '');

    // Truncate very long errors unless verbose
    if (!verbose && error.length > 500) {
      error = '${error.substring(0, 500)}...';
    }

    // Indent error lines
    final errorLines = error.split('\n').take(verbose ? 50 : 10);
    for (final line in errorLines) {
      if (line.trim().isNotEmpty) {
        print('   ${Colors.red}→${Colors.reset} $line');
      }
    }
  }

  if (verbose && test.stackTrace != null && test.stackTrace!.isNotEmpty) {
    print('   ${Colors.dim}Stack trace:${Colors.reset}');
    final stackLines = test.stackTrace!.split('\n').take(15);
    for (final line in stackLines) {
      if (line.contains('package:tross_app') || line.contains('test/')) {
        print('   ${Colors.cyan}$line${Colors.reset}');
      }
    }
  }
}

/// Print test summary
void _printSummary(int passed, int failed, int skipped) {
  final total = passed + failed + skipped;

  print('');
  print('${Colors.bold}📊 RESULTS:${Colors.reset}');

  if (failed == 0) {
    print(
      '   ${Colors.green}${Colors.bold}✅ ALL $passed TESTS PASSED${Colors.reset}',
    );
  } else {
    print('   ${Colors.green}✓ Passed:${Colors.reset}  $passed');
    print('   ${Colors.red}✗ Failed:${Colors.reset}  $failed');
  }

  if (skipped > 0) {
    print('   ${Colors.yellow}⏭ Skipped:${Colors.reset} $skipped');
  }

  print('   ${Colors.dim}Total:    $total${Colors.reset}');
  print('');

  if (failed > 0) {
    print('${Colors.red}${Colors.bold}❌ TEST RUN FAILED${Colors.reset}');
  } else {
    print('${Colors.green}${Colors.bold}✅ TEST RUN PASSED${Colors.reset}');
  }
}

/// Watch mode - re-run tests on file changes
Future<void> runWatchMode(
  String? testPath, {
  bool showAll = false,
  bool verbose = false,
}) async {
  print(
    '${Colors.cyan}${Colors.bold}👀 Watch Mode - Press Ctrl+C to exit${Colors.reset}\n',
  );

  while (true) {
    await runTests(testPath, showAll: showAll, verbose: verbose);

    print(
      '\n${Colors.dim}Waiting for file changes... (Ctrl+C to exit)${Colors.reset}\n',
    );

    // Simple polling - watch lib/ and test/ directories
    final lastRun = DateTime.now();

    while (true) {
      await Future.delayed(const Duration(seconds: 2));

      if (await _hasFileChanges(lastRun)) {
        print(
          '${Colors.cyan}📝 File change detected, re-running tests...${Colors.reset}\n',
        );
        break;
      }
    }
  }
}

/// Check if any Dart files changed since lastRun
Future<bool> _hasFileChanges(DateTime lastRun) async {
  final dirs = [Directory('lib'), Directory('test')];

  for (final dir in dirs) {
    if (!dir.existsSync()) continue;

    await for (final entity in dir.list(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        final stat = await entity.stat();
        if (stat.modified.isAfter(lastRun)) {
          return true;
        }
      }
    }
  }

  return false;
}
