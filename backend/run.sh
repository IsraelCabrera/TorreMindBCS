#!/bin/sh
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "=== Clearing stale ARQ jobs from Redis ==="
(cd "$HERE/.." && docker compose exec redis redis-cli FLUSHALL 2>/dev/null || true)

echo "=== Starting ARQ Worker ==="
(cd "$HERE" && uv run arq app.worker_settings.WorkerSettings &
echo "Worker PID=$!")

echo "=== Starting VLMS Backend on :8000 ==="
cd "$HERE"
uv run uvicorn app.main:app --reload --port 8000
