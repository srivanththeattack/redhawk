<#
.SYNOPSIS
    Creates a RedHawk desktop shortcut (.lnk) on the current user's desktop.
.DESCRIPTION
    Run this once after cloning/setting up RedHawk.
    The shortcut points to RedHawk.bat and uses the RedHawk icon.
#>

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "RedHawk.lnk"
$BatchPath = Join-Path $ProjectDir "RedHawk.bat"
$IconPath = Join-Path $ProjectDir "resources\icon.ico"

if (-not (Test-Path $BatchPath)) {
    Write-Host "[!] RedHawk.bat not found at: $BatchPath" -ForegroundColor Red
    exit 1
}

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatchPath
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "RedHawk Reconnaissance Suite v0.1"
$Shortcut.WindowStyle = 1

if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
}

$Shortcut.Save()

Write-Host "[OK] Shortcut created on desktop!" -ForegroundColor Green
Write-Host "     $ShortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Double-click the RedHawk icon on your desktop to launch." -ForegroundColor Cyan
