@echo off
setlocal
title SOS Print - Pair Windows PC (Shakeel Online Services)
cd /d "%~dp0"
echo ========================================================
echo   SOS Print Agent Pairing - Shakeel Online Services
echo ========================================================
echo.
echo 1. Open Owner Dashboard: https://sos-print.vercel.app/dashboard/printers
echo 2. Click "Generate 6-Digit Pairing Code"
echo.
set /p PAIR_CODE="Enter 6-digit Pairing Code: "

if "%PAIR_CODE%"=="" (
    echo.
    echo [ERROR] Pairing code cannot be empty.
    pause
    exit /b 1
)

echo.
echo Connecting to production backend (https://sos-print.vercel.app)...
S2P.Agent.Worker.exe --pair %PAIR_CODE% --url https://sos-print.vercel.app
echo.
echo If pairing was successful, run 'start-agent.bat' to begin print operations.
pause
