#!/usr/bin/env bash
# kiosk-wayland.sh – VLMS kiosk on Raspberry Pi (Wayland + cage 0.2)

set -euo pipefail

# 0️⃣  Clean stray X11 socket
rm -f /tmp/.X11-unix/X0
pkill -x Xwayland 2>/dev/null || true

# 1️⃣  The mode has already been programmed by the ExecStartPre helper,
#     but doing it again is harmless and guarantees the mode is present.
OUT="$(wlr-randr --json | jq -r '.[] | select(.enabled==true) | .name' | head -n1)"
[[ -n "$OUT" ]] && wlr-randr --output "$OUT" --mode 1024x600@59.852001Hz

# 2️⃣  Environment for cage – **no WAYLAND_DISPLAY**
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
# export WAYLAND_DISPLAY="wayland-0"   ←  REMOVE / COMMENT THIS LINE

# 3️⃣  Chromium binary
CHROMIUM="/usr/bin/chromium"
[[ -x "$CHROMIUM" ]] || CHROMIUM="/usr/bin/chromium-browser"

# 4️⃣  Start cage (short options only – cage 0.2) + Chromium
cmd=(
  "$CHROMIUM"
    --kiosk
    --start-fullscreen
    --no-first-run
    --disable-infobars
    --disable-session-crashed-bubble
    --ozone-platform=wayland
    --disable-features=WaylandWindowDecorations   # <‑‑ hides Chromium title‑bar
    --no-sandbox
    --start-maximized
    --noerrdialogs
    "http://172.30.2.129:5173/kiosk"
)

exec "${cmd[@]}"
