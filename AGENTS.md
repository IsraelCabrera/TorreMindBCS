# Torre Mind — VLMS Agent Guide

## Project Overview

Visitor & Lobby Management System (VLMS) for Torre Mind, a commercial office building in Tijuana.
Staff register visitors via a web dashboard, tenants receive WhatsApp notifications with interactive
buttons ("Que suba" / "No disponible"), and everything is tracked in real-time.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.13+) |
| ORM | SQLAlchemy 2.0 + asyncpg |
| Migrations | Alembic |
| Real-time | python-socketio ⟷ Socket.IO (React) |
| Auth | JWT (access + refresh tokens) |
| WhatsApp | Meta Cloud API (direct, no middleman) |
| Background | ARQ (Redis-based) |
| DB / Cache | PostgreSQL 16 / Redis 7 |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Package | uv (Python), pnpm/npm (JS) |
| Infra | Docker Compose (`compose.yaml`) |

## Architecture

```
Visitor Phone          Staff Browser           Meta Cloud API
     │                      │                      │
     │  QR scan / WhatsApp  │                      │
     ├─────────────────────►│                      │
     │                      │   POST /api/v1/...   │
     │                      ├─────────────────────►│
     │                      │  WebSocket (Socket.IO)│
     │                      │◄────────────────────►│
     │                      │                      │
     │  WhatsApp msg        │                      │  POST /webhooks/whatsapp
     │◄─────────────────────┤◄─────────────────────┤
     │                      │                      │
```

## Design System

From existing site (codevisitors-production.up.railway.app):

| Token | Value |
|---|---|
| `--primary` | `#1f3a5f` |
| `--secondary` | `#1fa6a0` |
| `--accent` | `#17a2b8` |
| `--background` | `#f4f6f8` |
| `--card` | `#ffffff` |
| `--muted-foreground` | `#6b7280` |
| `--border` | `#e5e7eb` |
| `--radius` | `0.625rem` |
| Font | Geist (Tailwind default) |

## Key Data Models

- **User** — system users (lobby_staff / admin / security)
- **Visitor** — profile (name, phone, company, photo_url)
- **VisitRecord** — visit instance (visitor, tenant, type, status, timings, escalation_state)
- **Tenant** — company renting space
- **TenantContact** — per-tenant person (escalation_order, notification_channels)
- **DeliveryRecord** — package delivery
- **NotificationLog** — outbound notification tracking
- **WhatsAppSession** — conversation state machine
- **BlocklistEntry** — denied individuals
- **MetricLog** — per-action timing

## VisitRecord Status / Escalation State Machine

```
PENDING ──► ESCALATED ──► STAFF_DECISION
  │                            │
  ├──► APPROVED ◄──────────────┤
  └──► DENIED   ◄──────────────┘
       │
       └──► CHECKED_OUT
```

## API Routes (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/refresh | Refresh token |
| GET/POST | /api/v1/visitors | List / Create |
| GET/PUT | /api/v1/visitors/{id} | Get / Update |
| GET | /api/v1/visits/active | Currently in building |
| POST | /api/v1/visits/check-in | Create visit + notify host |
| POST | /api/v1/visits/{id}/check-out | Manual check-out |
| PUT | /api/v1/visits/{id} | Staff override |
| POST | /api/v1/visits/{id}/escalate | Manual escalation |
| POST | /api/v1/visits/{id}/notify-retry | Re-send notification |
| GET | /api/v1/visits/history | Searchable log |
| GET/POST | /api/v1/deliveries | List / Create delivery |
| POST | /api/v1/deliveries/{id}/collect | Mark collected |
| GET/POST/PUT | /api/v1/tenants | Tenant CRUD |
| GET/POST/PUT/DELETE | /api/v1/tenants/{id}/contacts | Contact CRUD |
| GET/POST/DELETE | /api/v1/blocklist | Blocklist CRUD |
| POST | /api/v1/blocklist/check | Name match check |
| GET | /api/v1/reports/daily | Daily summary |
| GET | /api/v1/reports/export | CSV/PDF export |
| GET | /api/v1/reports/metrics | Action timing stats |
| GET/POST | /api/v1/admin/users | User management |
| POST | /api/v1/admin/audit-log/search | Audit log |
| GET | /webhooks/whatsapp | Meta webhook verification |
| POST | /webhooks/whatsapp | Inbound messages |
| WS | /ws | Socket.IO |

