@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"

echo.
echo Starting Campaigns Module...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.
call npm run dev
