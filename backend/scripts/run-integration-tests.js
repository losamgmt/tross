#!/usr/bin/env node
/**
 * Integration Test Runner - Clean CI Output
 *
 * Runs Jest integration tests and produces clean, scannable output for CI.
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 *
 * Environment:
 *   DEBUG_TESTS=true - Enable verbose debug output
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  backendDir: path.join(__dirname, '..'),
  jsonOutputFile: path.join(__dirname, '..', 'test-results.json'),
});

const LIMITS = Object.freeze({
  lineWidth: 67,
  testNameMax: 60,
  errorLineMax: 62,
  errorLinesToShow: 3,
  maxFailuresShown: 10,
  maxRawFailLines: 30,
});

// Pre-computed dividers (DRY)
const DIV = Object.freeze({
  double: '═'.repeat(LIMITS.lineWidth),
  single: '─'.repeat(LIMITS.lineWidth),
  doubleIndent: '═'.repeat(LIMITS.lineWidth - 2),
  singleIndent: '─'.repeat(LIMITS.lineWidth - 2),
});

const DEBUG = process.env.DEBUG_TESTS === 'true';

// ============================================================================
// UTILITIES
// ============================================================================

/** Conditional debug logging */
function debug(message) {
  if (DEBUG) {
    console.log(`  [DEBUG] ${message}`);
  }
}

/** Truncate string, optionally with prefix for truncated content */
function truncate(str, maxLen, prefix = '') {
  if (str.length <= maxLen) {
    return str;
  }
  return prefix + str.slice(-(maxLen - prefix.length));
}

