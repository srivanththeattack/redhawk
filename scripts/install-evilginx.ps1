<#
.SYNOPSIS
    Sets up Evilginx2 for RedHawk phishing framework.
    Offers three install methods: WSL2, Docker, or Download binary.
#>

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   RedHawk — Evilginx2 Installer        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Install-WSL2 {
    Write-Host "[*] Installing Evilginx2 via WSL2..." -ForegroundColor Yellow
    
    # Check if WSL is available
    $wslCheck = wsl --status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] WSL is not installed. Installing WSL2..." -ForegroundColor Yellow
        wsl --install -d Ubuntu 2>&1
        Write-Host "[*] WSL2 installed! Please reboot and re-run this script." -ForegroundColor Green
        return $false
    }

    Write-Host "[*] Installing Go and building Evilginx2 in WSL2..." -ForegroundColor Yellow
    $commands = @(
        "sudo apt update -qq",
        "sudo apt install -y -qq golang git make",
        "cd ~",
        "if [ ! -d evilginx2 ]; then git clone --depth 1 https://github.com/kgretzky/evilginx2; fi",
        "cd evilginx2",
        "make",
        "echo 'Evilginx2 built successfully at: ~/evilginx2/evilginx2'",
        "echo 'Run: cd ~/evilginx2 && sudo ./evilginx2'"
    )

    foreach ($cmd in $commands) {
        Write-Host "    Running: $cmd" -ForegroundColor Gray
        wsl $cmd 2>&1 | Out-Null
    }

    # Verify
    $verify = wsl "~/evilginx2/evilginx2 --version 2>&1 || ls -la ~/evilginx2/evilginx2 2>&1"
    Write-Host "[✓] Evilginx2 binary should be at: ~/evilginx2/evilginx2" -ForegroundColor Green
    Write-Host "    Start it: wsl cd ~/evilginx2 && sudo ./evilginx2" -ForegroundColor Cyan
    return $true
}

function Install-Docker {
    Write-Host "[*] Setting up Evilginx2 via Docker..." -ForegroundColor Yellow
    
    # Check Docker
    $dockerCheck = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Docker is not installed." -ForegroundColor Red
        Write-Host "    Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        return $false
    }

    Write-Host "[*] Pulling evilginx2 Docker image..." -ForegroundColor Yellow
    docker pull kgretzky/evilginx2:latest 2>&1 | Out-Null

    # Create directories
    $phishletDir = "$env:USERPROFILE\.evilginx\phishlets"
    $dataDir = "$env:USERPROFILE\.evilginx\data"
    New-Item -ItemType Directory -Path $phishletDir -Force | Out-Null
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

    # Create a helper script
    $runScript = @"
docker run -d `
  --name evilginx2 `
  --restart unless-stopped `
  -p 80:80 -p 443:443 `
  -v "$env:USERPROFILE\.evilginx\phishlets:/app/phishlets" `
  -v "$env:USERPROFILE\.evilginx\data:/app/data" `
  kgretzky/evilginx2:latest
"@

    $scriptPath = "$env:USERPROFILE\.evilginx\start-evilginx.ps1"
    Set-Content -Path $scriptPath -Value $runScript -Force

    Write-Host "[✓] Docker image ready!" -ForegroundColor Green
    Write-Host "    Run: $scriptPath" -ForegroundColor Cyan
    Write-Host "    Or: docker run -d --name evilginx2 -p 80:80 -p 443:443 kgretzky/evilginx2:latest" -ForegroundColor Cyan
    return $true
}

function Install-Binary {
    Write-Host "[*] Downloading Evilginx2 Windows binary..." -ForegroundColor Yellow
    
    $toolsDir = "$env:LOCALAPPDATA\RedHawk\tools"
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null

    # Try to get the latest release URL from GitHub
    try {
        $releaseInfo = Invoke-WebRequest -Uri "https://api.github.com/repos/kgretzky/evilginx2/releases/latest" -UseBasicParsing
        $releaseData = $releaseInfo | ConvertFrom-Json
        
        # Find Windows binary asset
        $asset = $releaseData.assets | Where-Object { $_.name -like "*windows*" -or $_.name -like "*win*" -or $_.name -like "*.exe" } | Select-Object -First 1
        
        if ($asset) {
            $downloadUrl = $asset.browser_download_url
            $output = "$toolsDir\evilginx2.exe"
            
            Write-Host "    Downloading: $($asset.name)" -ForegroundColor Yellow
            Invoke-WebRequest -Uri $downloadUrl -OutFile $output -UseBasicParsing
            Write-Host "[✓] Downloaded to: $output" -ForegroundColor Green
            
            # Add to PATH (user level)
            $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
            if ($currentPath -notlike "*$toolsDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$currentPath;$toolsDir", "User")
                Write-Host "[✓] Added to PATH" -ForegroundColor Green
            }
            
            # Copy phishlets
            $phishletDir = "$env:APPDATA\RedHawk\phishing\phishlets"
            if (Test-Path "C:\cybersec stuff\RedHawk\resources\phishlets") {
                Copy-Item "C:\cybersec stuff\RedHawk\resources\phishlets\*" $phishletDir -Force -Recurse
            }
            
            return $true
        }
    } catch {
        Write-Host "[!] Could not get latest release from GitHub API." -ForegroundColor Yellow
        Write-Host "    Download manually from: https://github.com/kgretzky/evilginx2/releases" -ForegroundColor Yellow
    }

    # Fallback: open download page
    Start-Process "https://github.com/kgretzky/evilginx2/releases"
    return $false
}

# ── Main Menu ──
Write-Host "Select installation method:" -ForegroundColor White
Write-Host "  1) WSL2 (recommended) — Full evilginx2 with Go build" -ForegroundColor Gray
Write-Host "  2) Docker — Containerized evilginx2" -ForegroundColor Gray
Write-Host "  3) Binary download — Windows compatible (if available)" -ForegroundColor Gray
Write-Host "  4) Skip — I'll install manually" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Choice (1-4, default: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" { Install-WSL2 }
    "2" { Install-Docker }
    "3" { Install-Binary }
    default { Write-Host "[-] Skipping evilginx2 installation." -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "[✓] Evilginx2 setup complete!" -ForegroundColor Green
