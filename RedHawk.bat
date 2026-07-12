@echo off
title RedHawk Reconnaissance Suite
cd /d "%~dp0"

echo ========================================
echo        RedHawk Reconnaissance Suite
echo ========================================
echo.

:: ── Check Node.js ──
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js is not installed.
    echo     Download from: https://nodejs.org/ (LTS version)
    echo     Then run this script again.
    pause
    exit /b 1
)
echo [*] Node.js found.

:: ── Install npm dependencies if needed ──
if not exist "node_modules\" (
    echo [*] Installing dependencies (this may take a minute)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [!] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo [*] Dependencies installed.
) else (
    echo [*] Dependencies already installed.
)

:: ── Check embedded Python ──
if not exist "python\python._embed\python.exe" (
    echo [*] Downloading embedded Python runtime...
    powershell -ExecutionPolicy Bypass -File "scripts\download-python.ps1"
    if %ERRORLEVEL% neq 0 (
        echo [!] Python setup failed.
        pause
        exit /b 1
    )
    echo [*] Python runtime installed.
) else (
    echo [*] Python runtime found.
)

:: ── Check nmap ──
where nmap >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Nmap is not installed.
    echo     Some scan features will not work.
    echo     Install from: https://nmap.org/download.html
    echo.
    echo     Or run: scripts\install-nmap.ps1 (as Administrator)
    echo.
    timeout /t 3 /nobreak >nul
) else (
    echo [*] Nmap found.
)

:: ── Build & Launch ──
echo.
echo [*] Building application...
call npx vite build >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Build failed. Check for errors.
    pause
    exit /b 1
)

echo [*] Compiling Electron backend...
call npx tsc -p tsconfig.node.json >nul 2>&1

echo [*] Launching RedHawk...
echo.
start "" /B npx electron .

:: Wait a moment and check if it started
timeout /t 2 /nobreak >nul
exit /b 0
