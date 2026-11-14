$ErrorActionPreference = "Continue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location (Join-Path $RepoRoot "backend")

try {
    $Host.UI.RawUI.WindowTitle = "AstraHealth API - keep this window open"
}
catch {
    # Some terminals do not allow changing the title.
}

Write-Host ""
Write-Host "AstraHealth API" -ForegroundColor Cyan
Write-Host "Keep this window open while you use the app." -ForegroundColor Yellow
Write-Host ""

$python = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    Write-Host "The Python environment is missing. Close this window and run Start AstraHealth.bat again." -ForegroundColor Red
    [void](Read-Host "Press Enter to close")
    exit 1
}

& $python -m uvicorn app.main:app --reload --port 8000
Write-Host ""
Write-Host "The API stopped. Press Enter to close this window." -ForegroundColor Yellow
[void](Read-Host "Press Enter to close")
