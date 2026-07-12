@echo off
echo ========================================
echo PostgreSQL Connection Test
echo ========================================
echo.
echo Testing connection to PostgreSQL...
echo.
echo Database: localservices
echo User: postgres
echo Host: localhost
echo Port: 5432
echo.
echo Please enter your PostgreSQL password when prompted
echo (The password you set during PostgreSQL installation)
echo.

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d localservices -c "SELECT version();"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Connection works!
    echo ========================================
    echo.
    echo Now checking if tables exist...
    echo.
    "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d localservices -c "\dt"
    echo.
    echo ========================================
    echo Next Steps:
    echo ========================================
    echo.
    echo 1. Update your .env file with the correct password
    echo 2. Run: cd backend
    echo 3. Run: npx prisma migrate dev --name init
    echo 4. Run: npm run seed
    echo 5. Run: npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo FAILED! Password is incorrect
    echo ========================================
    echo.
    echo Please try:
    echo 1. Check FIND_POSTGRES_PASSWORD.md for password reset instructions
    echo 2. Or deploy to Render instead (see DEPLOY_NOW.md)
    echo.
)

pause
