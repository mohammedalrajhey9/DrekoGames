$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$makensis = 'C:\Users\Administrator\AppData\Local\electron-builder\Cache\nsis-3.0.4.1\nsis-3.0.4.1-1mx3n\Bin\makensis.exe'
$scriptPath = Join-Path $projectRoot 'installer\installer.nsi'
$releaseDir = Join-Path $projectRoot 'release'
$outputFile = Join-Path $releaseDir 'Dreko Games Launcher Setup.exe'

if (-not (Test-Path $makensis)) {
    throw "NSIS compiler not found at: $makensis"
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
if (Test-Path $outputFile) {
    Remove-Item -Force $outputFile
}

& $makensis $scriptPath

if ($LASTEXITCODE -ne 0) {
    throw "Installer build failed."
}

Write-Host "Installer built successfully."
Write-Host "Output: $releaseDir\Dreko Games Launcher Setup.exe"
