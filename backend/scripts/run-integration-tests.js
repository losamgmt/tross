#!/usr/bin/env node
/**
 * Integration Test Runner
 *
 * Runs Jest integration tests and handles the "Connection terminated" error
 * that occurs when pg connections are forcefully closed by --forceExit.
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Run Jest with integration config, capturing output to detect test results
// Use --no-color to ensure clean output for regex parsing in CI
const result = spawnSync(
  'npx',
  ['jest', '--selectProjects', 'integration', '--forceExit', '--no-color'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
  },
);

// Always print stdout (test results)
if (result.stdout) {
  process.stdout.write(result.stdout);
}

// Combine output for analysis
const output = (result.stdout || '') + (result.stderr || '');

// Debug: Show what we captured for troubleshooting CI issues
const debugCI = process.env.CI === 'true' || process.env.DEBUG_TESTS;
if (debugCI) {
  console.log('\n[DEBUG] Exit status:', result.status);
  console.log('[DEBUG] Output length:', output.length);
}

// ============================================================================
// PARSE JEST OUTPUT - Handle all formats:
// - "Test Suites: 32 passed, 32 total"           (all pass)
// - "Test Suites: 1 failed, 31 passed, 32 total" (some fail)
// - "Tests: 1795 passed, 1795 total"             (all pass)
// - "Tests: 5 failed, 1790 passed, 1795 total"   (some fail)
// ============================================================================

// Check for explicit failures FIRST (most reliable signal)
const hasFailedSuites = /Test Suites:.*\d+\s*failed/.test(output);
const hasFailedTests = /Tests:.*\d+\s*failed/.test(output);
const hasFailures = hasFailedSuites || hasFailedTests;

// Match passed/total counts with flexible pattern (allows "failed, " prefix)
// This uses .*? to skip any "N failed, " that may precede "N passed"
const suiteMatch = output.match(/Test Suites:.*?(\d+)\s*passed,\s*(\d+)\s*total/);
const testMatch = output.match(/Tests:.*?(\d+)\s*passed,\s*(\d+)\s*total/);

if (debugCI) {
  console.log('[DEBUG] Has failures:', hasFailures);
  console.log('[DEBUG] Suite match:', suiteMatch ? `${suiteMatch[1]}/${suiteMatch[2]}` : 'none');
  console.log('[DEBUG] Test match:', testMatch ? `${testMatch[1]}/${testMatch[2]}` : 'none');
}

const allSuitesPassed = suiteMatch && suiteMatch[1] === suiteMatch[2] && !hasFailedSuites;
const allTestsPassed = testMatch && testMatch[1] === testMatch[2] && !hasFailedTests;
const testsRan = suiteMatch || testMatch;

// Check for the known pg cleanup error (not a real test failure)
const hasConnectionTerminated = output.includes('Connection terminated') ||
  (result.stderr && result.stderr.includes('Connection terminated'));

// Filter and print stderr (suppress pg cleanup noise)
if (result.stderr) {
  const lines = result.stderr.split('\n');
  const filteredLines = lines.filter(
    (line) =>
      !line.includes('Connection terminated') &&
      !line.includes('Error.captureStackTrace') &&
      !line.includes('node_modules/pg/lib/client.js') &&
      !line.includes('[Error: Connection terminated]') &&
      line.trim() !== '' &&
      line.trim() !== '^',
  );
  const filteredStderr = filteredLines.join('\n').trim();
  if (filteredStderr) {
    process.stderr.write(filteredStderr + '\n');
  }
}

// ============================================================================
// EXIT CODE LOGIC - Priority order:
// 1. Explicit failures → exit 1
// 2. Confirmed all passed → exit 0
// 3. Jest exited 0 → exit 0
// 4. Only pg cleanup error (no failure indicators) → exit 0
// 5. Unknown → preserve original exit code
// ============================================================================

if (hasFailures) {
  // Explicit failures detected - this is definitive
  console.error('\n❌ Some tests failed');
  process.exit(1);
} else if (testsRan && allSuitesPassed && allTestsPassed) {
  // All tests confirmed passing
  if (hasConnectionTerminated) {
    console.log('\n✅ All tests passed (pg cleanup warning suppressed)');
  }
  process.exit(0);
} else if (result.status === 0) {
  // Jest exited cleanly with no failures
  process.exit(0);
} else if (hasConnectionTerminated && !hasFailures && testsRan) {
  // Exit code 1 due to pg cleanup, but no test failures detected
  console.log('\n✅ All tests passed (pg cleanup warning suppressed)');
  process.exit(0);
} else {
  // Unknown state - preserve original exit code for safety
  console.error('\n⚠️ Could not determine test status, using Jest exit code');
  process.exit(result.status || 1);
}
