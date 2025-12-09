@echo off
echo Generating SSL Certificate for HTTPS...
echo.

cd /d "%~dp0"

where openssl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo OpenSSL not found. Installing via Chocolatey...
    echo.
    echo Please run this command in Administrator PowerShell:
    echo choco install openssl -y
    echo.
    echo Or download from: https://slproweb.com/products/Win32OpenSSL.html
    echo.
    pause
    exit /b 1
)

echo Creating SSL certificates...
openssl req -x509 -newkey rsa:4096 -keyout server-key.pem -out server-cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.8.101"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ SSL certificates created successfully!
    echo   - server-cert.pem
    echo   - server-key.pem
    echo.
    echo Next steps:
    echo 1. Run: npm install https
    echo 2. Start server: npm start
    echo 3. Access: https://localhost:10000
    echo.
    echo Note: You'll see a security warning. Click "Advanced" and "Proceed"
) else (
    echo.
    echo ✗ Failed to create certificates
)

pause
