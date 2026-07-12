@echo off
echo ============================================
echo PostgreSQL Password Reset Helper
echo ============================================
echo.
echo This script will help you reset the PostgreSQL password to "postgres"
echo.
echo Follow these steps:
echo.
echo 1. Open pgAdmin 4 (search for it in Windows Start menu)
echo 2. You'll be asked for a master password (the one you set during installation)
echo 3. Right-click on "PostgreSQL 18" in the left sidebar
echo 4. Select "Properties"
echo 5. Go to "Definition" tab
echo 6. Enter new password: postgres
echo 7. Re-enter password: postgres
echo 8. Click "Save"
echo.
echo OR use SQL directly:
echo
echo.
echo 1. Open CMD as Administrator
echo 2. Run: "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres
echo 3. When prompted for password, enter your current password
echo 4. Then run: ALTER USER postgres WITH PASSWORD 'postgres';
echo 5. Type: \q to quit
echo.
echo ============================================
echo Alternative: Create a new superuser
echo ============================================
echo.
echo If you can't remember the password, we can create a new superuser:
echo.
echo 1. Open pgAdmin 4 with your master password
echo 2. Expand "PostgreSQL 18" -^> "Login/Group Roles"
echo 3. Right-click "Login/Group Roles" -^> Create -^> Login/Group Role
echo 4. Name: myuser
echo 5. Definition tab: Password: mypassword
echo 6. Privileges tab: Check "Can login?" and "Superuser"
echo 7. Save
echo.
echo Then update your .env file:
echo DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/localservices"
echo.
pause
