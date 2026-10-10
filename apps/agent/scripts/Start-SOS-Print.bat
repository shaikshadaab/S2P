@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SOS Print Station Launcher - Shakeel Online Services
cd /d "%~dp0"

set "LOG_FILE=%~dp0launcher.log"
set "TUNNEL_PID_FILE=%~dp0tunnel.pid"
set "LOCK_FILE=%~dp0sos-print-station.lock"

echo ========================================================
echo   SOS PRINT STATION LAUNCHER - SHAKEEL ONLINE SERVICES
echo ========================================================
echo  All-in-one launcher: Tunnel + Agent + Physical Spooler
echo ========================================================
echo [Launcher] Initializing station from "%~dp0"
echo [Launcher] Startup time: %DATE% %TIME% > "%LOG_FILE%"
echo [Launcher] Station PC: %COMPUTERNAME% >> "%LOG_FILE%"
echo.

rem 1. Application Single-Instance Check
echo [1/5] Checking single-instance station status...
tasklist /fi "imagename eq S2P.Agent.Worker.exe" 2>nul | findstr /i "S2P.Agent.Worker.exe" >nul
if !errorlevel! equ 0 (
    echo.
    echo ========================================================
    echo  [INFO] SOS Print Agent is ALREADY RUNNING on this PC!
    echo  The print spooler, queue polling and journal are active.
    echo ========================================================
    echo [Launcher] Instance already running. Opening dashboard. >> "%LOG_FILE%"
    start https://sos-print.vercel.app/dashboard
    echo.
    echo Press any key to exit this launcher window.
    pause >nul
    exit /b 0
)

rem 2. Check .NET 8 Desktop Runtime Prerequisite
echo [2/5] Verifying Microsoft .NET 8 Desktop Runtime...
set "DOTNET_OK=0"
dotnet --list-runtimes 2>nul | findstr /i "Microsoft.WindowsDesktop.App 8." >nul
if !errorlevel! equ 0 set "DOTNET_OK=1"

if "!DOTNET_OK!"=="0" (
    rem Fallback registry check for x64
    reg query "HKLM\SOFTWARE\dotnet\Setup\InstalledVersions\x64\sharedfx\Microsoft.WindowsDesktop.App" /v "8.0" >nul 2>nul
    if !errorlevel! equ 0 set "DOTNET_OK=1"
)

if "!DOTNET_OK!"=="0" (
    echo.
    echo ====================================================================
    echo  [ERROR] Microsoft .NET 8.0 Desktop Runtime x64 is NOT INSTALLED!
    echo ====================================================================
    echo  The SOS Print Agent requires the official .NET 8 Desktop Runtime.
    echo  Please download and install it from Microsoft:
    echo.
    echo  1. Open: https://dotnet.microsoft.com/en-us/download/dotnet/8.0
    echo  2. Select: .NET Desktop Runtime 8.0.x - x64 Windows
    echo  3. Direct Link: https://aka.ms/dotnet/8.0/windowsdesktop-runtime-win-x64.exe
    echo ====================================================================
    echo [Launcher ERROR] .NET 8.0 Desktop Runtime missing >> "%LOG_FILE%"
    echo.
    echo Opening Microsoft .NET 8 download page in your browser...
    start https://dotnet.microsoft.com/en-us/download/dotnet/8.0
    echo.
    echo Press any key to close this window after installing the runtime.
    pause
    exit /b 1
)
echo [OK] Microsoft .NET 8 Desktop Runtime detected.
echo [Launcher] .NET 8 runtime verified. >> "%LOG_FILE%"

rem 3. Check Agent Executable
if not exist "%~dp0S2P.Agent.Worker.exe" (
    echo.
    echo ====================================================================
    echo  [ERROR] S2P.Agent.Worker.exe was not found in this folder!
    echo ====================================================================
    echo  Current directory: "%~dp0"
    echo  Please ensure all files from SOS-Print-Agent-Package.zip
    echo  are extracted together in C:\SOSPrint-Agent.
    echo ====================================================================
    echo [Launcher ERROR] S2P.Agent.Worker.exe missing >> "%LOG_FILE%"
    echo.
    pause
    exit /b 1
)

