@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd server
echo Installing Jest and Supertest...
call npm install --save-dev jest supertest
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install tests
    exit /b 1
)
echo Test dependencies installed!
