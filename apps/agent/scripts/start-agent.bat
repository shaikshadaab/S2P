@echo off
setlocal
title SOS Print Worker Agent - Shakeel Online Services
cd /d "%~dp0"
echo ========================================================
echo   SOS Print Worker Agent - Shakeel Online Services
echo ========================================================
echo.
if not exist "S2P.Agent.Worker.exe" (
    echo [ERROR] S2P.Agent.Worker.exe not found!
    pause
    exit /b 1
)

:: Runs agent connecting to production backend (if unpaired, prompts interactively for code)
S2P.Agent.Worker.exe --url https://sos-print.vercel.app %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo Agent exited with status code %ERRORLEVEL%.
    pause
)
