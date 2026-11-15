$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "windows-common.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-Host "AstraHealth - reset demo data" -ForegroundColor Cyan

foreach ($command in @("docker", "uv")) {
    if (-not (Test-CommandAvailable $command)) {
        Fail-Startup "'$command' was not found. Install it using START_HERE_WINDOWS.md, restart the computer, then try again."
    }
}

if ((Test-PortInUse 8000) -or (Test-PortInUse 5173)) {
    Fail-Startup "AstraHealth is still running. Close the API and Web windows (or run Stop AstraHealth.bat), then try again."
}

Ensure-Docker
Ensure-BackendDependencies
Start-AstraDatabase

Write-Step "Rebuilding the scripted demo state"
Push-Location (Join-Path $RepoRoot "backend")
try {
    Invoke-Native "Database migration" "uv" @("run", "alembic", "upgrade", "head")
    Invoke-Native "Demo reset" "uv" @("run", "python", "-m", "app.db.seed", "--reset")
    Invoke-Native "Demo verification" "uv" @("run", "python", "-m", "app.db.verify_demo")
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Demo data reset and verified." -ForegroundColor Green
Write-Host "Now double-click 'Start AstraHealth.bat' to launch the app." -ForegroundColor Yellow
Write-Host "Open http://localhost:5173 and choose Astronaut or Flight Surgeon." -ForegroundColor White
Write-Host ""
