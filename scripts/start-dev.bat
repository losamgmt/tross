@echo off
REM Tross Development Startup Script with Port Management
echo.
echo ========================================
echo  Tross Development Environment
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Get ports from centralized config
for /f %%i in ('node scripts/ports-helper.js backend') do set BACKEND_PORT=%%i
for /f %%i in ('node scripts/ports-helper.js frontend') do set FRONTEND_PORT=%%i

REM Check port availability
echo 🔍 Checking port availability...
node scripts/check-ports.js %BACKEND_PORT% %FRONTEND_PORT% 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Ports in use detected!
    echo Would you like to kill existing processes? (Y/N)
    choice /C YN /N
    if errorlevel 2 (
        echo ❌ Startup cancelled
        exit /b 1
    )
    echo 🧹 Cleaning up ports...
    node scripts/kill-port.js %BACKEND_PORT% %FRONTEND_PORT%
    timeout /t 2 /nobreak >nul
)

echo.
echo 🚀 Starting development servers...
echo.

REM Start backend
echo � Starting backend server (port %BACKEND_PORT%)...
start "Tross Backend" cmd /k "cd /d "%~dp0.." && npm run dev --workspace=backend"
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🎨 Starting Flutter frontend (port %FRONTEND_PORT%)...
start "Tross Frontend" cmd /k "cd /d "%~dp0.." && npm run dev:frontend:win"

echo.
echo ✅ Development environment starting!
echo.
echo 🌐 Backend:  http://localhost:%BACKEND_PORT%/api/health
echo 🎯 Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo 📝 Logs are in respective terminal windows
echo 🛑 To stop: Use Ctrl+C in terminal windows or run stop-dev.bat
echo.
pause