## Phased Delivery

### Phase 0 — Architecture & Setup ✅
- [x] AGENTS.md created
- [x] Backend scaffold (pyproject.toml, FastAPI app)
- [x] compose.yaml (PostgreSQL 16 + Redis 7 + backend + ARQ worker)
- [x] SQLAlchemy models (10) + Alembic migration
- [x] JWT auth + RBAC (role hierarchy: security < lobby_staff < admin)
- [x] Frontend scaffold (Vite + React + TS + Tailwind v4 + shadcn/ui)
- [x] Layout components (Header, Footer, Layout)
- [x] Brand assets (logo, favicon) — logo not yet placed in `frontend/public/`
- [ ] START Meta Business account + WhatsApp app setup

### Phase 1 Track A — WhatsApp Core Loop ✅
- [x] Meta Graph API client (httpx async) — `app/whatsapp/client.py`
- [x] Webhook verification + inbound handler — `app/whatsapp/webhook.py`
- [x] Message builders (host_acknowledgment, package_arrival, host_escalated) — `app/whatsapp/messages.py`
- [x] Notification handlers (notify_host, notify_delivery_recipient) — `app/whatsapp/handlers.py`
- [x] Escalation timer (ARQ background task) — `app/worker.py` + `app/worker_settings.py`
- [x] Webhook wired into visit state machine (button_reply → approve/deny → Socket.IO event)
- [x] Delivery notification endpoint (POST /deliveries/{id}/notify)
- [ ] End-to-end WhatsApp flow test (blocked on Meta approval)

### Phase 1 Track B — Staff UI + Backend Logic ✅
- [x] All API routes (auth, visitors, visits, tenants, deliveries, blocklist, reports, admin, webhooks) — 20+ endpoints
- [x] Home page (visitor type selection grid) — `frontend/src/pages/Home/`
- [x] Check-in form (dynamic fields) — `frontend/src/pages/Checkin/`
- [x] Real-time dashboard (active visitors via Socket.IO) — `frontend/src/pages/Dashboard/`
- [x] History page (filterable log) — `frontend/src/pages/History/`
- [x] Exit page (check-out by ID/name) — `frontend/src/pages/Exit/`
- [x] Delivery flow (list/create/collect) — `frontend/src/pages/Deliveries/`
- [x] Tenants directory — `frontend/src/pages/Tenants/`
- [x] Reports (daily/metrics) — `frontend/src/pages/Reports/`
- [x] Admin login — `frontend/src/pages/Admin/`
- [x] Metrics decorator (`@track_metric`) — `app/core/metrics.py`
- [x] Test suite (69 tests across 10 modules) — all passing with 0 warnings

## Conventions

- **Python**: type hints everywhere, async where possible, no comments unless explaining *why*
- **React**: TypeScript, function components, shadcn/ui primitives, Tailwind classes
- **DB**: UUID primary keys, soft deletes via `is_active`, timestamps via model mixin
- **API**: Consistent error format `{ "detail": "...", "code": "..." }`
- **Git**: Conventional commits, one feature per commit, no secrets

