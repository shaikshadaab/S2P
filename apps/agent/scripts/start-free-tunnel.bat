@echo off
setlocal enabledelayedexpansion
title SOS Print Free HTTPS Tunnel - Cloudflare
cd /d "%~dp0"
echo ========================================================
echo   SOS Print Free HTTPS Tunnel (No Blaze / No Paid Cloud)
echo ========================================================
echo.
echo Connecting local agent port 5218 to Cloudflare Zero Trust Free Tunnel...
echo.

if not exist "cloudflared.exe" (
    echo Cloudflare tunnel executable 'cloudflared.exe' not found in this folder.
    echo Downloading portable cloudflared.exe from Cloudflare...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo.
echo Starting tunnel for port 5218...
echo.

if exist "tunnel-url.txt" del /f /q "tunnel-url.txt"
if exist "tunnel.log" del /f /q "tunnel.log"

echo [1/2] Launching Cloudflare Tunnel...
start /b "" cloudflared.exe tunnel --url http://127.0.0.1:5218 --logfile tunnel.log >nul 2>&1

echo [2/2] Obtaining secure public HTTPS endpoint...
powershell -Command "$timeout = 25; $sw = [Diagnostics.Stopwatch]::StartNew(); while($sw.Elapsed.TotalSeconds -lt $timeout){ if(Test-Path 'tunnel.log'){ $match = Select-String -Path 'tunnel.log' -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; if($match){ $url = $match.Matches[0].Value; Set-Content -Path 'tunnel-url.txt' -Value $url; Write-Host ''; Write-Host '========================================================' -ForegroundColor Green; Write-Host ' [SUCCESS] LIVE TUNNEL HTTPS URL GENERATED:' -ForegroundColor Green; Write-Host ('  ' + $url) -ForegroundColor Yellow; Write-Host '========================================================' -ForegroundColor Green; Write-Host ''; Write-Host '1. Written to tunnel-url.txt (start-agent.bat reads it automatically)'; Write-Host '2. You can also view or set this in Dashboard -> Printers -> Agent Tunnel URL'; Write-Host ''; break; } } Start-Sleep -Milliseconds 500 }; if(-not (Test-Path 'tunnel-url.txt')){ Write-Host 'Could not auto-extract trycloudflare URL from log within 25s. Check tunnel.log' -ForegroundColor Red; }"

echo.
echo Tunnel is actively running. KEEP THIS WINDOW OPEN while the shop is open!
echo Press Ctrl+C or close window when closing the shop.
echo.
powershell -Command "Get-Content -Path 'tunnel.log' -Wait"
