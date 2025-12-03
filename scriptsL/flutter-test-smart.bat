@echo off
REM Smart Test Runner for Windows - Fast failing, isolated suites
REM Run from: frontend\ directory

setlocal enabledelayedexpansion

echo ========================================
echo   TrossApp Frontend Test Suite
echo   10 second timeout per test
echo ========================================
echo.

set TOTAL_PASSED=0
set TOTAL_FAILED=0
set TOTAL_SKIPPED=0
set FAILED_SUITE=

REM Test suites in order: fast -^> slow
set SUITES=test/models test/utils test/core test/config test/helpers test/mocks test/services test/providers test/widgets/atoms test/widgets/molecules test/widgets/organisms test/screens test/integration

for %%S in (%SUITES%) do (
  if exist %%S (
    echo [94m► Running: %%S[0m
    
    REM Run tests with 10s timeout per test
    flutter test %%S --timeout=10s --reporter=compact > test_output.tmp 2>&1
    
    if !ERRORLEVEL! EQU 0 (
      echo [92m✓ %%S passed[0m
      echo.
    ) else (
      echo [91m✗ %%S FAILED[0m
      echo.
      echo ========================================
      echo   FAILURE DETECTED - STOPPING TESTS
      echo ========================================
      echo.
      echo Failed suite: %%S
      echo.
      echo To run just this suite:
      echo   flutter test %%S --reporter=expanded
      echo.
      type test_output.tmp
      del test_output.tmp
      exit /b 1
    )
  ) else (
    echo [93m⊘ Skipping %%S (not found)[0m
  )
)

del test_output.tmp 2>nul

echo ========================================
echo   ✓ ALL TEST SUITES PASSED
echo ========================================
echo.
echo Ready to commit!