## Progress
### Done
- Created AGENTS.md with full project overview, architecture, design system, API routes, and phased delivery checklist.
- Created `compose.yaml` (PostgreSQL 16 + Redis 7 + backend + worker services).
- Scaffolded backend: `pyproject.toml`, Dockerfile, FastAPI app skeleton, config (pydantic-settings), async DB engine.
- Defined all 10 SQLAlchemy models (User, Visitor, VisitRecord, Tenant, TenantContact, DeliveryRecord, NotificationLog, WhatsAppSession, BlocklistEntry, MetricLog) with UUID PKs, timestamps, soft-delete mixins, and JSONB fields.
- Created Alembic env.py + initial migration (applied to running PG).
- Implemented JWT auth (hash/verify, access+refresh tokens, decode) and RBAC dependency (`require_role`).
- Created `MetricLog` model + `track_metric` decorator / `log_metric` function.
- Created all v1 API routes: auth (login/refresh/me), visitors CRUD, visits (check-in/active/history/check-out/override/escalate/notify-retry), tenants CRUD + contacts CRUD, deliveries (list/create/collect/notify), blocklist (list/create/delete/check), reports (daily/metrics), admin users CRUD.
- Set up Socket.IO server in `app/socketio_server.py` + websocket manager with dashboard room.
- Created WhatsApp integration layer: `client.py`, `webhook.py` (verification + inbound button_reply handler with DB update), `messages.py` (host_acknowledgment, package_arrival, escalation builders), `handlers.py` (notify_host, notify_delivery_recipient).
- Set up ARQ background worker: `app/worker.py` (schedule_escalation + escalate_visit task), `app/worker_settings.py` (WorkerSettings for arq CLI), added `worker` service to `compose.yaml`.
- Wired WhatsApp webhook into visit state machine: `handle_button_reply` now looks up VisitRecord by UUID, updates status to `approved`/`denied`, sets `acknowledged_at`, emits Socket.IO event.
- Added delivery notification endpoint (`POST /api/v1/deliveries/{id}/notify`) that sends `package_arrival` template via WhatsApp.
- Switched from `passlib[bcrypt]` to direct `bcrypt>=4.1.0` to fix passlib backend detection crash on Python 3.14.
- Scaffolded frontend: Vite + React + TypeScript + Tailwind v4. Installed all deps.
- Created `src/index.css` with Tailwind theme matching existing design system.
- Created layout components: Header (MIND logo, nav), Footer, Layout (gradient wrapper).
- Created all page components with correct relative imports: Home, Checkin, Dashboard (Socket.IO live list), Exit, History (filterable), Deliveries (list/create/collect), Tenants (directory grid), Reports (daily/metrics), Admin (login form).
- Created `services/api.ts` (auth token management, fetch wrapper).
- Created `hooks/useSocket.ts` (Socket.IO connection with event subscription).
- Created `App.tsx` with all routes under `<Layout>` wrapper.
- Fixed circular import: moved `sio`/`sio_app` to `app/socketio_server.py`.
- Created comprehensive test suite with `conftest.py` (prepare_db, shared db_session per test, client, token fixtures) and 10 test modules covering all API endpoints, RBAC, webhook, and error cases.

### In Progress
- (none)

### Blocked
- Meta Business Account + WhatsApp app not yet created (needs legal entity docs). Template approval lead time ~24-48h.
- `mind-logo.png` not yet placed in `frontend/public/`.

## Key Decisions
- **FastAPI over Django** for async-native webhook handling.
- **Meta Cloud API direct** (no middleware) to own full integration and avoid per-message provider markups.
- **App-side UUID generation** (`default=uuid.uuid4`) instead of DB `gen_random_uuid()` to avoid quoting issues with Alembic.
- **Escalation order**: sequential notification of TenantContacts sorted by `escalation_order`; fallback to staff decision.
- **Custom React admin** (not sqladmin/starlette-admin) for consistent UI with existing design system.
- **Socket.IO** for real-time (over SSE) because user explicitly wanted WebSockets.
- **ARQ** for background tasks (Redis-based, async-native, FastAPI-compatible).
- **`verbatimModuleSyntax: true`** in TS config → type-only imports must use `import type`.
- **`bcrypt` direct** instead of `passlib[bcrypt]` — passlib's backend detection crashes on Python 3.14 with bcrypt 5.0 (72-byte limit error).
- **Socket.IO sio in separate module** (`app/socketio_server.py`) to break circular import between `main.py` and `websocket/manager.py`.

## Next Steps
1. Copy MIND logo/favicon assets to `frontend/public/`.
2. Start Meta Business account + WhatsApp app creation in Meta Developer Dashboard (critical path, requires business docs).
3. Create and submit message templates (host_acknowledgment, package_arrival, host_escalated) in Meta Business Manager — ES + EN versions.
4. Run full E2E test: staff check-in → WhatsApp sends → host taps button → dashboard updates.

