@echo off
echo 🚀 Starting Salon Manager PWA Server...
echo.
echo 📍 Open one of these URLs in your browser:
echo    - http://localhost:8080
echo    - http://127.0.0.1:8080
echo.
echo 🔧 For debug: http://localhost:8080/fix-login.html
echo 🧪 For test: http://localhost:8080/test-login.html
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"

REM Try Python 3 first
python -m http.server 8080 2>nul
if %ERRORLEVEL% NEQ 0 (
    REM Try Python 2
    python -m SimpleHTTPServer 8080 2>nul
    if %ERRORLEVEL% NEQ 0 (
        REM Try Node.js
        npx http-server -p 8080 2>nul
        if %ERRORLEVEL% NEQ 0 (
            echo ❌ Could not start HTTP server!
            echo.
            echo Please install one of:
            echo - Python (python.org)
            echo - Node.js (nodejs.org)
            echo.
            echo Or use VS Code Live Server extension
            pause
        )
    )
)
