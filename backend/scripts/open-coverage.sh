#!/bin/bash

# Coverage HTML Report Opener
# Opens the coverage HTML report in the default browser

COVERAGE_DIR="coverage"
INDEX_FILE="$COVERAGE_DIR/lcov-report/index.html"

if [ ! -f "$INDEX_FILE" ]; then
  echo "❌ Coverage report not found: $INDEX_FILE"
  echo "   Run 'npm run test:coverage' first to generate the report."
  exit 1
fi

echo "📊 Opening coverage report in browser..."

# Detect OS and open appropriately
case "$(uname -s)" in
  Darwin*)
    open "$INDEX_FILE"
    ;;
  Linux*)
    xdg-open "$INDEX_FILE" 2>/dev/null || sensible-browser "$INDEX_FILE" 2>/dev/null
    ;;
  CYGWIN*|MINGW*|MSYS*)
    start "$INDEX_FILE"
    ;;
  *)
    echo "⚠️  Could not detect OS. Please open manually:"
    echo "   file://$(pwd)/$INDEX_FILE"
    exit 1
    ;;
esac

echo "✅ Coverage report opened"
