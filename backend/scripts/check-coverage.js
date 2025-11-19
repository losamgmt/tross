#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 *
 * Reads coverage/coverage-summary.json and validates against thresholds.
 * Exits with code 1 if any threshold is not met.
 *
 * Usage:
 *   node scripts/check-coverage.js [--threshold=80]
 */

const fs = require('fs');
const path = require('path');

// Parse command line args
const args = process.argv.slice(2);
const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
const THRESHOLD = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 80;

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');

function checkCoverage() {
  console.log('\n📊 Coverage Threshold Check');
  console.log(`Required: ${THRESHOLD}% for all metrics\n`);

  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found:', COVERAGE_FILE);
    console.error('   Run "npm run test:coverage" first to generate coverage data.');
    process.exit(1);
  }

  // Read coverage summary
  let coverageData;
  try {
    coverageData = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse coverage file:', error.message);
    process.exit(1);
  }

  // Extract global totals
  const total = coverageData.total;
  if (!total) {
    console.error('❌ Invalid coverage data: missing "total" field');
    process.exit(1);
  }

  // Check each metric
  const metrics = ['lines', 'statements', 'functions', 'branches'];
  const results = [];
  let allPassed = true;

  metrics.forEach(metric => {
    const data = total[metric];
    if (!data) {
      console.error(`❌ Missing metric: ${metric}`);
      process.exit(1);
    }

    const percentage = data.pct;
    const passed = percentage >= THRESHOLD;
    allPassed = allPassed && passed;

    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';

    results.push({
      metric: metric.padEnd(12),
      percentage: percentage.toFixed(2),
      status: status,
      icon: icon,
      covered: data.covered,
      total: data.total,
    });
  });

  // Display results
  console.log('Metric       Coverage    Status    Covered/Total');
  console.log('─'.repeat(55));

  results.forEach(r => {
    console.log(
      `${r.metric} ${r.percentage.padStart(6)}%     ${r.icon} ${r.status}      ${r.covered}/${r.total}`,
    );
  });

  console.log('─'.repeat(55));

  // Final verdict
  if (allPassed) {
    console.log('\n✅ All coverage thresholds met!\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Coverage thresholds not met. Required: ${THRESHOLD}%\n`);
    process.exit(1);
  }
}

// Run the check
checkCoverage();
