<#
.SYNOPSIS
    RedHawk Full Dependency Installer
.DESCRIPTION
    Checks for and installs all required tools:
    - Nmap (port scanning)
    - Python 3 + pip
    - Node.js (runtime)
    - Evilginx2 (phishing framework)
    - Metasploit (exploitation framework)
    - WSL (Windows Subsystem for Linux)
#>

param(
    [switch]$Auto,        # Skip prompts, auto-install
    [switch]$Silent       # Minimal output
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $PSScriptRoot
$Results = @{}
$AllOk = $true

function Log {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Confirm-Step {
    param([string]$Label)
    if ($Auto) { return $true }
    $response = Read-Host "    Install $Label? (y/n, default: y)"
    return $response -ne "n"
}

$isAdmin = Test-Admin
Log "========================================" Cyan
Log "     RedHawk Dependency Installer       " Cyan
Log "========================================" Cyan
Log "" 
Log "Administrator: $isAdmin" Yellow
if (-not $isAdmin) {
    Log "[!] Some installers require admin rights." Yellow
    Log "[!] Run as Administrator for full auto-install." Yellow
    Log ""
}

# ──────────────────────────────────────────────
# 1. Nmap
# ──────────────────────────────────────────────
Log "[1/7] Checking Nmap..." Yellow
$nmapFound = $false
try {
    $null = Get-Command nmap -ErrorAction Stop
    $version = nmap --version 2>&1 | Select-Object -First 1
    Log "  [✓] Nmap found: $version" Green
    $Results["nmap"] = @{ status = "installed" }
    $nmapFound = $true
} catch {
    foreach ($p in @("C:\Program Files (x86)\Nmap\nmap.exe", "C:\Program Files\Nmap\nmap.exe")) {
        if (Test-Path $p) {
            Log "  [✓] Nmap found at: $p" Green
            $Results["nmap"] = @{ status = "installed" }
            $nmapFound = $true
            break
        }
    }
}

if (-not $nmapFound) {
    Log "  [!] Nmap not found." Yellow
    if (Confirm-Step "Nmap") {
        $installer = "$env:TEMP\nmap-7.95-setup.exe"
        $url = "https://nmap.org/dist/nmap-7.95-setup.exe"
        try {
            Log "  [*] Downloading Nmap 7.95..." Yellow
            Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
            Log "  [*] Installing silently..." Yellow
            Start-Process -FilePath $installer -ArgumentList "/S" -Wait -NoNewWindow
            Log "  [✓] Nmap installed." Green
            $Results["nmap"] = @{ status = "installed" }
        } catch {
            Log "  [✗] Failed: $_" Red
            $Results["nmap"] = @{ status = "failed"; error = $_ }
            $AllOk = $false
        }
    } else {
        $Results["nmap"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# 2. Python 3
# ──────────────────────────────────────────────
Log ""
Log "[2/7] Checking Python..." Yellow
$pythonFound = $false
$pythonExe = "python"
try {
    $ver = python --version 2>&1
    if ($ver -match "3\.\d+") {
        Log "  [✓] $ver" Green
        $Results["python"] = @{ status = "installed" }
        $pythonFound = $true
    }
} catch {}

if (-not $pythonFound) {
    $embeddedPy = Join-Path $ScriptDir "python\python._embed\python.exe"
    if (Test-Path $embeddedPy) {
        Log "  [✓] Embedded Python found." Green
        $pythonExe = $embeddedPy
        $Results["python"] = @{ status = "installed" }
        $pythonFound = $true
    }
}

if (-not $pythonFound) {
    Log "  [!] Python not found." Yellow
    if (Confirm-Step "Python 3") {
        $dlScript = Join-Path $ScriptDir "scripts\download-python.ps1"
        if (Test-Path $dlScript) {
            Log "  [*] Running Python download script..." Yellow
            & $dlScript
            if (Test-Path $embeddedPy) {
                $pythonExe = $embeddedPy
                Log "  [✓] Python installed." Green
                $Results["python"] = @{ status = "installed" }
                $pythonFound = $true
            } else {
                Log "  [✗] Python install failed." Red
                $Results["python"] = @{ status = "failed" }
                $AllOk = $false
            }
        } else {
            Log "  [✗] Download script missing." Red
            $Results["python"] = @{ status = "failed"; error = "Script not found" }
            $AllOk = $false
        }
    } else {
        $Results["python"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# 3. pip packages
# ──────────────────────────────────────────────
Log ""
Log "[3/7] Installing Python packages..." Yellow
$requirementsFile = Join-Path $ScriptDir "python\requirements.txt"
if (Test-Path $requirementsFile -and $pythonFound) {
    try {
        Log "  [*] Installing packages from requirements.txt..." Yellow
        & $pythonExe -m pip install -r $requirementsFile --quiet 2>&1 | Out-Null
        Log "  [✓] Python packages installed." Green
        $Results["packages"] = @{ status = "installed" }
    } catch {
        Log "  [✗] Package install failed: $_" Red
        $Results["packages"] = @{ status = "failed"; error = $_ }
        $AllOk = $false
    }
} else {
    Log "  [-] Skipped (Python not available)." Yellow
    $Results["packages"] = @{ status = "skipped" }
}

# ──────────────────────────────────────────────
# 4. Node.js
# ──────────────────────────────────────────────
Log ""
Log "[4/7] Checking Node.js..." Yellow
$nodeFound = $false
try {
    $ver = node --version 2>&1
    Log "  [✓] Node.js found: $ver" Green
    $Results["nodejs"] = @{ status = "installed" }
    $nodeFound = $true
} catch {}

if (-not $nodeFound) {
    foreach ($p in @("${env:ProgramFiles}\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "${env:LOCALAPPDATA}\Programs\nodejs\node.exe")) {
        if (Test-Path $p) {
            Log "  [✓] Node.js found at: $p" Green
            $Results["nodejs"] = @{ status = "installed" }
            $nodeFound = $true
            break
        }
    }
}

if (-not $nodeFound) {
    Log "  [!] Node.js not found." Yellow
    if (Confirm-Step "Node.js") {
        try {
            Log "  [*] Attempting winget install..." Yellow
            winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>&1 | Out-Null
            Log "  [✓] Node.js installed via winget." Green
            $Results["nodejs"] = @{ status = "installed" }
        } catch {
            try {
                Log "  [*] Attempting Chocolatey install..." Yellow
                choco install nodejs-lts -y 2>&1 | Out-Null
                Log "  [✓] Node.js installed via Chocolatey." Green
                $Results["nodejs"] = @{ status = "installed" }
            } catch {
                Log "  [✗] Auto-install failed. Download from: https://nodejs.org/" Red
                Start-Process "https://nodejs.org/en/download/"
                $Results["nodejs"] = @{ status = "failed" }
                $AllOk = $false
            }
        }
    } else {
        $Results["nodejs"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# 5. Evilginx2
# ──────────────────────────────────────────────
Log ""
Log "[5/7] Checking Evilginx2..." Yellow
$evilginxFound = $false
try {
    $null = Get-Command evilginx2 -ErrorAction Stop
    Log "  [✓] Evilginx2 found on PATH." Green
    $Results["evilginx"] = @{ status = "installed" }
    $evilginxFound = $true
} catch {}

if (-not $evilginxFound) {
    $evilginxPaths = @(
        "${env:LOCALAPPDATA}\RedHawk\tools\evilginx2.exe",
        "${env:LOCALAPPDATA}\Programs\evilginx2\evilginx2.exe",
        "${env:ProgramFiles}\evilginx2\evilginx2.exe",
        "$ScriptDir\tools\evilginx2\evilginx2.exe",
        "C:\tools\evilginx2\evilginx2.exe"
    )
    foreach ($p in $evilginxPaths) {
        if (Test-Path $p) {
            Log "  [✓] Evilginx2 found at: $p" Green
            $Results["evilginx"] = @{ status = "installed" }
            $evilginxFound = $true
            break
        }
    }
}

if (-not $evilginxFound) {
    Log "  [!] Evilginx2 not found." Yellow
    if (Confirm-Step "Evilginx2") {
        $installScript = Join-Path $ScriptDir "scripts\install-evilginx.ps1"
        if (Test-Path $installScript) {
            Log "  [*] Running Evilginx2 installer..." Yellow
            & $installScript
            Log "  [✓] Evilginx2 installation initiated." Green
            $Results["evilginx"] = @{ status = "installed" }
        } else {
            Log "  [✗] Installer script not found." Red
            $Results["evilginx"] = @{ status = "failed"; error = "Script not found" }
            $AllOk = $false
        }
    } else {
        $Results["evilginx"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# 6. Metasploit
# ──────────────────────────────────────────────
Log ""
Log "[6/7] Checking Metasploit..." Yellow
$msfFound = $false
$msfPaths = @(
    "C:\metasploit\MSP\msfrpcd.exe",
    "${env:ProgramFiles}\Metasploit\MSP\msfrpcd.exe",
    "${env:LOCALAPPDATA}\Metasploit\msfrpcd.exe"
)
foreach ($p in $msfPaths) {
    if (Test-Path $p) {
        Log "  [✓] Metasploit found at: $p" Green
        $Results["metasploit"] = @{ status = "installed" }
        $msfFound = $true
        break
    }
}

if (-not $msfFound) {
    Log "  [!] Metasploit not found." Yellow
    if (Confirm-Step "Metasploit") {
        $installScript = Join-Path $ScriptDir "scripts\install-metasploit.ps1"
        if (Test-Path $installScript) {
            Log "  [*] Running Metasploit installer..." Yellow
            & $installScript
            Log "  [✓] Metasploit installation initiated." Green
            $Results["metasploit"] = @{ status = "installed" }
        } else {
            Log "  [✗] Installer script not found." Red
            $Results["metasploit"] = @{ status = "failed"; error = "Script not found" }
            $AllOk = $false
        }
    } else {
        $Results["metasploit"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# 7. WSL
# ──────────────────────────────────────────────
Log ""
Log "[7/7] Checking WSL..." Yellow
$wslFound = $false
$wslPath = "${env:SystemRoot}\System32\wsl.exe"
$wslAlt = "${env:SystemRoot}\Sysnative\wsl.exe"
if (Test-Path $wslPath) {
    Log "  [✓] WSL binary found." Green
    try {
        $distros = wsl -l -q 2>&1 | Where-Object { $_ -match '\S' }
        if ($distros) {
            Log "  [✓] WSL distros: $($distros -join ', ')" Green
        } else {
            Log "  [-] WSL installed, no distros. Run 'wsl --install -d Ubuntu'." Yellow
        }
    } catch {
        Log "  [-] WSL installed but distro list unavailable." Yellow
    }
    $Results["wsl"] = @{ status = "installed" }
    $wslFound = $true
} elseif (Test-Path $wslAlt) {
    Log "  [✓] WSL binary (Sysnative) found." Green
    $Results["wsl"] = @{ status = "installed" }
    $wslFound = $true
}

if (-not $wslFound) {
    Log "  [!] WSL not found." Yellow
    if (Confirm-Step "WSL") {
        try {
            Log "  [*] Installing WSL..." Yellow
            wsl --install 2>&1 | Out-Null
            Log "  [✓] WSL installation initiated. Reboot may be required." Green
            $Results["wsl"] = @{ status = "installed" }
        } catch {
            Log "  [✗] Failed: $_" Red
            Log "  [*] Run 'wsl --install' as Administrator manually." Yellow
            $Results["wsl"] = @{ status = "failed"; error = $_ }
            $AllOk = $false
        }
    } else {
        $Results["wsl"] = @{ status = "skipped" }
        $AllOk = $false
    }
}

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
Log ""
Log "========================================" Cyan
Log "          Installation Summary           " Cyan
Log "========================================" Cyan
foreach ($key in $Results.Keys) {
    $r = $Results[$key]
    $icon = switch ($r.status) {
        "installed" { " [✓]" }
        "skipped"   { " [-]" }
        "failed"    { " [✗]" }
        default     { " [?]" }
    }
    $color = switch ($r.status) {
        "installed" { "Green" }
        "skipped"   { "Yellow" }
        "failed"    { "Red" }
        default     { "Gray" }
    }
    Log ("  {0,-8} {1}" -f $icon, $key) $color
}

Log ""
if ($AllOk -and ($Results.Values.status -notcontains "skipped" -and $Results.Values.status -notcontains "failed")) {
    Log "  All dependencies ready! Launch RedHawk." Green
} elseif ($AllOk) {
    Log "  Most dependencies ready. Some were skipped." Yellow
} else {
    Log "  Some dependencies are missing. RedHawk may not work fully." Yellow
    Log "  Run this script again or install missing tools manually." Yellow
}
Log ""
