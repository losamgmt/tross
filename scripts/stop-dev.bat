@echo off
REM Tross Development Cleanup Script
echo.
echo ========================================
echo  Tross Development Cleanup
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Get ports from centralized config
for /f %%i in ('node scripts/ports-helper.js backend') do set BACKEND_PORT=%%i
for /f %%i in ('node scripts/ports-helper.js frontend') do set FRONTEND_PORT=%%i

echo 🛑 Stopping all Tross processes...
echo.

REM Use our professional port killer
node scripts/kill-port.js %BACKEND_PORT% %FRONTEND_PORT%

echo.
echo 🧹 Cleaning up any remaining Flutter/Dart processes...
taskkill /f /im "flutter.exe" >nul 2>&1
taskkill /f /im "dart.exe" >nul 2>&1
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq Tross*" >nul 2>&1

echo.
echo ✅ Cleanup complete! All Tross processes stopped.
echo.
pause