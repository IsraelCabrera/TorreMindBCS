# Meta WhatsApp Cloud API — Setup Guide

## Prerequisites

1. **Meta Business Account** — create at [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business Account (WABA)** — created inside the Business Account
3. **A phone number** — dedicated number for sending messages (can be a virtual number, tested with Twilio)
4. **Meta Developer Account** — any Facebook account works

Create apps at [developers.facebook.com](https://developers.facebook.com).

> **Meta Business Verification is NOT required** to use the WhatsApp Cloud API.
> Since October 2023, verification is optional. You only need it for the green check badge
> ("Official Business Account") or very high messaging volumes. For Torre Mind's usage,
> you can start sending immediately without verification.

### Messaging limits (without verification)

| Limit | Value |
|---|---|
| Business-initiated conversations | 250 per 24 hours (initial) |
| Phone numbers per WABA | 2 (initial) |
| Auto-upgrade to Tier 1 | Engage 1,000 unique contacts in 30 days → 1,000 conversations/day, 20 phone numbers |

### If "Start Verification" is grayed out in Security Center

Ignore it — it's not blocking anything. Complete these steps instead:

1. Go to **Meta Business Settings → Business Info** and fill in your business name, address, phone, and website
2. Set up the WhatsApp app + webhook directly (Steps 1–3 below)
3. Start sending test messages using the WABA's own test phone number

---

## Step 1 — Create a WhatsApp App

1. Go to [Meta Developer Apps](https://developers.facebook.com/apps/)
2. Click **Create App** → choose **Business** type
3. Select **WhatsApp** as the integration
4. Name it e.g. `VLMS Torre Mind`
5. Once created, under **WhatsApp → Getting Started**, you'll see:
   - **Phone number ID** — copy this
   - **Temporary access token** — valid 24h (use only for testing)
   - **Send/Receive test messages** panel

---

## Step 2 — Configure Webhook

### Callback URL

The backend exposes the webhook at:

```
POST /webhooks/whatsapp
GET  /webhooks/whatsapp   (verification handshake)
```

With the Vite dev proxy running, the full URL during development is:

```
https://<your-tunnel-or-ngrok>.ngrok.io/webhooks/whatsapp
```

For local testing, use [ngrok](https://ngrok.com) to expose `localhost:8000`:

```bash
ngrok http 8000
```

Use the ngrok `https://` URL + `/webhooks/whatsapp` as the Callback URL in Meta.

### Verify Token

Set in Meta Developer Dashboard → WhatsApp → Configuration → **Callback URL**:

| Field | Value |
|---|---|
| Callback URL | `https://<your-domain>/webhooks/whatsapp` |
| Verify Token | `vlms-verify-token` (or whatever you set in `.env`) |

The verify token **must match** `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env`.

### Webhook Fields (subscriptions)

Subscribe to these fields:

- `messages` — inbound messages (text, button replies, interactive)
- `message_deliveries` — delivery receipts (optional)
- `message_reads` — read receipts (optional)

---

## Step 3 — Generate Permanent Access Token

The temporary token from Step 1 expires in 24h. For production, generate a **long-lived token**:

1. In the Meta Developer Dashboard → **WhatsApp → Configuration**
2. Click **Manage** next to the temporary token
3. This opens Meta Business Manager → **System Users**
4. Create or select a **System User** with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
5. Generate a token → this is your `WHATSAPP_ACCESS_TOKEN`

System User tokens don't expire unless revoked.

---

## Step 4 — Environment Variables

Create a `.env` file in `backend/`:

```env
# Required for WhatsApp
WHATSAPP_PHONE_NUMBER_ID=123456789012345       # From Step 1
WHATSAPP_ACCESS_TOKEN=EAAT...                   # From Step 3
WHATSAPP_WEBHOOK_VERIFY_TOKEN=vlms-verify-token # Must match Meta config
```

Optional overrides (defaults work for most cases):

```env
WHATSAPP_API_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v21.0
```

---

## Step 5 — Message Templates

All templates must be created in **Meta Business Manager → WhatsApp → Message Templates**.

Use **ES** (Spanish) language. Templates must be **submitted for approval** before they can be sent to end users. Approval typically takes 24–48h on first submission; subsequent updates are faster.

You can send templates to **test phone numbers** (the WABA's own phone) immediately without approval.

### Template 1 — `host_acknowledgment`

**Purpose:** Notify a tenant contact that a visitor is waiting.

| Field | Value |
|---|---|
| Name | `host_acknowledgment` |
| Language | `es` (Spanish) |
| Category | `Utility` |
| Content | Hola, tienes un visitante esperando en la recepción: *{{1}}* de *{{2}}* |

**Body parameters (2):**

| Index | Example |
|---|---|
| `{{1}}` | `Juan Pérez` (visitor name) |
| `{{2}}` | `Dynamo Coworking` (visitor company, or empty) |

**Buttons — Quick Reply (2):**

| Button | Type | Payload |
|---|---|---|
| Que suba | Quick Reply | `approve\|<visit_id>` |
| No disponible | Quick Reply | `deny\|<visit_id>` |

The `<visit_id>` is a UUID v4 (e.g. `b1a2c3d4-...`). The backend parses `approve|{uuid}` and `deny|{uuid}` to update the visit state.

**Header:** None (text only)
**Footer:** Optional — "Torre Mind"

### Template 2 — `package_arrival`

**Purpose:** Notify a tenant contact that a package has arrived.

| Field | Value |
|---|---|
| Name | `package_arrival` |
| Language | `es` |
| Category | `Utility` |
| Content | Hola, tienes un paquete registrado en recepción. Mensajería: *{{1}}*, destinatario: *{{2}}*. Número de guía: *{{3}}* |

**Body parameters (2–3):**

| Index | Required | Example |
|---|---|---|
| `{{1}}` | Yes | `DHL` (courier name) |
| `{{2}}` | Yes | `Alejandra García` (recipient name) |
| `{{3}}` | No | `1Z999AA10123456784` (guide/tracking number — optional, leave blank if not sent) |

**Buttons:** None
**Header:** None (text only)

> When `guide_number` is null, the backend sends only 2 parameters. Meta's template system requires all {{N}} placeholders in the body to be present in the template definition, but allows omitting parameters when sending. Design the template with `{{3}}` optional (e.g. at the end of the message or in parentheses) so it renders cleanly when omitted.

### Template 3 — `package_collected`

**Purpose:** Confirm to the recipient that their package was picked up.

| Field | Value |
|---|---|
| Name | `package_collected` |
| Language | `es` |
| Category | `Utility` |
| Content | Tu paquete de *{{1}}* a nombre de *{{2}}* ha sido recogido en recepción. Guía: *{{3}}* |

**Body parameters (2–3):**

| Index | Required | Example |
|---|---|---|
| `{{1}}` | Yes | `Estafeta` (courier name) |
| `{{2}}` | Yes | `Carlos Jiménez` (recipient name) |
| `{{3}}` | No | `1234567890` (guide/tracking number — optional) |

**Buttons:** None
**Header:** None (text only)

### Template 4 — `host_escalated`

**Purpose:** Notify a backup contact that the primary didn't respond.

| Field | Value |
|---|---|
| Name | `host_escalated` |
| Language | `es` |
| Category | `Utility` |
| Content | *{{1}}* sigue esperando en recepción. El contacto principal no ha respondido. Por favor atiéndelo. |

**Body parameters (1):**

| Index | Example |
|---|---|
| `{{1}}` | `Juan Pérez` (visitor name) |

**Buttons:** None
**Header:** None (text only)

---

## Template Submission Checklist

1. Use **ES** (Spanish) for all templates
2. Category must be **Utility** (Marketing templates have restrictions)
3. All body text should be polite, clear, and match the template name's purpose
4. Quick reply buttons for `host_acknowledgment` must be approved as part of the template
5. After submission, templates go through **Meta review** — if rejected, fix the reason and resubmit
6. Once approved, you can send them to any WhatsApp user who has opted in

---

## Step 6 — Verify End-to-End

### Webhook verification

Meta sends a `GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<random>`.

The backend responds with `200 OK` + the challenge string if the token matches. Meta then marks the webhook as **Configured**.

### Send a test message

With the WhatsApp test phone number (the one assigned to your WABA), you can send any template immediately (no approval needed):

1. Go to **WhatsApp → Getting Started → Send test message**
2. Pick `host_acknowledgment`, fill in `{{1}}` and `{{2}}`, send to your own phone
3. Or use the API via the backend seed + check-in flow

### Check notification logs

The backend logs every sent notification in the `notification_logs` table:

```sql
SELECT * FROM notification_logs ORDER BY sent_at DESC;
```

Look for status `"sent"` with a non-null `meta_message_id`.

---

## Step 7 — (Optional) QR-based Authentication

The app includes a `WhatsAppSession` model for stateful conversation handling. If you want visitors to scan a QR code and interact via WhatsApp for check-in, you'll need:

- Meta's **Authentication** template category (requires additional review)
- A configured **WhatsApp Business Account** with 2FA enabled
- Additional webhook handlers for the QR → check-in flow

This is not yet implemented — the current flow is staff-initiated (staff creates the visit via the dashboard).

---

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| `(#100) Invalid OAuth 2.0 Access Token` | Token expired — regenerate from System User |
| `(#100) Parameter 'to' is invalid` | Phone number not in international format (`+521234567890`) |
| `(#131030) Unable to send message` | Template not approved, or recipient hasn't opted in |
| Webhook verification fails | Verify token mismatch — check `.env` matches Meta config |
| Ngrok URL changes every restart | Use a paid ngrok plan for a fixed subdomain, or deploy to staging |
| "Without content" in WhatsApp | Template body parameters were missing or wrong count — check `messages.py` sends the right components |

### Important phone number format

Mexican phone numbers must be in international format:

- Landline: `+526641234567`
- Mobile: `+5216641234567` (`+52` + `1` + area code + number)

The `+521` prefix is specific to Mexico mobile numbers. If the template fails to send, double-check the format.
