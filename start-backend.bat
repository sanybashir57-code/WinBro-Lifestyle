@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo.
echo Starting WinBro backend...
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop the server.
echo.
npm start
pause
