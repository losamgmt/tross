@echo off
REM TrossApp Development Startup Script with Port Management
echo.
echo ========================================
echo  TrossApp Development Environment
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Check port availability
echo 🔍 Checking port availability...
node scripts/check-ports.js 3001 8080 2>nul
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
    node scripts/kill-port.js 3001 8080
    timeout /t 2 /nobreak >nul
)

echo.
echo 🚀 Starting development servers...
echo.

REM Start backend
echo � Starting backend server (port 3001)...
start "TrossApp Backend" cmd /k "cd /d "%~dp0.." && npm run dev --workspace=backend"
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🎨 Starting Flutter frontend (port 8080)...
start "TrossApp Frontend" cmd /k "cd /d "%~dp0.." && npm run dev:frontend:win"

echo.
echo ✅ Development environment starting!
echo.
echo 🌐 Backend:  http://localhost:3001/api/health
echo 🎯 Frontend: http://localhost:8080
echo.
echo 📝 Logs are in respective terminal windows
echo 🛑 To stop: Use Ctrl+C in terminal windows or run stop-dev.bat
echo.
pause