## Critical Context
- `compose.yaml` uses `docker compose` (v2). Services: db (postgres:16-alpine), redis (redis:7-alpine), backend (build local), worker (arq app.worker_settings.WorkerSettings).
- Python 3.14.0 installed on dev machine (uv auto-detected). `pyproject.toml` requires `>=3.13`.
- Alembic migration `80c02d6628be` → `initial_models` applied to local PG. DB on `localhost:5432`, user/pass `vlms/vlms_dev`.
- `MetricLog` uses column name `extra_metadata` (not `metadata`) to avoid SQLAlchemy MetaData conflict.
- Frontend Vite proxy redirects `/api`, `/ws`, `/webhooks` to FastAPI on `:8000`.
- TypeScript v6.0.2 in use. `baseUrl` + `paths` deprecated in TS 7.0 but silenced with `ignoreDeprecations: "6.0"`.
- `verbatimModuleSyntax: true` is ON; all type-only imports must use `import type { ... }`.
- Backend builds/imports verified clean (`uv run python3 -c "from app... all OK"`). Frontend builds clean (`npx tsc -b && vite build`).
- Test suite has 69 tests across 10 modules covering auth, RBAC, visitors, visits (check-in/check-out/history/escalate/notify-retry), tenants + contacts CRUD, deliveries (create/list/collect/notify), blocklist (list/add/check/delete), reports (daily/metrics), admin (list/create/update/password), and webhook (verification + inbound button_reply). Tests use shared db_session per test with rollback teardown.
- `notify_host` and `notify_delivery_recipient` will fail gracefully (no exception) when WhatsApp credentials are empty (invalid token response caught in try/except).
- `scripts/seed.py` is idempotent — deletes all data and recreates it from scratch. Must re-query all ORM objects after each `session.commit()` else they expire and raise `MissingGreenlet` on attribute access. Run with `uv run python -m scripts.seed` from `backend/`.
- pytest-asyncio 1.4.0 uses `loop_scope` instead of the deprecated `event_loop` fixture. Configured via `asyncio_default_fixture_loop_scope = "session"` and `asyncio_default_test_loop_scope = "session"` in `pyproject.toml` to avoid asyncpg "different loop" errors.

## Relevant Files
- `/Users/israel/dev/torremind/VLMSControl/requirements.md`: Original 888-line product discovery doc.
- `/Users/israel/dev/torremind/VLMSControl/AGENTS.md`: Project tracking, architecture diagram, API routes, data models, phased delivery checklist.
- `/Users/israel/dev/torremind/VLMSControl/compose.yaml`: Docker services (PG 16, Redis 7, backend, ARQ worker with health checks).
- `/Users/israel/dev/torremind/VLMSControl/backend/pyproject.toml`: 13 core deps + dev deps (pytest, httpx), managed by uv, bcrypt replaces passlib.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/models/*.py`: 10 SQLAlchemy models.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/api/v1/*.py`: REST routes for auth, visitors, visits, tenants, deliveries, blocklist, reports, admin.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/socketio_server.py`: Socket.IO server instance + connect/disconnect events (isolated to break circular import).
- `/Users/israel/dev/torremind/VLMSControl/backend/app/websocket/manager.py`: emit_visit_update and emit_notification helpers.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/whatsapp/*.py`: Meta Cloud API client, webhook handler with DB update, message builders, notification handlers.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/worker.py`: ARQ background job definitions (escalate_visit) + schedule_escalation helper.
- `/Users/israel/dev/torremind/VLMSControl/backend/app/core/auth.py`: JWT + direct bcrypt password hashing.
- `/Users/israel/dev/torremind/VLMSControl/backend/tests/conftest.py`: Test fixtures (prepare_db, shared db_session per test, client with override, token/header fixtures, test tenant/visitor factories).
- `/Users/israel/dev/torremind/VLMSControl/backend/tests/test_*.py`: 10 test modules covering all API endpoints, RBAC, webhook, and edge cases (69 tests total).
- `/Users/israel/dev/torremind/VLMSControl/frontend/src/App.tsx`: All routes under `<Layout>` wrapper.
- `/Users/israel/dev/torremind/VLMSControl/frontend/src/pages/*/*.tsx`: 9 page components.
- `/Users/israel/dev/torremind/VLMSControl/frontend/src/components/layout/*.tsx`: Header, Footer, Layout.
- `/Users/israel/dev/torremind/VLMSControl/frontend/src/services/api.ts`: Fetch wrapper with Bearer token + 401 redirect.
- `/Users/israel/dev/torremind/VLMSControl/frontend/src/hooks/useSocket.ts`: Socket.IO connection hook.
- `/Users/israel/dev/torremind/VLMSControl/backend/scripts/seed.py`: Idempotent seed script — deletes all data and recreates users, tenants+contacts, visitors, visits, deliveries, and blocklist entries for local testing.
