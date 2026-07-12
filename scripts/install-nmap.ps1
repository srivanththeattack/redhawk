<#
.SYNOPSIS
    Downloads and installs Nmap on Windows (silent install).
.DESCRIPTION
    Requires administrator privileges.
#>

$ErrorActionPreference = "Stop"

# Check admin
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[!] This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "    Right-click PowerShell and select 'Run as administrator'." -ForegroundColor Yellow
    exit 1
}

Write-Host "[RedHawk] Installing Nmap..." -ForegroundColor Cyan

$installer = "$env:TEMP\nmap-7.95-setup.exe"
$url = "https://nmap.org/dist/nmap-7.95-setup.exe"

if (-not (Test-Path $installer)) {
    Write-Host "[*] Downloading Nmap 7.95..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
        Write-Host "[*] Download complete." -ForegroundColor Green
    } catch {
        Write-Host "[!] Download failed: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[*] Installing (silent mode)..." -ForegroundColor Yellow
try {
    Start-Process -FilePath $installer -ArgumentList "/S" -Wait -NoNewWindow
    Write-Host "[✓] Nmap installed successfully!" -ForegroundColor Green
    
    # Verify
    $nmapPath = "C:\Program Files (x86)\Nmap\nmap.exe"
    if (Test-Path $nmapPath) {
        $version = & $nmapPath --version 2>&1 | Select-Object -First 1
        Write-Host "    $version" -ForegroundColor Gray
    }
} catch {
    Write-Host "[!] Installation failed: $_" -ForegroundColor Red
    exit 1
}
