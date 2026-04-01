@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd server
echo Running Logic Tests with ESM support...
SET NODE_OPTIONS=--experimental-vm-modules
call npx jest tests/logic.test.js
if %ERRORLEVEL% NEQ 0 (
    echo Tests Failed!
    exit /b 1
)
echo Tests Passed!
