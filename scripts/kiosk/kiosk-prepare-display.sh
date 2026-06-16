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
