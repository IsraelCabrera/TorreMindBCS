#!/usr/bin/env bash
set -euo pipefail

REPO_URL="git@github.com:IsraelCabrera/TorreMindBCS.git"
DEPLOY_DIR="/opt/vlms/VLMSControl"

echo "=== VLMS Production Setup ==="
echo ""

# ── 1. Install Docker + Compose Plugin ──────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker "$USER"
  echo "  → You may need to log out and back in for group changes to take effect."
else
  echo "[1/5] Docker already installed."
fi

if ! docker compose version &>/dev/null; then
  echo "  → Installing Docker Compose plugin..."
  sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin
fi

# ── 2. Clone / Pull Repository ──────────────────────────────────────────
echo "[2/5] Setting up repository at $DEPLOY_DIR ..."
sudo mkdir -p "$(dirname "$DEPLOY_DIR")"
if [ -d "$DEPLOY_DIR/.git" ]; then
  sudo git -C "$DEPLOY_DIR" pull
else
  sudo git clone "$REPO_URL" "$DEPLOY_DIR"
fi
sudo chown -R "$USER:$USER" "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# ── 3. Create .env ──────────────────────────────────────────────────────
echo "[3/5] Configuring environment..."
if [ -f .env ]; then
  echo "  → .env already exists, keeping it."
else
  cp .env.template .env

  read -rp "  Server IP or domain (e.g. 192.168.1.100 or mind.torre.mx): " SERVER_ADDR
  if echo "$SERVER_ADDR" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    sed -i "s|CORS_ORIGINS=\\[\"http://YOUR_SERVER_IP\"\\]|CORS_ORIGINS=[\"http://$SERVER_ADDR\"]|" .env
  else
    sed -i "s|CORS_ORIGINS=\\[\"http://YOUR_SERVER_IP\"\\]|CORS_ORIGINS=[\"https://$SERVER_ADDR\"]|" .env
    sed -i "s|^SERVER_DOMAIN=$|SERVER_DOMAIN=$SERVER_ADDR|" .env
  fi

  echo "  → Generated .env — edit it to fill in:"
  echo "       • SECRET_KEY"
  echo "       • NGROK_AUTHTOKEN"
  echo "       • WHATSAPP_PHONE_NUMBER_ID"
  echo "       • WHATSAPP_ACCESS_TOKEN"
  echo ""

  read -rp "  Edit now? (n to continue without editing): " EDIT_NOW
  if [ "$EDIT_NOW" = "y" ] || [ "$EDIT_NOW" = "Y" ]; then
    ${EDITOR:-nano} .env
  fi
fi

# shellcheck source=/dev/null
source .env 2>/dev/null || true

# ── 4. Start Services ───────────────────────────────────────────────────
echo "[4/5] Starting services (this may take a few minutes the first time)..."
docker compose -f compose.all.yaml -f compose.prod.yaml --profile ngrok up -d --build

# ── 5. Print Summary ────────────────────────────────────────────────────
echo "[5/5] Done!"
echo ""
echo "=== Summary ==="
echo "  Services running on $(hostname -I | awk '{print $1}'):"
echo "    • Dashboard (Caddy):     http://$SERVER_ADDR"
echo ""

# Fetch ngrok URL
echo -n "  • Ngrok public URL:      "
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null || echo "(waiting...)")
echo "$NGROK_URL"

echo ""
echo "  WhatsApp webhook endpoint: $NGROK_URL/webhooks/whatsapp"
echo ""
echo "  Admin panel:              http://$SERVER_ADDR/admin-page-mind"
echo ""
