@echo off
echo ========================================
echo Quick Git Commit
echo ========================================
echo.

if "%1"=="" (
    echo ERROR: Please provide a commit message
    echo.
    echo Usage: quick-commit.bat "Your commit message"
    echo Example: quick-commit.bat "Add PostgreSQL support"
    echo.
    pause
    exit /b 1
)

echo Adding files...
git add .

echo.
echo Files to be committed:
git status --short

echo.
echo Committing with message: %*
git commit -m "%*"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Commit created
    echo ========================================
    echo.
    echo Ready to push? Run: git push
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Commit failed
    echo ========================================
    echo.
)

pause
