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

:: 1. Application Single-Instance Lock Check
echo [1/5] Checking single-instance station status...
set "LOCK_FILE=sos-print-station.lock"
set "TUNNEL_PID_FILE=tunnel.pid"

if exist "%LOCK_FILE%" (
    set /p RUNNING_PID=<"%LOCK_FILE%"
    set "IS_ALIVE=0"
    if defined RUNNING_PID (
        powershell -Command "$p = Get-Process -Id %RUNNING_PID% -ErrorAction SilentlyContinue; if($p){ exit 0 } else { exit 1 }"
        if !errorlevel! equ 0 set "IS_ALIVE=1"
    )
    if "!IS_ALIVE!"=="1" (
        echo.
        echo ========================================================
        echo  [INFO] SOS Print Station is ALREADY ACTIVE (PID !RUNNING_PID!)!
        echo  Active queue polling, journal and print jobs are running.
        echo ========================================================
        echo Opening shop dashboard in your browser...
        start https://sos-print.vercel.app/dashboard
        echo.
        echo Press any key to exit this launcher window.
        pause >nul
        exit /b 0
    ) else (
        echo [INFO] Cleaning up stale lock file from prior session...
        del /f /q "%LOCK_FILE%" 2>nul
    )
)

:: 2. Check Prerequisites
echo [2/5] Verifying station prerequisites...
if not exist "S2P.Agent.Worker.exe" (
    echo [ERROR] S2P.Agent.Worker.exe not found in this folder!
    echo Please extract all files from SOS-Print-Agent-Package.zip to C:\SOSPrint-Agent.
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

:: 3. Launch Free HTTPS Tunnel & Track Specific PID
echo [3/5] Starting Cloudflare Free Tunnel for local port 5218...
if exist "tunnel-url.txt" del /f /q "tunnel-url.txt"
if exist "tunnel.log" del /f /q "tunnel.log"
if exist "%TUNNEL_PID_FILE%" del /f /q "%TUNNEL_PID_FILE%"

:: Start cloudflared process and track ONLY its specific PID (no global taskkill)
powershell -Command "$p = Start-Process -FilePath '.\cloudflared.exe' -ArgumentList 'tunnel --url http://127.0.0.1:5218 --logfile tunnel.log' -PassThru -WindowStyle Hidden; Set-Content -Path 'tunnel.pid' -Value $p.Id"

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
    echo 3. Enter the 6-digit code when prompted below.
)
echo.

:: 5. Create Single-Instance Lock & Launch Agent Worker
echo [5/5] Starting SOS Print Worker Agent...
echo Station: %COMPUTERNAME%
if defined TUNNEL_URL (
    echo Tunnel:  !TUNNEL_URL!
)
echo Backend: https://sos-print.vercel.app
echo.
echo Press Ctrl+C anytime to stop this station cleanly.
echo.

:: Record our launcher process ID as lock
powershell -Command "$pid | Set-Content -Path '%LOCK_FILE%'"

:: Run Worker Agent
S2P.Agent.Worker.exe --url https://sos-print.vercel.app !EXTRA_ARGS! %*

:: Clean Shutdown: Stop ONLY this launcher's tracked tunnel PID
echo.
echo Shutting down SOS Print Station cleanly...
powershell -Command "$tPid = Get-Content 'tunnel.pid' -ErrorAction SilentlyContinue; if($tPid){ Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue; Remove-Item 'tunnel.pid' -ErrorAction SilentlyContinue }; Remove-Item 'sos-print-station.lock' -ErrorAction SilentlyContinue"
echo Active queue journal preserved. Station cleanly shut down.
timeout /t 2 /nobreak >nul
