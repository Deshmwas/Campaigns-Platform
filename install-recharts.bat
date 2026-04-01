@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0\client"
echo Installing recharts...
call npm install recharts
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install recharts
    exit /b 1
)
echo Recharts installed successfully!
