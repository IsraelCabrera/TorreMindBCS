#!/bin/sh
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "=== Clearing stale ARQ jobs from Redis ==="
(cd "$HERE/.." && docker compose exec redis redis-cli FLUSHALL 2>/dev/null || true)

echo "=== Starting WhatsApp Mockup on :9090 ==="
(cd "$HERE/../mockup" && uv run uvicorn main:app --host 0.0.0.0 --port 9090 &
echo "Mockup PID=$!")

echo "=== Starting ARQ Worker ==="
(cd "$HERE" && uv run arq app.worker_settings.WorkerSettings &
echo "Worker PID=$!")

echo "=== Starting VLMS Backend on :8000 ==="
cd "$HERE"
WHATSAPP_API_BASE_URL=http://localhost:9090 \
WHATSAPP_PHONE_NUMBER_ID=mock \
WHATSAPP_ACCESS_TOKEN=mock \
uv run uvicorn app.main:app --reload --port 8000
