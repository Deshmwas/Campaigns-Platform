@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0\server"

echo.
echo Campaigns Module - Database Setup
echo.
echo [1/2] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Pushing schema to database...
call npx prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Database push failed!
    echo Make sure MySQL is running and DATABASE_URL is correct in .env
    pause
    exit /b 1
)

echo.
echo Database setup completed!
echo.
pause
