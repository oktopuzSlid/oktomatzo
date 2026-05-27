# Oktomatzo Host — Development launcher
# Starts the backend server on port 8001
# No package manager required — pure Python backend

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $rootDir "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Host "=== Oktomatzo Host ===" -ForegroundColor Cyan
Write-Host "Starting backend on http://localhost:8001" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $venvPython)) {
    Write-Host "ERROR: Virtual environment not found at $venvPython" -ForegroundColor Red
    Write-Host "Run: cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Set-Location $backendDir
& $venvPython -m uvicorn src.main:app --reload --port 8001
