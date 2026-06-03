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

## Seeded Users

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
uv run pytest -v                   # 69 tests
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
│   │   ├── core/     # auth, config, metrics
│   │   ├── models/   # SQLAlchemy models (10)
│   │   └── whatsapp/ # Meta Cloud API client + webhook
│   ├── alembic/      # DB migrations
│   ├── scripts/      # seed.py
│   └── tests/        # 69 tests
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/  # UI primitives + home panels
│   │   ├── pages/       # Dashboard, History, Deliveries, etc.
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
