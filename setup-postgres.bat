@echo off
echo ========================================
echo PostgreSQL Setup for LocalServices
echo ========================================
echo.

echo Checking if Docker is running...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo.
echo Starting PostgreSQL container...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start PostgreSQL container
    pause
    exit /b 1
)

echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

echo.
echo PostgreSQL is running!
echo.
echo Connection details:
echo   Host: localhost
echo   Port: 5432
echo   Database: localservices
echo   User: postgres
echo   Password: postgres
echo.
echo Next steps:
echo   1. cd backend
echo   2. npx prisma migrate dev --name init
echo   3. npm run seed
echo   4. npm run dev
echo.

pause
