<#
.SYNOPSIS
    RedHawk Dependency Installer
.DESCRIPTION
    Checks for and installs required tools:
    - Nmap (Windows)
    - Python 3 (embedded)
    - Required Python packages
#>

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     RedHawk Dependency Installer       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = @{}

# ── Admin Check ──
function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "[!] Not running as administrator. Some tools may not install." -ForegroundColor Yellow
    Write-Host "[!] Right-click PowerShell and select 'Run as administrator' for best results." -ForegroundColor Yellow
    Write-Host ""
}

# ── Nmap ──
Write-Host "[*] Checking Nmap..." -ForegroundColor Yellow
$nmapFound = $false
$nmapPaths = @(
    "nmap",
    "C:\Program Files (x86)\Nmap\nmap.exe",
    "C:\Program Files\Nmap\nmap.exe"
)

foreach ($path in $nmapPaths) {
    try {
        $null = Get-Command $path -ErrorAction Stop
        $nmapFound = $true
        break
    } catch {
        continue
    }
}

if ($nmapFound) {
    $version = & $nmapPaths[0] --version 2>&1 | Select-Object -First 1
    Write-Host "[✓] Nmap found: $version" -ForegroundColor Green
    $results["nmap"] = @{ status = "installed" }
} else {
    Write-Host "[!] Nmap not found." -ForegroundColor Yellow
    $installChoice = Read-Host "    Download and install Nmap? (y/n, default: y)"
    if ($installChoice -ne "n") {
        $nmapUrl = "https://nmap.org/dist/nmap-7.94-setup.exe"
        $installer = "$env:TEMP\nmap-setup.exe"
        Write-Host "    Downloading Nmap installer..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri $nmapUrl -OutFile $installer -UseBasicParsing
            Write-Host "    Running Nmap installer (silent)..." -ForegroundColor Yellow
            Start-Process -FilePath $installer -ArgumentList "/S" -Wait
            Write-Host "[✓] Nmap installed." -ForegroundColor Green
            $results["nmap"] = @{ status = "installed" }
        } catch {
            Write-Host "[✗] Failed to install Nmap: $_" -ForegroundColor Red
            Write-Host "    Download manually from: https://nmap.org/download.html" -ForegroundColor Gray
            $results["nmap"] = @{ status = "failed"; error = $_ }
        }
    } else {
        $results["nmap"] = @{ status = "skipped" }
    }
}

# ── Python ──
Write-Host ""
Write-Host "[*] Checking Python..." -ForegroundColor Yellow
$pythonFound = $false
try {
    $null = Get-Command python -ErrorAction Stop
    $version = python --version 2>&1
    if ($version -match "3\.\d+") {
        $pythonFound = $true
        Write-Host "[✓] Python found: $version" -ForegroundColor Green
        $results["python"] = @{ status = "installed" }
    }
} catch {
    # Check embedded
    $embeddedPython = Join-Path $ScriptDir "python\python._embed\python.exe"
    if (Test-Path $embeddedPython) {
        $pythonFound = $true
        Write-Host "[✓] Embedded Python found." -ForegroundColor Green
        $results["python"] = @{ status = "installed" }
    }
}

if (-not $pythonFound) {
    Write-Host "[!] Python not found." -ForegroundColor Yellow
    $installChoice = Read-Host "    Install embedded Python? (y/n, default: y)"
    if ($installChoice -ne "n") {
        $downloadScript = Join-Path $ScriptDir "scripts\download-python.ps1"
        if (Test-Path $downloadScript) {
            Write-Host "    Running Python download script..." -ForegroundColor Yellow
            & $downloadScript
            $results["python"] = @{ status = "installed" }
        } else {
            Write-Host "    Download script not found at: $downloadScript" -ForegroundColor Red
            $results["python"] = @{ status = "failed"; error = "Script not found" }
        }
    } else {
        $results["python"] = @{ status = "skipped" }
    }
}

# ── Python Packages ──
Write-Host ""
Write-Host "[*] Checking Python packages..." -ForegroundColor Yellow
$requirementsFile = Join-Path $ScriptDir "python\requirements.txt"
if (Test-Path $requirementsFile) {
    try {
        $pythonExe = if (Test-Path (Join-Path $ScriptDir "python\python._embed\python.exe")) {
            Join-Path $ScriptDir "python\python._embed\python.exe"
        } else {
            "python"
        }
        
        Write-Host "    Installing Python packages..." -ForegroundColor Yellow
        & $pythonExe -m pip install -r $requirementsFile --quiet 2>&1 | Out-Null
        Write-Host "[✓] Python packages installed." -ForegroundColor Green
        $results["packages"] = @{ status = "installed" }
    } catch {
        Write-Host "[✗] Failed to install packages: $_" -ForegroundColor Red
        $results["packages"] = @{ status = "failed"; error = $_ }
    }
}

# ── Summary ──
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "            Installation Summary         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$allOk = $true
foreach ($key in $results.Keys) {
    $r = $results[$key]
    if ($r.status -eq "installed") {
        Write-Host "  [✓] $key - OK" -ForegroundColor Green
    } elseif ($r.status -eq "skipped") {
        Write-Host "  [-] $key - Skipped" -ForegroundColor Yellow
        $allOk = $false
    } else {
        Write-Host "  [✗] $key - Failed" -ForegroundColor Red
        $allOk = $false
    }
}
Write-Host ""

if ($allOk) {
    Write-Host "All dependencies ready! Launch RedHawk to begin." -ForegroundColor Green
} else {
    Write-Host "Some dependencies are missing. RedHawk may not work fully." -ForegroundColor Yellow
    Write-Host "Run this script again or install missing tools manually." -ForegroundColor Yellow
}
