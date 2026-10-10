@echo off
title Firebase CLI Login - SOS Print
echo ========================================================
echo Signing into Firebase CLI for project shakeel-online-services-951ec
echo A browser window will open automatically.
echo Please click Allow to authorize your Google account.
echo ========================================================
call npx.cmd firebase-tools login
echo.
echo Login complete. You can close this window.
pause
