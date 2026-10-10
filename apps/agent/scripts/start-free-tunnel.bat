@echo off
setlocal
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
echo Copy the generated https://*.trycloudflare.com link into:
echo   Owner Dashboard -> Printers -> Agent Tunnel URL
echo.
cloudflared.exe tunnel --url http://127.0.0.1:5218
pause
