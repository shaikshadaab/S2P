@echo off
setlocal
title SOS Print - 1-Page Physical Test Print
cd /d "%~dp0"
echo ========================================================
echo   SOS Print - Controlled Physical Print Test
echo ========================================================
echo.
echo This sends a verified 1-page test PDF directly to your
echo physical printer through Windows Spooler.
echo.
S2P.Agent.Worker.exe --controlled-test --file test_visible_a4.pdf --url https://sos-print.vercel.app
pause
