#!/bin/bash
# Smart Test Runner - Fast failing, isolated suites, visible progress
# Run from: frontend/ directory

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test suites in order: fast -> slow
SUITES=(
  "test/models"
  "test/utils"
  "test/core"
  "test/config"
  "test/helpers"
  "test/mocks"
  "test/services"
  "test/providers"
  "test/widgets/atoms"
  "test/widgets/molecules"
  "test/widgets/organisms"
  "test/screens"
  "test/integration"
)

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  TrossApp Frontend Test Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0
FAILED_SUITES=()

for SUITE in "${SUITES[@]}"; do
  # Check if suite directory exists
  if [ ! -d "$SUITE" ]; then
    echo -e "${YELLOW}⊘ Skipping $SUITE (not found)${NC}"
    continue
  fi
  
  echo -e "${BLUE}▶ Running: $SUITE${NC}"
  
  # Run suite with compact reporter and capture output
  if flutter test "$SUITE" --reporter=compact 2>&1 | tee /tmp/test_output.txt; then
    # Extract counts from output
    PASSED=$(grep -oP '\+\K\d+' /tmp/test_output.txt | tail -1 || echo "0")
    SKIPPED=$(grep -oP '~\K\d+' /tmp/test_output.txt | tail -1 || echo "0")
    
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
    
    echo -e "${GREEN}✓ $SUITE passed ($PASSED tests)${NC}"
  else
    # Test suite failed
    FAILED=$(grep -oP '\-\K\d+' /tmp/test_output.txt | tail -1 || echo "?")
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
    FAILED_SUITES+=("$SUITE")
    
    echo -e "${RED}✗ $SUITE FAILED ($FAILED failures)${NC}"
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}  FAILURE DETECTED - STOPPING TESTS${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Failed suite: $SUITE${NC}"
    echo ""
    echo "To run just this suite:"
    echo -e "${BLUE}  flutter test $SUITE --reporter=expanded${NC}"
    echo ""
    echo "To see detailed failure:"
    echo -e "${BLUE}  cat /tmp/test_output.txt${NC}"
    echo ""
    
    exit 1  # Fail fast
  fi
  
  echo ""
done

# Success summary
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ ALL TEST SUITES PASSED${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "Passed:  ${GREEN}$TOTAL_PASSED${NC}"
echo -e "Skipped: ${YELLOW}$TOTAL_SKIPPED${NC}"
echo -e "Failed:  ${RED}$TOTAL_FAILED${NC}"
echo ""
echo -e "${GREEN}Ready to commit!${NC}"
