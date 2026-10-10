@echo off
setlocal
title SOS Print - Reset Device Pairing
cd /d "%~dp0"
echo ========================================================
echo   SOS Print - Reset Device Pairing
echo ========================================================
echo.
echo Resetting saved device credentials and pairing markers...
S2P.Agent.Worker.exe --unpair
echo.
echo Device un-paired. To pair again, run 'pair-agent.bat'.
pause
