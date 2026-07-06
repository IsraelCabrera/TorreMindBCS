# VLMS — Visitor & Lobby Management System

Staff register visitors via a web dashboard, tenants receive WhatsApp notifications with
interactive buttons ("Que suba" / "No disponible"), and everything is tracked in real-time.

Built for **Torre Mind**, a commercial office building in Tijuana.

---

## Requirements

| Tool | Version |
|---|---|
| Python | ≥ 3.13 |
| Node  | ≥ 22   |
| Docker | ≥ 24 + Compose v2 |
| PostgreSQL | 16 |
| Redis | 7 |

---

## Quick Start — Full Stack (Docker)

Starts everything: PostgreSQL, Redis, backend, ARQ worker, frontend, and the WhatsApp mockup.

```bash
docker compose -f compose.all.yaml up -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| WhatsApp Mockup | http://localhost:9090 |

---

## Quick Start — Development (native services)

Run only infrastructure in Docker; develop backend and frontend natively for hot reload.

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (`:5432`) and Redis (`:6379`).

### 2. Backend

```bash
cd backend
uv sync --extra dev
uv run python -m scripts.seed       # runs migrations + seeds 3 users
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                          # → http://localhost:5173
```

### 4. WhatsApp Mockup (optional)

```bash
cd mockup
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 9090
```

---

## Running Backend with the WhatsApp Mockup

By default the backend sends WhatsApp messages to the real Meta Cloud API.
During development, point it at the local mockup instead:

```bash
cd backend
WHATSAPP_API_BASE_URL=http://localhost:9090 \
  WHATSAPP_PHONE_NUMBER_ID=mock \
  WHATSAPP_ACCESS_TOKEN=mock \
  uv run uvicorn app.main:app --reload --port 8000
```

The mockup chat UI at **http://localhost:9090/** lets you:
- See messages the backend "sent" (WhatsApp templates with buttons)
- Tap "Que suba" / "No disponible" as a tenant — the reply hits the backend webhook
- Send text messages as a visitor

---

## Kiosk Setup (Raspberry Pi + Touchscreen — Wayland)

Instructions for setting up the self‑registration kiosk on a 10.1" touchscreen running Raspberry Pi OS (64‑bit) with the **Wayland** compositor. The kiosk runs Chromium inside **cage 0.2** (a tiny Wayland kiosk compositor) and is managed by a **systemd user service** so it starts automatically on boot without an X server.

### Hardware Requirements

| Item | Spec |
|---|---|
| Raspberry Pi | Pi 4 (2 GB+) or Pi 5 |
| SD Card | 32 GB+ (A2 rated) |
| Touchscreen | 10.1" HDMI, 1024×600 (landscape) |
| Power | 5 V/3 A USB‑C (official Pi PSU) |
| Network | Ethernet or stable Wi‑Fi |

### Software Requirements

| Tool | Purpose |
|---|---|
| Raspberry Pi OS Lite (64‑bit) | Minimal OS, no desktop environment |
| `chromium` | Kiosk browser (package provides `/usr/bin/chromium`) |
| `cage` (0.2) | Tiny Wayland kiosk compositor (pre‑installed on Pi OS) |
| `wlr-randr` | Sets the DRM/KMS mode before cage starts |
| `seatd` | Manages the seat for Wayland (installed by default) |

### Install Dependencies

```bash
sudo apt update && sudo apt install -y \
  chromium \
  cage \
  wlr-randr \
  seatd \
  jq
```

### Disable the default desktop compositor (Wayfire + Waybar)

The default Pi OS image starts a Wayland desktop session (Wayfire + Waybar) that owns the seat and shows a top bar. Because the kiosk must own the whole screen, stop and disable that session for the kiosk user (`mind` in the examples below).

```bash
# Run once as the kiosk user (mind)
systemctl --user stop wayfire.service waybar.service 2>/dev/null || true
systemctl --user disable wayfire.service waybar.service 2>/dev/null || true
systemctl --user mask wayfire.service waybar.service 2>/dev/null || true
loginctl enable-linger mind      # allows the user service to start at boot
```

### Kiosk launch script (`/home/mind/kiosk-wayland.sh`)

```bash
#!/usr/bin/env bash
# kiosk-wayland.sh – VLMS kiosk on Raspberry Pi (Wayland + cage 0.2)

set -euo pipefail