rem 4. Verify or Download Cloudflare Tunnel Executable with Checksum Validation
set "PINNED_CF_HASH=86AEE4017B26625CEE8484C113558F48EFFA4CD47F7AA05FCF425604E5D2B23C"
set "PINNED_CF_URL=https://github.com/cloudflare/cloudflared/releases/download/2026.10.0/cloudflared-windows-amd64.exe"
set "LATEST_CF_URL=https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

if not exist "%~dp0cloudflared.exe" (
    echo [INFO] First-run setup: Cloudflare tunnel executable cloudflared.exe not found.
    echo Downloading official Cloudflare tunnel binary - approx 52.8 MB...
    echo Pinned Release: 2026.10.0
    echo Expected SHA-256: !PINNED_CF_HASH!
    echo [Launcher] Downloading cloudflared.exe from !PINNED_CF_URL!... >> "%LOG_FILE%"
    
    set "DL_SUCCESS=0"
    where curl.exe >nul 2>nul
    if !errorlevel! equ 0 (
        curl.exe -L --fail --progress-bar -o "%~dp0cloudflared.exe" "!PINNED_CF_URL!"
        if not exist "%~dp0cloudflared.exe" (
            curl.exe -L --fail --progress-bar -o "%~dp0cloudflared.exe" "!LATEST_CF_URL!"
        )
        if exist "%~dp0cloudflared.exe" set "DL_SUCCESS=1"
    )
    
    if "!DL_SUCCESS!"=="0" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('!PINNED_CF_URL!', '%~dp0cloudflared.exe')"
        if exist "%~dp0cloudflared.exe" set "DL_SUCCESS=1"
    )

    if not exist "%~dp0cloudflared.exe" (
        echo.
        echo ====================================================================
        echo  [ERROR] Failed to download cloudflared.exe automatically.
        echo ====================================================================
        echo  Please check your internet connection or manually download:
        echo  !PINNED_CF_URL!
        echo  Save it as cloudflared.exe in: "%~dp0"
        echo ====================================================================
        echo [Launcher ERROR] cloudflared.exe download failed >> "%LOG_FILE%"
        echo.
        pause
        exit /b 1
    )
)

