#!/bin/bash
set -e

# Load .env file if it exists (from project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Kill any process using port 8080 (if exists)
if lsof -ti:8080 > /dev/null 2>&1; then
  echo "Killing process on port 8080..."
  lsof -ti:8080 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Run Go API
cd "$PROJECT_ROOT/services/api" && go run ./cmd/api

