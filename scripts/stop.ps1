param(
    [switch]$StopDatabase
)

$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "AstraHealth - stopping the API and web servers" -ForegroundColor Cyan

$ports = @(8000, 5173)
$stopped = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

    foreach ($processId in $processIds) {
        if ($null -eq $processId -or $processId -eq $PID) {
            continue
        }

        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if ($null -ne $process -and $process.ParentProcessId) {
            # uvicorn --reload keeps a parent watcher. Stop it too so it cannot
            # respawn the child after this script exits.
            Stop-Process -Id $process.ParentProcessId -Force -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process $processId on port $port." -ForegroundColor DarkGray
        $stopped += 1
    }
}

if ($stopped -eq 0) {
    Write-Host "  No AstraHealth servers were listening on ports 8000 or 5173." -ForegroundColor DarkGray
}

if ($StopDatabase -and (Test-Path -LiteralPath (Join-Path $RepoRoot "docker-compose.yml"))) {
    Write-Host "  Stopping the database container." -ForegroundColor DarkGray
    & docker compose stop db *> $null
    Write-Host "  Database stopped." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "AstraHealth servers are stopped." -ForegroundColor Green
Write-Host "You can close any leftover server windows." -ForegroundColor Yellow
Write-Host ""
