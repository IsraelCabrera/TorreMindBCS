# VLMS Production Deployment

## Architecture

```
Internet ──► Caddy (:80/:443) ──► Frontend (nginx, :80) ──► Backend (:8000)
                 │                                                    │
                 ├── Ngrok (https://*.ngrok.io) ◄── WhatsApp Webhook  │
                 │                                                    │
           PostgreSQL (volume: pgdata) ◄──────────────────────────────┘
           Redis ◄─────────────────────────────────────────────────────┘
```

- **Caddy**: Reverse proxy with auto-HTTPS (Let's Encrypt). Listens on `:80` / `:443`.
- **Frontend**: Nginx serving static React build. Proxies `/api/`, `/ws/`, `/webhooks/` to backend.
- **Backend**: FastAPI server (internal, not exposed directly).
- **Worker**: ARQ background worker (escalation timers).
- **Ngrok**: Public HTTPS tunnel for WhatsApp webhook callbacks. Starts with `--profile ngrok`.
- **PostgreSQL**: Data persisted in named volume `pgdata` — survives rebuilds.
- **Redis**: Session cache and ARQ job queue.

## First-Time Setup

Run on the Ubuntu server:

```bash
sudo bash scripts/deploy/setup.sh
```

This will:
1. Install Docker + Docker Compose plugin
2. Clone the repository to `/opt/vlms/VLMSControl`
3. Prompt for server IP/domain and generate `.env`
4. Start all services

After setup, edit `/opt/vlms/VLMSControl/.env` to fill in:
- `SECRET_KEY` — generate with `openssl rand -hex 32`
- `NGROK_AUTHTOKEN` — from https://dashboard.ngrok.com/get-started/your-authtoken
- `WHATSAPP_PHONE_NUMBER_ID` — from Meta Business account
- `WHATSAPP_ACCESS_TOKEN` — from Meta Business account

Then restart: `docker compose -f compose.all.yaml -f compose.prod.yaml --profile ngrok up -d`

## Updates

### Manual
```bash
sudo bash scripts/deploy/update.sh
```

### Automatic (GitHub Actions)
On every push/merge to `main`, the server auto-updates.

## GitHub Secrets for CI/CD

Configure these in your repo → Settings → Secrets and variables → Actions:

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Server IP or domain |
| `DEPLOY_USER` | SSH username (e.g. `ubuntu` or `vlms`) |
| `DEPLOY_KEY` | SSH private key content (the whole PEM file) |

### SSH Deploy Key Setup

On the server:

```bash
ssh-keygen -t ed25519 -C "github-actions@vlms" -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions   # ← copy this into DEPLOY_KEY secret
```

Test locally:

```bash
ssh -i ~/.ssh/github-actions ubuntu@<SERVER_IP> "bash scripts/deploy/update.sh"
```

## Ngrok Notes

- **Free plan**: URL changes on each restart. Run `curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"` to get the current URL. You'll need to update the WhatsApp webhook URL in Meta Dashboard after each restart.
- **Paid plan**: Set `NGROK_DOMAIN=your-domain.ngrok.io` in `.env` for a fixed URL. The `--domain` flag will be passed to ngrok automatically (requires `NGROK_AUTHTOKEN`).

## HTTPS with Caddy

- **No `SERVER_DOMAIN` set**: Caddy serves plain HTTP on `:80`.
- **`SERVER_DOMAIN=mind.torre.mx`**: Caddy auto-provisions Let's Encrypt SSL and redirects HTTP→HTTPS.
- **DNS**: Point your domain's A record to the server IP.

## Data Persistence

- PostgreSQL data → Docker named volume `pgdata` (defined in `compose.all.yaml`)
- Caddy SSL certs → Docker named volume `caddy_data` (defined in `compose.prod.yaml`)

Both survive `up -d --build`, `docker compose restart`, and server reboots.
To destroy all data: `docker compose -f compose.all.yaml -f compose.prod.yaml down -v`
