@echo off
REM TrossApp Development Cleanup Script
echo.
echo ========================================
echo  TrossApp Development Cleanup
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

echo 🛑 Stopping all TrossApp processes...
echo.

REM Use our professional port killer
node scripts/kill-port.js 3001 8080

echo.
echo 🧹 Cleaning up any remaining Flutter/Dart processes...
taskkill /f /im "flutter.exe" >nul 2>&1
taskkill /f /im "dart.exe" >nul 2>&1
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq TrossApp*" >nul 2>&1

echo.
echo ✅ Cleanup complete! All TrossApp processes stopped.
echo.
pause