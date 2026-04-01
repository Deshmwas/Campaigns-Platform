@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install root dependencies
    exit /b 1
)
echo.
echo Root dependencies installed successfully!
pause