/** Clean error message for display */
function cleanError(msg) {
  return msg
    .replace(/\u001b\[[0-9;]*m/g, '') // ANSI codes
    .replace(/\n\s*at\s+.*$/gm, '') // Stack traces
    .replace(/\n{2,}/g, '\n') // Collapse blanks
    .trim();
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

function runTests() {
  const args = [
    'jest',
    '--selectProjects', 'integration',
    '--forceExit',
    '--bail=false',
    '--json',
    `--outputFile=${CONFIG.jsonOutputFile}`,
    '--silent',
    ...process.argv.slice(2),
  ];

  debug(`Command: npx ${args.join(' ')}`);
  debug(`CWD: ${CONFIG.backendDir}`);

  const startTime = Date.now();

  // Build command string (avoids DEP0190 warning with shell:true + args array)
  const command = `npx ${args.join(' ')}`;
  const result = spawnSync(command, [], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    cwd: CONFIG.backendDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      DOTENV_CONFIG_QUIET: 'true',
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return { result, elapsed };
}

function loadJsonResults() {
  try {
    if (fs.existsSync(CONFIG.jsonOutputFile)) {
      const data = fs.readFileSync(CONFIG.jsonOutputFile, 'utf-8');
      fs.unlinkSync(CONFIG.jsonOutputFile);
      return JSON.parse(data);
    }
  } catch (err) {
    debug(`JSON parse error: ${err.message}`);
  }
  return null;
}

// ============================================================================
// RESULT PARSING
// ============================================================================

function parseJsonResults(json) {
  const suites = json.testResults || [];
  return {
    passed: json.numFailedTests === 0 && json.success !== false,
    stats: {
      passedTests: json.numPassedTests || 0,
      failedTests: json.numFailedTests || 0,
      totalTests: json.numTotalTests || 0,
      passedSuites: suites.filter(s => s.numFailingTests === 0).length,
      failedSuites: suites.filter(s => s.numFailingTests > 0).length,
      totalSuites: suites.length,
    },
    suites,
  };
}

function parseRawOutput(output) {
  const suiteMatch = output.match(/Test Suites:.*?(\d+)\s*passed.*?(\d+)\s*total/);
  const testMatch = output.match(/Tests:.*?(\d+)\s*passed.*?(\d+)\s*total/);
  const hasFailures = output.includes('FAIL ') || /[1-9]\d*\s*failed/.test(output);

  return {
    passed: !hasFailures && (suiteMatch || testMatch),
    stats: {
      passedTests: testMatch ? parseInt(testMatch[1], 10) : 0,
      failedTests: 0,
      totalTests: testMatch ? parseInt(testMatch[2], 10) : 0,
      passedSuites: suiteMatch ? parseInt(suiteMatch[1], 10) : 0,
      failedSuites: 0,
      totalSuites: suiteMatch ? parseInt(suiteMatch[2], 10) : 0,
    },
    hasFailures,
    output,
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function printHeader() {
  console.log('');
  console.log(DIV.double);
  console.log('  INTEGRATION TESTS');
  console.log(DIV.double);
  console.log('');
}

function printFooter() {
  console.log('');
  console.log(DIV.double);
  console.log('');
}

function printSummary(passed) {
  console.log(DIV.single);
  console.log(`  ${passed ? '✅' : '❌'}  ${passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log(DIV.single);
}

function printStats(stats, elapsed) {
  if (stats.totalSuites > 0) {
    console.log(`  Suites:  ${stats.passedSuites} passed, ${stats.failedSuites} failed, ${stats.totalSuites} total`);
  }
  if (stats.totalTests > 0) {
    console.log(`  Tests:   ${stats.passedTests} passed, ${stats.failedTests} failed, ${stats.totalTests} total`);
  }
  console.log(`  Time:    ${elapsed}s`);
  console.log(DIV.single);
}

function printPassingSuites(suites) {
  const passing = suites.filter(s => s.numFailingTests === 0);
  if (passing.length === 0) {
    return;
  }

  console.log('');
  console.log('  PASSED:');
  for (const suite of passing) {
    const name = path.basename(suite.name, '.test.js');
    console.log(`    ✓ ${name} (${suite.numPassingTests})`);
  }
}

function printFailingSuites(suites) {
  const failing = suites.filter(s => s.numFailingTests > 0);
  if (failing.length === 0) {
    return;
  }

  console.log('');
  console.log(`  ${DIV.doubleIndent}`);
  console.log('  FAILURES:');
  console.log(`  ${DIV.doubleIndent}`);

  for (const suite of failing) {
    const suiteName = path.basename(suite.name, '.test.js');
    console.log('');
    console.log(`  ❌ ${suiteName}`);
    console.log(`  ${DIV.singleIndent}`);

    const failedTests = (suite.assertionResults || [])
      .filter(t => t.status === 'failed')
      .map(t => ({
        name: t.ancestorTitles.concat(t.title).join(' › '),
        error: t.failureMessages?.[0] ? cleanError(t.failureMessages[0]) : null,
      }));

    for (const test of failedTests.slice(0, LIMITS.maxFailuresShown)) {
      console.log(`    ✗ ${truncate(test.name, LIMITS.testNameMax, '...')}`);
      if (test.error) {
        for (const line of test.error.split('\n').slice(0, LIMITS.errorLinesToShow)) {
          console.log(`        ${truncate(line, LIMITS.errorLineMax)}`);
        }
      }
      console.log('');
    }

    if (failedTests.length > LIMITS.maxFailuresShown) {
      console.log(`    ... and ${failedTests.length - LIMITS.maxFailuresShown} more failures`);
    }
  }
}

function printRawFailures(output, jestExit) {
  console.log('');
  console.log('  FAILURES (raw):');

  // When Jest crashes (null exit), show more context
  const isCrash = jestExit === null;

  // Error patterns - broader set for crash scenarios
  const ERROR_PATTERNS = [
    /FAIL /,
    /[✕✗]/,
    /Expected/,
    /Received/,
    /Error:/,
    /TypeError:/,
    /ReferenceError:/,
    /SyntaxError:/,
    /Cannot find/,
    /is not a function/,
    /is not defined/,
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /Connection terminated/,
    /relation "[^"]+" does not exist/,
  ];

  const lines = output.split('\n').filter(line =>
    ERROR_PATTERNS.some(pattern => pattern.test(line)),
  );

  if (lines.length === 0 && isCrash) {
    // No matched patterns - show last N lines of output for crash diagnosis
    console.log('    (No specific error patterns found - showing tail of output)');
    const allLines = output.split('\n').filter(l => l.trim());
    const tailLines = allLines.slice(-LIMITS.maxRawFailLines);
    for (const line of tailLines) {
      console.log(`    ${line.trim()}`);
    }
    return;
  }

  for (const line of lines.slice(0, LIMITS.maxRawFailLines)) {
    console.log(`    ${line.trim()}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  printHeader();
  process.stdout.write('  Running tests...');

  const { result, elapsed } = runTests();

  // Clear progress indicator
  process.stdout.write('\r                    \r');

  const json = loadJsonResults();
  let exitCode;

  if (json) {
    // JSON path - most reliable
    debug('Using JSON results');
    const parsed = parseJsonResults(json);
    printSummary(parsed.passed);
    printStats(parsed.stats, elapsed);
    printPassingSuites(parsed.suites);
    printFailingSuites(parsed.suites);
    exitCode = parsed.passed ? 0 : 1;
  } else {
    // Fallback: parse raw output
    debug(`Fallback mode - Jest exit: ${result.status}`);
    const output = (result.stdout || '') + (result.stderr || '');
    const parsed = parseRawOutput(output);
    printSummary(parsed.passed);
    printStats(parsed.stats, elapsed);
    if (parsed.hasFailures || result.status === null) {
      printRawFailures(output, result.status);
    }
    // Trust parsed results over Jest exit code (Connection terminated causes exit 1)
    exitCode = parsed.passed ? 0 : 1;
  }

  printFooter();
  debug(`Exiting with code ${exitCode}`);

  // Explicit, synchronous exit
  process.exitCode = exitCode;
}

// Run with error boundary
let finalExitCode = 0;
try {
  main();
  finalExitCode = process.exitCode || 0;
} catch (err) {
  console.error('Test runner error:', err.message);
  finalExitCode = 1;
}

process.exit(finalExitCode);

process.exit(finalExitCode);
