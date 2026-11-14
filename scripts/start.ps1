param(
    [switch]$ResetDemo,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "windows-common.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-Host "AstraHealth - Windows launcher" -ForegroundColor Cyan
Write-Host "This window checks the tools, starts the database, and opens the app." -ForegroundColor DarkGray

foreach ($command in @("docker", "node", "npm", "uv")) {
    if (-not (Test-CommandAvailable $command)) {
        Fail-Startup "'$command' was not found. Install it using START_HERE_WINDOWS.md, restart the computer, then try again."
    }
}

if (Test-PortInUse 8000) {
    Fail-Startup "Port 8000 is already in use. Close the old AstraHealth API window or run 'Stop AstraHealth.bat', then try again."
}
if (Test-PortInUse 5173) {
    Fail-Startup "Port 5173 is already in use. Close the old AstraHealth Web window or run 'Stop AstraHealth.bat', then try again."
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot ".env"))) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot ".env.example") -Destination (Join-Path $RepoRoot ".env")
    Write-Step "Created .env from .env.example"
}

Ensure-Docker
Ensure-Dependencies
Start-AstraDatabase

Write-Step "Preparing the database and demo data"
Push-Location (Join-Path $RepoRoot "backend")
try {
    Invoke-Native "Database migration" "uv" @("run", "alembic", "upgrade", "head")
    if ($ResetDemo) {
        Invoke-Native "Demo reset" "uv" @("run", "python", "-m", "app.db.seed", "--reset")
    }
    else {
        Invoke-Native "Demo seed" "uv" @("run", "python", "-m", "app.db.seed")
    }
    Invoke-Native "Demo verification" "uv" @("run", "python", "-m", "app.db.verify_demo")
}
finally {
    Pop-Location
}

Write-Step "Starting the API window"
$apiScript = Join-Path $PSScriptRoot "run-api.ps1"
$apiArguments = @(
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ('"{0}"' -f $apiScript)
)
Start-Process -FilePath "powershell.exe" -ArgumentList $apiArguments -WorkingDirectory $RepoRoot | Out-Null

if (-not (Wait-Http -Url "http://localhost:8000/health" -TimeoutSeconds 120)) {
    Fail-Startup "The API did not start. Look at the 'AstraHealth API' window for a red error message."
}

Write-Step "Starting the web window"
$webScript = Join-Path $PSScriptRoot "run-web.ps1"
$webArguments = @(
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ('"{0}"' -f $webScript)
)
Start-Process -FilePath "powershell.exe" -ArgumentList $webArguments -WorkingDirectory $RepoRoot | Out-Null

if (-not (Wait-Http -Url "http://localhost:5173/" -TimeoutSeconds 120)) {
    Fail-Startup "The web app did not start. Look at the 'AstraHealth Web' window for a red error message."
}

Write-SuccessBanner

if (-not $NoBrowser) {
    Start-Process "http://localhost:5173" | Out-Null
}

Write-Host "You can leave this window open. It does not need to do anything else." -ForegroundColor DarkGray
