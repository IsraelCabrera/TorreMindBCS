#!/usr/bin/env bash
set -euo pipefail

cd /opt/vlms/VLMSControl

echo "=== VLMS Update ==="

echo "[1/3] Pulling latest code..."
git pull

echo "[2/3] Rebuilding and restarting services..."
docker compose -f compose.all.yaml -f compose.prod.yaml --profile ngrok up -d --build

echo "[3/3] Cleaning up old images..."
docker image prune -f

echo ""
echo "=== Done ==="

# Show ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null || echo "(ngrok not ready)")
echo "  Ngrok:    $NGROK_URL"
echo "  Webhook:  $NGROK_URL/webhooks/whatsapp"
echo ""
