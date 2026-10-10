@echo off
title Deploy Firestore Indexes - SOS Print
echo ========================================================
echo Deploying firestore.indexes.json to shakeel-online-services-951ec...
echo ========================================================
call npx.cmd firebase-tools deploy --only firestore:indexes --project shakeel-online-services-951ec --non-interactive
echo.
echo Deployment finished!
pause
