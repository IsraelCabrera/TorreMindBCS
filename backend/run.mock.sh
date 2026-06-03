#!/bin/sh
WHATSAPP_API_BASE_URL=http://localhost:9090 \
WHATSAPP_PHONE_NUMBER_ID=mock \
WHATSAPP_ACCESS_TOKEN=mock \
uv run uvicorn app.main:app --reload --port 8000