# 0️⃣  Clean a stray X11 socket
rm -f /tmp/.X11-unix/X0
pkill -x Xwayland 2>/dev/null || true

# 1️⃣  Program the panel's native mode (also done by ExecStartPre, but harmless here)
OUT="$(wlr-randr --json | jq -r '.[] | select(.enabled==true) | .name' | head -n1)"
if [[ -z "$OUT" ]]; then
  echo "❌  No enabled output – check 'wlr-randr --json'" >&2
  exit 1
fi
wlr-randr --output "$OUT" --mode 1024x600@59.852001Hz

# 2️⃣  Environment for cage – **do NOT set WAYLAND_DISPLAY**; let cage create its own socket
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
# export WAYLAND_DISPLAY="wayland-0"   # REMOVED

# 3️⃣  Chromium binary (Pi OS ships /usr/bin/chromium)
CHROMIUM="/usr/bin/chromium"
[[ -x "$CHROMIUM" ]] || CHROMIUM="/usr/bin/chromium-browser"

# 4️⃣  Start cage (short options only – cage 0.2) and Chromium
cage_cmd=(
  cage
  -m last          # use the last (only) enabled output
  -s               # allow VT switching on a bare seat
  --               # separator – everything after goes to Chromium
  "$CHROMIUM"
    --kiosk
    --no-first-run
    --disable-infobars
    --disable-session-crashed-bubble
    --ozone-platform=wayland
    --disable-features=WaylandWindowDecorations   # hide Chromium title-bar
    --no-sandbox
    "http://172.30.2.129:5173/kiosk"
)

exec "${cage_cmd[@]}"
```

*Replace the URL with the hostname or IP of the machine that serves the frontend (e.g. `http://192.168.1.42:5173`).*  
Make the script executable:

```bash
chmod +x /home/mind/kiosk-wayland.sh
```

### Helper script for ExecStartPre (`/home/mind/kiosk-prepare-display.sh`)

```bash
#!/usr/bin/env bash
# kiosk-prepare-display.sh – called by the systemd unit *before* cage starts
# It programs the DRM connector with the panel’s native mode.

set -euo pipefail

OUT="$(wlr-randr --json | jq -r '.[] | select(.enabled==true) | .name' | head -n1)"
if [[ -z "$OUT" ]]; then
    echo "❌  No enabled output – check 'wlr-randr --json'" >&2
    exit 1
fi

# 1024×600 @ 59.85 Hz – the exact mode of the 10.1″ panel
wlr-randr --output "$OUT" --mode 1024x600@59.852001Hz
```

Make it executable:

```bash
chmod +x /home/mind/kiosk-prepare-display.sh
```

### systemd **user** service (auto‑start on boot)

Create `~/.config/systemd/user/vlms-kiosk.service`:

```ini
[Unit]
Description=VLMS Kiosk (cage 0.2 + Chromium)
# Do NOT pull in the graphical desktop – we want cage to own the seat
After=seatd.service
Wants=seatd.service

[Service]
Type=simple
# Explicit interpreter avoids the 203/EXEC error
ExecStart=/bin/bash /home/mind/kiosk-wayland.sh

# Variables needed by cage / Chromium
Environment=XDG_RUNTIME_DIR=/run/user/1000
# NOTE: do NOT set WAYLAND_DISPLAY – cage creates its own socket
Environment=CAGE_XWAYLAND=0

Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# ---- ExecStartPre that *actually works* ---------------------------------
# Systemd cannot do command substitution, so we call a tiny helper script.
ExecStartPre=/home/mind/kiosk-prepare-display.sh

[Install]
WantedBy=default.target
```

Enable and start the user service:

```bash
systemctl --user daemon-reload
systemctl --user enable --now vlms-kiosk.service
journalctl --user -u vlms-kiosk -f   # follow the log
```

The kiosk now launches a full‑screen Chromium instance **without any panel or window decorations**. If Chromium crashes, systemd restarts it after 5 seconds.

### Testing the Kiosk Page

During development you can still open the kiosk page at **http://localhost:5173/kiosk** from any browser. The page includes:

- On‑screen QWERTY keyboard with Spanish characters (ñ, accents)  
- Numeric keypad for the phone field (digits, +, -, space)  
- 2‑minute idle timeout — form resets automatically  
- 15‑second auto‑return after successful registration  
- Large fonts and touch targets optimized for elderly users

