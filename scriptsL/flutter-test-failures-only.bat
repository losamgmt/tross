@echo off
REM Quick Failure Finder - Shows ONLY failing tests
REM Usage: Run from frontend\ directory

echo Running tests to find failures...
echo Tests will timeout after 10 seconds each
echo.

flutter test --timeout=10s --reporter=expanded 2>&1 | findstr /C:"✗" /C:"FAILED" /C:"Expected:" /C:"Actual:" /C:"Test timed out"

echo.
echo Run complete. Failures shown above.
