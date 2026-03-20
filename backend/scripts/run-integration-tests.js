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

// Run Jest with integration config
const result = spawnSync(
  'npx',
  ['jest', '--selectProjects', 'integration', '--forceExit'],
  {
    stdio: 'pipe',
    shell: true,
    cwd: __dirname + '/..',
    encoding: 'utf-8',
  },
);

// Combine stdout and stderr
const output = result.stdout + result.stderr;

// Print stdout (test output)
if (result.stdout) {
  process.stdout.write(result.stdout);
}

// Check if all tests passed
const testMatch = output.match(/Test Suites:\s*(\d+)\s*passed,\s*(\d+)\s*total/);
const allTestsPassed = testMatch && testMatch[1] === testMatch[2];

// Check for real errors (not the pg Connection terminated warning)
const hasConnectionTerminated = output.includes('Connection terminated');
const hasRealError = result.status !== 0 && !hasConnectionTerminated;

// Print stderr only if it contains real errors (not Connection terminated noise)
if (result.stderr) {
  const lines = result.stderr.split('\n');
  const filteredLines = lines.filter(
    (line) =>
      !line.includes('Connection terminated') &&
      !line.includes('Error.captureStackTrace') &&
      !line.includes('node_modules/pg/lib/client.js'),
  );
  if (filteredLines.join('').trim()) {
    process.stderr.write(filteredLines.join('\n'));
  }
}

// Exit based on test results
if (allTestsPassed) {
  if (hasConnectionTerminated) {
    console.log('\n✅ All tests passed (pg cleanup warning suppressed)');
  }
  process.exit(0);
} else if (hasRealError) {
  console.error('\n❌ Tests failed');
  process.exit(1);
} else {
  process.exit(result.status);
}
