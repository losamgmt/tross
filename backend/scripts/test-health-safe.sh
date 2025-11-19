#!/bin/bash
# Safe test runner for health.test.js with timeout and logging
#
# This script runs health tests with:
# - 30 second hard timeout (kills if hanging)
# - Verbose output capture
# - Clear success/failure reporting

set -e

echo "============================================"
echo "SAFE TEST RUNNER: health.test.js"
echo "============================================"
echo "Time: $(date)"
echo "PWD: $(pwd)"
echo ""

# Set test environment
export NODE_ENV=test
export CI=true

echo "Running health tests with 30s timeout..."
echo ""

# Run with timeout - if hangs, kill after 30s
timeout 30s npm run test:unit -- __tests__/unit/routes/health.test.js \
  --verbose \
  --no-coverage \
  --runInBand \
  2>&1 | tee test-health-output.log

EXIT_CODE=$?

echo ""
echo "============================================"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ TESTS PASSED"
elif [ $EXIT_CODE -eq 124 ]; then
  echo "❌ TESTS TIMED OUT (30s exceeded - likely hanging)"
  echo "Check test-health-output.log for last output before hang"
else
  echo "❌ TESTS FAILED (exit code: $EXIT_CODE)"
fi
echo "============================================"
echo ""
echo "Output saved to: test-health-output.log"
echo ""

exit $EXIT_CODE
