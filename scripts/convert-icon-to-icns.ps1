<#
.SYNOPSIS
    Converts icon.png to icon.icns for macOS builds.
    Requires ImageMagick (convert/magick) or macOS built-in tools.
.DESCRIPTION
    Run this on macOS to generate the .icns file from icon.png.
    Uses 'sips' and 'iconutil' (built-in on macOS).
    Falls back to ImageMagick if available.
#>

$scriptDir = Split-Path -Parent $PSCommandPath
$projectRoot = Resolve-Path "$scriptDir\.."
$pngPath = "$projectRoot\resources\icon.png"
$icnsPath = "$projectRoot\resources\icon.icns"

if (-not (Test-Path $pngPath)) {
    Write-Error "icon.png not found at: $pngPath"
    exit 1
}

# Check if we're on macOS
$isMac = [System.OperatingSystem]::IsMacOS()
if (-not $isMac) {
    Write-Warning "Not on macOS — .icns will be a placeholder. Run this on macOS for a proper icon."
    # Create minimal valid icns (empty but valid)
    $header = [System.Text.Encoding]::ASCII.GetBytes("icns")
    $totalSize = [BitConverter]::GetBytes([int]8)
    [Array]::Reverse($totalSize)
    $fs = [System.IO.File]::Open($icnsPath, [System.IO.FileMode]::Create)
    $fs.Write($header, 0, 4)
    $fs.Write($totalSize, 0, 4)
    $fs.Close()
    Write-Host "Created placeholder: $icnsPath"
    exit 0
}

Write-Host "Converting icon.png to icon.icns..."

# Create iconset directory
$iconsetDir = "/tmp/redhawk.iconset"
if (Test-Path $iconsetDir) { Remove-Item -Recurse -Force $iconsetDir }
New-Item -ItemType Directory -Path $iconsetDir | Out-Null

# Generate all required sizes
$sizes = @(
    @{size=16; name="icon_16x16.png"},
    @{size=32; name="icon_16x16@2x.png"},
    @{size=32; name="icon_32x32.png"},
    @{size=64; name="icon_32x32@2x.png"},
    @{size=128; name="icon_128x128.png"},
    @{size=256; name="icon_128x128@2x.png"},
    @{size=256; name="icon_256x256.png"},
    @{size=512; name="icon_256x256@2x.png"},
    @{size=512; name="icon_512x512.png"},
    @{size=1024; name="icon_512x512@2x.png"}
)

foreach ($s in $sizes) {
    $dest = "$iconsetDir/$($s.name)"
    & sips -z $s.size $s.size "$pngPath" --out "$dest" 2>$null
    if (-not $?) {
        & magick convert "$pngPath" -resize "$($s.size)x$($s.size)" "$dest" 2>$null
    }
}

# Convert to icns
& iconutil -c icns "$iconsetDir" -o "$icnsPath"

# Cleanup
Remove-Item -Recurse -Force $iconsetDir

if (Test-Path $icnsPath) {
    Write-Host "Created: $icnsPath ($((Get-Item $icnsPath).Length / 1KB) KB)"
} else {
    Write-Error "Failed to create icon.icns"
    exit 1
}
