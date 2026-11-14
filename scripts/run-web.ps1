$ErrorActionPreference = "Continue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location (Join-Path $RepoRoot "frontend")

try {
    $Host.UI.RawUI.WindowTitle = "AstraHealth Web - keep this window open"
}
catch {
    # Some terminals do not allow changing the title.
}

Write-Host ""
Write-Host "AstraHealth Web" -ForegroundColor Cyan
Write-Host "Keep this window open while you use the app." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "frontend\node_modules"))) {
    Write-Host "The web dependencies are missing. Close this window and run Start AstraHealth.bat again." -ForegroundColor Red
    [void](Read-Host "Press Enter to close")
    exit 1
}

$npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if ($null -eq $npm) {
    $npm = Get-Command "npm" -ErrorAction SilentlyContinue
}
if ($null -eq $npm) {
    Write-Host "npm was not found. Close this window and install Node.js from https://nodejs.org/" -ForegroundColor Red
    [void](Read-Host "Press Enter to close")
    exit 1
}

& $npm.Source run dev
Write-Host ""
Write-Host "The web server stopped. Press Enter to close this window." -ForegroundColor Yellow
[void](Read-Host "Press Enter to close")
