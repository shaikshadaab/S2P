@echo off
setlocal enabledelayedexpansion
title SOS Print Station Launcher - Shakeel Online Services
cd /d "%~dp0"

echo ========================================================
echo   SOS PRINT STATION LAUNCHER - SHAKEEL ONLINE SERVICES
echo ========================================================
echo  All-in-one launcher: Tunnel + Agent + Physical Spooler
echo ========================================================
echo.

:: 1. Prevent duplicate running instances
echo [1/5] Checking for running instances...
set "FOUND_RUNNING=0"
tasklist /fi "imagename eq S2P.Agent.Worker.exe" 2>nul | find /i "S2P.Agent.Worker.exe" >nul && set "FOUND_RUNNING=1"
tasklist /fi "imagename eq cloudflared.exe" 2>nul | find /i "cloudflared.exe" >nul && set "FOUND_RUNNING=1"

if "!FOUND_RUNNING!"=="1" (
    echo [NOTICE] Found existing agent or tunnel processes already active.
    echo Stopping old instances to prevent port collisions and double-leases...
    taskkill /f /im S2P.Agent.Worker.exe >nul 2>&1
    taskkill /f /im cloudflared.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo Previous instances cleanly stopped.
) else (
    echo No conflicting instances found.
)
echo.

:: 2. Check prerequisites
echo [2/5] Checking station prerequisites...
if not exist "S2P.Agent.Worker.exe" (
    echo [ERROR] S2P.Agent.Worker.exe not found in this folder!
    echo Please make sure you extracted all files from SOS-Print-Agent-Package.zip.
    echo.
    pause
    exit /b 1
)

if not exist "cloudflared.exe" (
    echo [INFO] Cloudflare tunnel executable 'cloudflared.exe' not found.
    echo Downloading portable cloudflared.exe from Cloudflare Zero Trust...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    if not exist "cloudflared.exe" (
        echo [ERROR] Failed to download cloudflared.exe. Please check internet connection.
        pause
        exit /b 1
    )
    echo Download completed.
)
echo All station executables verified.
echo.

:: 3. Launch Free HTTPS Tunnel
echo [3/5] Starting Cloudflare Free Tunnel for port 5218...
if exist "tunnel-url.txt" del /f /q "tunnel-url.txt"
if exist "tunnel.log" del /f /q "tunnel.log"

start /b "" cloudflared.exe tunnel --url http://127.0.0.1:5218 --logfile tunnel.log >nul 2>&1

echo Obtaining secure public HTTPS endpoint (timeout 25s)...
powershell -Command "$timeout = 25; $sw = [Diagnostics.Stopwatch]::StartNew(); while($sw.Elapsed.TotalSeconds -lt $timeout){ if(Test-Path 'tunnel.log'){ $match = Select-String -Path 'tunnel.log' -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; if($match){ $url = $match.Matches[0].Value; Set-Content -Path 'tunnel-url.txt' -Value $url; Write-Host ''; Write-Host '========================================================' -ForegroundColor Green; Write-Host ' [SUCCESS] LIVE TUNNEL HTTPS URL GENERATED:' -ForegroundColor Green; Write-Host ('  ' + $url) -ForegroundColor Yellow; Write-Host '========================================================' -ForegroundColor Green; Write-Host ''; break; } } Start-Sleep -Milliseconds 500 }; if(-not (Test-Path 'tunnel-url.txt')){ Write-Host '[WARNING] Could not auto-extract trycloudflare URL from log. Check tunnel.log' -ForegroundColor Red; }"

set "TUNNEL_URL="
if exist "tunnel-url.txt" (
    set /p TUNNEL_URL=<tunnel-url.txt
)

set "EXTRA_ARGS="
if defined TUNNEL_URL (
    set EXTRA_ARGS=--upload-url "!TUNNEL_URL!"
)

:: 4. Check Pairing Status
echo [4/5] Checking Windows pairing status...
set "CRED_FILE=%LOCALAPPDATA%\S2P\credentials.dat"
if exist "!CRED_FILE!" (
    echo [STATUS] Paired credentials found. Auto-connecting to shop queue...
) else (
    echo [STATUS] Unpaired device.
    echo 1. Open Guided Setup: https://sos-print.vercel.app/dashboard/setup
    echo 2. Click 'Pair New Windows PC' to obtain a 6-digit code.
    echo 3. The agent will prompt for this code below.
)
echo.

:: 5. Launch Agent Worker
echo [5/5] Starting SOS Print Worker Agent...
echo Station: %COMPUTERNAME%
if defined TUNNEL_URL (
    echo Tunnel:  !TUNNEL_URL!
)
echo Backend: https://sos-print.vercel.app
echo.
echo Press Ctrl+C anytime to stop both the agent and tunnel cleanly.
echo.

S2P.Agent.Worker.exe --url https://sos-print.vercel.app !EXTRA_ARGS! %*

:: Cleanup background tunnel when agent finishes
echo.
echo Stopping background Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1
echo SOS Print Station cleanly shut down.
timeout /t 2 /nobreak >nul