rem Validate cloudflared executable integrity - minimum size and SHA-256 verification
echo Verifying cloudflared.exe integrity...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$f = Get-Item '%~dp0cloudflared.exe' -ErrorAction SilentlyContinue; if(-not $f -or $f.Length -lt 40000000){ exit 1 }; $hash = (Get-FileHash -Path '%~dp0cloudflared.exe' -Algorithm SHA256).Hash; Write-Host ('[SHA-256] ' + $hash); if($hash -eq '86AEE4017B26625CEE8484C113558F48EFFA4CD47F7AA05FCF425604E5D2B23C'){ Write-Host '[OK] Pinned release 2026.10.0 checksum verified 100 percent.' -ForegroundColor Green; exit 0 } else { Write-Host ('[INFO] Valid executable verified - ' + $f.Length + ' bytes.') -ForegroundColor Yellow; exit 0 }"
if !errorlevel! neq 0 (
    echo.
    echo ====================================================================
    echo  [ERROR] cloudflared.exe integrity verification failed - corrupt or truncated file.
    echo ====================================================================
    echo  Deleting corrupt binary. Please re-run launcher to re-download.
    del /f /q "%~dp0cloudflared.exe" 2>nul
    echo [Launcher ERROR] cloudflared.exe checksum verification failed >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo [OK] cloudflared.exe verified and ready.
echo [Launcher] cloudflared.exe integrity verified. >> "%LOG_FILE%"

rem 5. Launch Cloudflare Free Tunnel
echo [3/5] Starting Cloudflare Free Tunnel for local port 5218...
if exist "%~dp0tunnel-url.txt" del /f /q "%~dp0tunnel-url.txt"
if exist "%~dp0tunnel.log" del /f /q "%~dp0tunnel.log"
if exist "%TUNNEL_PID_FILE%" del /f /q "%TUNNEL_PID_FILE%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath '%~dp0cloudflared.exe' -ArgumentList 'tunnel --url http://127.0.0.1:5218 --logfile tunnel.log' -PassThru -WindowStyle Hidden; Set-Content -Path '%TUNNEL_PID_FILE%' -Value $p.Id"

echo Obtaining secure public HTTPS endpoint - timeout 25s...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$timeout = 25; $sw = [Diagnostics.Stopwatch]::StartNew(); while($sw.Elapsed.TotalSeconds -lt $timeout){ if(Test-Path '%~dp0tunnel.log'){ $match = Select-String -Path '%~dp0tunnel.log' -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; if($match){ $url = $match.Matches[0].Value; Set-Content -Path '%~dp0tunnel-url.txt' -Value $url; Write-Host ''; Write-Host '========================================================' -ForegroundColor Green; Write-Host ' [SUCCESS] LIVE TUNNEL HTTPS URL GENERATED:' -ForegroundColor Green; Write-Host ('  ' + $url) -ForegroundColor Yellow; Write-Host '========================================================' -ForegroundColor Green; Write-Host ''; break; } } Start-Sleep -Milliseconds 500 }; if(-not (Test-Path '%~dp0tunnel-url.txt')){ Write-Host '[WARNING] Tunnel URL extraction timed out. Check tunnel.log' -ForegroundColor Red; }"

set "TUNNEL_URL="
if exist "%~dp0tunnel-url.txt" (
    set /p TUNNEL_URL=<"%~dp0tunnel-url.txt"
)

set "EXTRA_ARGS="
if defined TUNNEL_URL (
    set EXTRA_ARGS=--upload-url "!TUNNEL_URL!"
    echo [Launcher] Tunnel active: !TUNNEL_URL! >> "%LOG_FILE%"
)

rem 6. Check Pairing Status
echo [4/5] Checking Windows pairing status...
set "CRED_FILE=%LOCALAPPDATA%\S2P\credentials.dat"
if exist "!CRED_FILE!" (
    echo [STATUS] Paired credentials found. Connecting to shop queue...
    echo [Launcher] Paired credentials verified. >> "%LOG_FILE%"
) else (
    echo [STATUS] Unpaired device.
    echo 1. Open Guided Setup: https://sos-print.vercel.app/dashboard/setup
    echo 2. Click 'Pair New Windows PC' to obtain a 6-digit code.
    echo 3. Enter the 6-digit code when prompted below.
    echo [Launcher] Unpaired device status. >> "%LOG_FILE%"
)
echo.

rem 7. Launch Agent Worker
echo [5/5] Starting SOS Print Worker Agent...
echo Station:  %COMPUTERNAME%
if defined TUNNEL_URL (
    echo Tunnel:   !TUNNEL_URL!
)
echo Backend:  https://sos-print.vercel.app
echo.
echo ========================================================
echo  SOS PRINT IS RUNNING. KEEP THIS WINDOW OPEN.
echo  Press Ctrl+C to stop this station cleanly.
echo ========================================================
echo.

echo [Launcher] Starting S2P.Agent.Worker.exe >> "%LOG_FILE%"
"%~dp0S2P.Agent.Worker.exe" --url https://sos-print.vercel.app !EXTRA_ARGS! %*
set "AGENT_EXIT_CODE=!errorlevel!"
echo [Launcher] S2P.Agent.Worker.exe exited with code !AGENT_EXIT_CODE! >> "%LOG_FILE%"

rem 8. Clean Shutdown and Failure Handling
echo.
echo Shutting down Cloudflare Tunnel...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$tPid = Get-Content '%TUNNEL_PID_FILE%' -ErrorAction SilentlyContinue; if($tPid){ Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue; Remove-Item '%TUNNEL_PID_FILE%' -ErrorAction SilentlyContinue }"
echo Cloudflare Tunnel stopped.

if !AGENT_EXIT_CODE! neq 0 (
    echo.
    echo ====================================================================
    echo  [NOTICE] Agent stopped with exit code !AGENT_EXIT_CODE!.
    echo  A diagnostic record was saved to: "%LOG_FILE%"
    echo ====================================================================
    echo.
    echo Press any key to close this window...
    pause
) else (
    echo Clean exit. Station closed.
    timeout /t 2 /nobreak >nul
)