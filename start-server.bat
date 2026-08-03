@echo off
title Cure Backend Server
echo ========================================
echo   Cure Backend Server
echo ========================================
echo.
echo Starting server on http://localhost:3001
echo.
echo Press Ctrl+C to stop.
echo DO NOT close this window while testing!
echo.
cd /d "%~dp0server"
"C:\Users\ZhuanZ\.workbuddy\binaries\node\versions\22.22.2\node.exe" src/index.js
pause