---

After running `scripts.seed`:

| Email | Password | Role |
|---|---|---|
| admin@torremind.com | Admin123! | admin |
| staff@torremind.com | Staff123! | lobby_staff |
| security@torremind.com | Security123! | security |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://vlms:vlms_dev@localhost:5432/vlms` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | JWT signing key |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `WHATSAPP_API_BASE_URL` | `https://graph.facebook.com` | Meta Cloud API base URL |
| `WHATSAPP_API_VERSION` | `v21.0` | Meta Graph API version |
| `WHATSAPP_PHONE_NUMBER_ID` | `""` | WhatsApp sender phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | `""` | Meta Cloud API access token |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `vlms-verify-token` | Webhook verification token |
| `HOST_TIMEOUT_SECONDS` | `300` | Escalation timeout (seconds) |
| `AUTO_CHECKOUT_MINUTES` | `480` | Auto check-out after inactivity (minutes) |
| `ENVIRONMENT` | `dev` | Runtime environment: `dev`, `staging`, `production` |

---

## Database

```bash
# Run migrations + seed (idempotent — safe to run multiple times)
uv run python -m scripts.seed

# Manual migration
uv run alembic upgrade head

# Create a new migration
uv run alembic revision --autogenerate -m "description"
```

---

## Testing

```bash
cd backend
uv run pytest -v                   # 86 tests
```

```bash
cd frontend
npx tsc -b                         # type-check
npm run build                      # production build
```

---

## Project Structure

```
VLMSControl/
├── backend/          # FastAPI app (Python)
│   ├── app/
│   │   ├── api/      # REST routes (v1)
│   │   ├── core/     # auth, config, metrics, audit
│   │   ├── models/   # SQLAlchemy models (11)
│   │   └── whatsapp/ # Meta Cloud API client + webhook
│   ├── alembic/      # DB migrations
│   ├── scripts/      # seed.py
│   └── tests/        # 86 tests
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/  # UI primitives, home panels, kiosk keyboard
│   │   ├── pages/       # Dashboard, History, Deliveries, Kiosk, etc.
│   │   ├── hooks/       # useSocket (Socket.IO)
│   │   └── services/    # API client with JWT
│   └── package.json
├── mockup/           # WhatsApp API simulator
│   ├── main.py       # FastAPI mock server
│   └── static/       # Chat UI (WhatsApp Web-like)
├── compose.yaml      # Dev: PostgreSQL + Redis
├── compose.all.yaml  # Full stack: all services
├── AGENTS.md         # Architecture + conventions
└── fast_workflow.md  # Receptionist UX design
```

---

## Logging

All services write structured logs to both **stdout** and **rotating log files** in `logs/`.

| Service | Log File | Log Level |
|---|---|---|
| Backend (FastAPI) | `logs/backend.log` | `DEBUG` (configurable via `LOG_LEVEL` env var) |
| Seed script | `logs/seed.log` | `INFO` |
| Mockup (WhatsApp) | `logs/mockup.log` | `DEBUG` |

Format:
```
2026-06-02 12:34:56 | INFO    | vlms:42 | GET /api/v1/visits/active → 200 (15ms)
```

- **Backend** logs every HTTP request (method, path, status, duration) plus unhandled exceptions with full traceback.
- **Seed script** logs migration output and user creation status.
- **Mockup** logs all Meta API calls, tenant replies, visitor messages, and webhook forwards.
- **Frontend** has a `logger` utility (`frontend/src/lib/logger.ts`) that outputs timestamped, leveled logs to the browser console. Set `VITE_LOG_LEVEL=info` in the Vite env to control verbosity.

To change the backend log level at runtime:
```bash
LOG_LEVEL=INFO uv run uvicorn app.main:app --reload --port 8000
```

---

## Architecture

```
Visitor Phone          Staff Browser           Meta Cloud API / Mockup
     │                      │                      │
     │  QR scan / WhatsApp  │                      │
     ├─────────────────────►│                      │
     │                      │  POST /api/v1/...    │
     │                      ├─────────────────────►│
     │                      │  WebSocket (Socket.IO)│
     │                      │◄────────────────────►│
     │                      │                      │
     │  WhatsApp msg        │                      │  POST /webhooks/whatsapp
     │◄─────────────────────┤◄─────────────────────┤
     │                      │                      │
```
