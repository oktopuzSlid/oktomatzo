#!/usr/bin/env bash
# Oktomatzo Host — Development launcher (Linux / macOS)
# Starts the backend server
# Usage: ./scripts/dev.sh              # default port 8001
#        ./scripts/dev.sh 8080         # custom port

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${1:-8001}"

cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "=== Oktomatzo Host ==="
echo "Starting backend on http://localhost:$PORT"
echo ""

uvicorn src.main:app --reload --host 0.0.0.0 --port "$PORT"
