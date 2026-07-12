<#
.SYNOPSIS
    Downloads and extracts embedded Python for RedHawk.
.DESCRIPTION
    Downloads Python embeddable package (64-bit), extracts it to
    the python/python._embed directory, and installs pip + required packages.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $PSScriptRoot
$PythonDir = Join-Path $ScriptDir "python"
$EmbedDir = Join-Path $PythonDir "python._embed"
$PythonVersion = "3.12.5"
$PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
$ZipFile = Join-Path $PythonDir "python-embed.zip"

Write-Host "[RedHawk] Installing embedded Python $PythonVersion..." -ForegroundColor Cyan

# Create directories
if (-not (Test-Path $EmbedDir)) {
    New-Item -ItemType Directory -Path $EmbedDir -Force | Out-Null
}

# Download embedded Python
if (-not (Test-Path $ZipFile)) {
    Write-Host "[RedHawk] Downloading Python embeddable package..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $PythonUrl -OutFile $ZipFile -UseBasicParsing
        Write-Host "[RedHawk] Download complete." -ForegroundColor Green
    } catch {
        Write-Host "[RedHawk] Failed to download Python: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[RedHawk] Python zip already downloaded." -ForegroundColor Green
}

# Extract
Write-Host "[RedHawk] Extracting Python..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ZipFile -DestinationPath $EmbedDir -Force
    Write-Host "[RedHawk] Extraction complete." -ForegroundColor Green
} catch {
    Write-Host "[RedHawk] Failed to extract Python: $_" -ForegroundColor Red
    exit 1
}

# Fix python._pth to enable pip
$PthFile = Join-Path $EmbedDir "python._pth"
if (Test-Path $PthFile) {
    $content = Get-Content $PthFile -Raw
    # Uncomment the import site line
    $content = $content.Replace("#import site", "import site")
    Set-Content -Path $PthFile -Value $content
    Write-Host "[RedHawk] Enabled pip support in python._pth" -ForegroundColor Green
}

# Ensure pip is installed
Write-Host "[RedHawk] Installing pip..." -ForegroundColor Yellow
$PythonExe = Join-Path $EmbedDir "python.exe"
try {
    & $PythonExe -m ensurepip --upgrade
    Write-Host "[RedHawk] pip installed." -ForegroundColor Green
} catch {
    Write-Host "[RedHawk] Failed to install pip: $_" -ForegroundColor Red
    exit 1
}

# Install required packages
$Requirements = Join-Path $PythonDir "requirements.txt"
if (Test-Path $Requirements) {
    Write-Host "[RedHawk] Installing Python packages..." -ForegroundColor Yellow
    try {
        & $PythonExe -m pip install -r $Requirements --quiet
        Write-Host "[RedHawk] Python packages installed." -ForegroundColor Green
    } catch {
        Write-Host "[RedHawk] Warning: Some packages failed to install: $_" -ForegroundColor Yellow
    }
}

Write-Host "[RedHawk] Embedded Python setup complete!" -ForegroundColor Green
Write-Host "[RedHawk] Python: $PythonExe" -ForegroundColor Cyan
