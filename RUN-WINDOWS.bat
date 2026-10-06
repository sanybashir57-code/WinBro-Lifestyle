@echo off
cd /d "%~dp0"
echo ========================================
echo WinBro Lifestyle - Starting Server
echo ========================================
if not exist package.json (
  echo ERROR: package.json not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing required packages...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)
echo.
echo Server starting at http://localhost:3000
start "WinBro Customer" http://localhost:3000/customer.html
start "WinBro Admin" http://localhost:3000/admin.html
call npm start
pause
