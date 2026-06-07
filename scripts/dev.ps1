# Oktomatzo Host — Development launcher (Windows PowerShell)
# Starts the backend server
# Usage: .\scripts\dev.ps1              # default port 8001
#        .\scripts\dev.ps1 8080         # custom port

param([int]$Port = 8001)

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $rootDir "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Host "=== Oktomatzo Host ===" -ForegroundColor Cyan
Write-Host "Starting backend on http://localhost:$Port" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $venvPython)) {
    Write-Host "ERROR: Virtual environment not found" -ForegroundColor Red
    Write-Host "Run: cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Set-Location $backendDir
& $venvPython -m uvicorn src.main:app --reload --host 0.0.0.0 --port $Port
