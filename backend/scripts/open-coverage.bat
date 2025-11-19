@echo off
REM Coverage HTML Report Opener (Windows)
REM Opens the coverage HTML report in the default browser

set COVERAGE_DIR=coverage
set INDEX_FILE=%COVERAGE_DIR%\lcov-report\index.html

if not exist "%INDEX_FILE%" (
  echo ❌ Coverage report not found: %INDEX_FILE%
  echo    Run 'npm run test:coverage' first to generate the report.
  exit /b 1
)

echo 📊 Opening coverage report in browser...
start "" "%INDEX_FILE%"
echo ✅ Coverage report opened
