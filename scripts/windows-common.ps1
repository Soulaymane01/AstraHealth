# Shared helpers for the AstraHealth Windows launchers.
# ASCII only: Windows PowerShell 5.1 reads UTF-8 without a BOM as ANSI.

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail-Startup {
    param([string]$Message)
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    Write-Host ""
    Write-Host "If you are stuck, open START_HERE_WINDOWS.md and read the Troubleshooting section." -ForegroundColor Yellow
    exit 1
}

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Native {
    param(
        [string]$Label,
        [string]$FilePath,
        [string[]]$Arguments
    )
    Write-Host ("  " + $FilePath + " " + ($Arguments -join " ")) -ForegroundColor DarkGray
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail-Startup "$Label failed. Read the message above, then try again."
    }
}

function Test-PortInUse {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connections
}

function Ensure-Docker {
    if (-not (Test-CommandAvailable "docker")) {
        Fail-Startup "Docker Desktop is not installed. Install it from https://www.docker.com/products/docker-desktop/ and restart the computer."
    }

    Write-Step "Checking Docker Desktop"
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Docker is ready." -ForegroundColor DarkGray
        return
    }

    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (Test-Path -LiteralPath $dockerDesktop) {
        Write-Step "Starting Docker Desktop (this can take a minute)"
        Start-Process -FilePath $dockerDesktop | Out-Null
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 2
            & docker info *> $null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Docker is ready." -ForegroundColor DarkGray
                return
            }
        }
    }

    Fail-Startup "Docker Desktop is not running. Open Docker Desktop from the Start menu, wait until it says 'Engine running', then run this again."
}

function Ensure-BackendDependencies {
    if (Test-Path -LiteralPath (Join-Path $RepoRoot "backend\.venv\Scripts\python.exe")) {
        return
    }
    Write-Step "Installing Python dependencies (first run, this can take several minutes)"
    Push-Location (Join-Path $RepoRoot "backend")
    try {
        Invoke-Native "Python dependency install" "uv" @("sync")
    }
    finally {
        Pop-Location
    }
}

function Ensure-FrontendDependencies {
    if (Test-Path -LiteralPath (Join-Path $RepoRoot "frontend\node_modules")) {
        return
    }
    Write-Step "Installing web dependencies (first run, this can take several minutes)"
    Push-Location (Join-Path $RepoRoot "frontend")
    try {
        Invoke-Native "Web dependency install" "npm" @("install")
    }
    finally {
        Pop-Location
    }
}

function Ensure-Dependencies {
    Ensure-BackendDependencies
    Ensure-FrontendDependencies
}

function Start-AstraDatabase {
    Write-Step "Starting the PostgreSQL database"
    Push-Location $RepoRoot
    try {
        Invoke-Native "Database start" "docker" @("compose", "up", "-d", "db")
    }
    finally {
        Pop-Location
    }

    Write-Step "Waiting for the database"
    Push-Location $RepoRoot
    try {
        for ($i = 0; $i -lt 60; $i++) {
            & docker compose exec -T db pg_isready -U astra -d astrahealth *> $null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Database is ready." -ForegroundColor DarkGray
                return
            }
            Start-Sleep -Seconds 1
        }
    }
    finally {
        Pop-Location
    }
    Fail-Startup "The database did not become ready. Open Docker Desktop, wait for the engine, then try again."
}

function Wait-Http {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 90
    )
    for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return $true
            }
        }
        catch {
            # The server is still starting.
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Write-SuccessBanner {
    Write-Host ""
    Write-Host "AstraHealth is running." -ForegroundColor Green
    Write-Host "  Web    http://localhost:5173" -ForegroundColor White
    Write-Host "  API    http://localhost:8000" -ForegroundColor White
    Write-Host "  Docs   http://localhost:8000/docs" -ForegroundColor White
    Write-Host "  Login  commander@astra.space / astra-demo" -ForegroundColor White
    Write-Host ""
    Write-Host "Two server windows are open: 'AstraHealth API' and 'AstraHealth Web'." -ForegroundColor Yellow
    Write-Host "Keep them open while you use the app." -ForegroundColor Yellow
    Write-Host "To stop: close both server windows, or double-click 'Stop AstraHealth.bat'." -ForegroundColor Yellow
    Write-Host ""
}
