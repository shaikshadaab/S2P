@echo off
title Vintha Print - Windows Desktop Agent
color 0D
echo ===================================================================
echo             VINTHA PRINT - WINDOWS PRINT AGENT (100% FREE)
echo                   Scan * Upload * Free Print
echo ===================================================================
echo.
echo [1/3] Verifying Node.js and Electron runtime...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required. Download from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Checking Agent Configuration...
set AGENT_DIR=%~dp0
cd /d "%AGENT_DIR%"

echo [3/3] Launching Vintha Silent Print Spooler...
call npx.cmd electron .
if %errorlevel% neq 0 (
    echo.
    echo [NOTE] Running fallback runner...
    node dist/main/index.js
)
pause
