<#
.SYNOPSIS
    Downloads and installs Metasploit Framework (Windows).
    Also configures msfrpcd to auto-start on login.
.DESCRIPTION
    This will download the MSI installer (~200MB) and install silently.
    After install, it starts msfrpcd on port 55553 with password "redhawk".
#>

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   RedHawk — Metasploit Installer       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if already installed
$msfPaths = @(
    "C:\metasploit\MSP\msfrpcd.exe",
    "C:\Program Files\Metasploit\MSP\msfrpcd.exe",
    "$env:ProgramFiles\Metasploit\MSP\msfrpcd.exe"
)

$alreadyInstalled = $false
foreach ($p in $msfPaths) {
    if (Test-Path $p) {
        Write-Host "[✓] Metasploit already installed at: $p" -ForegroundColor Green
        $alreadyInstalled = $true
        break
    }
}

if (-not $alreadyInstalled) {
    # Check admin
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host "[!] Metasploit installation requires Administrator privileges." -ForegroundColor Red
        Write-Host "    Right-click PowerShell and select 'Run as administrator'." -ForegroundColor Yellow
        Write-Host ""
        $choice = Read-Host "    Open download page instead? (y/n, default: y)"
        if ($choice -ne "n") {
            Start-Process "https://windows.metasploit.com/"
        }
        exit 1
    }

    $installer = "$env:TEMP\metasploit-latest-x64.msi"
    $url = "https://windows.metasploit.com/metasploit-latest-x64.msi"

    Write-Host "[*] Downloading Metasploit (~200MB)..." -ForegroundColor Yellow
    Write-Host "    This may take a few minutes..." -ForegroundColor Gray

    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadProgressChanged = {
            $percent = $_.ProgressPercentage
            Write-Progress -Activity "Downloading Metasploit" -Status "$percent% Complete" -PercentComplete $percent
        }
        $wc.DownloadFile($url, $installer)
        Write-Progress -Activity "Downloading Metasploit" -Completed
        Write-Host "[✓] Download complete." -ForegroundColor Green
    } catch {
        Write-Host "[!] Download failed: $_" -ForegroundColor Red
        Write-Host "    Download manually from: https://windows.metasploit.com/" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "[*] Installing Metasploit (silent)..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installer`" /quiet /norestart" -Wait -NoNewWindow
        Write-Host "[✓] Metasploit installed!" -ForegroundColor Green
    } catch {
        Write-Host "[!] Installation failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Find msfrpcd
$msfrpcd = $null
foreach ($p in @("C:\metasploit\MSP\msfrpcd.exe", "$env:ProgramFiles\Metasploit\MSP\msfrpcd.exe")) {
    if (Test-Path $p) { $msfrpcd = $p; break }
}

if (-not $msfrpcd) {
    Write-Host "[!] Could not find msfrpcd.exe after installation." -ForegroundColor Red
    exit 1
}

# Create a startup script for msfrpcd
$startupDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$scriptPath = "$startupDir\RedHawk_StartMsfrpcd.ps1"

$msfScript = @"
# RedHawk — Auto-start msfrpcd
`$msfrpcd = "$msfrpcd"
`$log = "$env:TEMP\msfrpcd.log"
Start-Process -FilePath `$msfrpcd -ArgumentList "-P redhawk -S -f" -WindowStyle Hidden -RedirectStandardOutput `$log
"@

try {
    Set-Content -Path $scriptPath -Value $msfScript -Force
    Write-Host "[✓] Created auto-start script for msfrpcd" -ForegroundColor Green
} catch {
    Write-Host "[!] Could not create auto-start script: $_" -ForegroundColor Yellow
}

# Start msfrpcd now
Write-Host "[*] Starting msfrpcd on port 55553..." -ForegroundColor Yellow
try {
    $log = "$env:TEMP\msfrpcd.log"
    $proc = Start-Process -FilePath $msfrpcd -ArgumentList "-P redhawk -S -f" -WindowStyle Hidden -PassThru -RedirectStandardOutput $log
    Start-Sleep -Seconds 3
    
    if (-not $proc.HasExited) {
        Write-Host "[✓] msfrpcd is running (PID: $($proc.Id))" -ForegroundColor Green
        Write-Host "    Connect in RedHawk with: 127.0.0.1:55553 / password: redhawk" -ForegroundColor Cyan
    } else {
        Write-Host "[!] msfrpcd exited immediately. Check the log:" -ForegroundColor Yellow
        if (Test-Path $log) { Get-Content $log -Tail 5 }
    }
} catch {
    Write-Host "[!] Failed to start msfrpcd: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[*] You can manually start msfrpcd anytime:" -ForegroundColor Gray
Write-Host "    $msfrpcd -P redhawk -S -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "[✓] Metasploit setup complete!" -ForegroundColor Green
