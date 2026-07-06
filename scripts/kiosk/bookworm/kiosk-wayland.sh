#!/usr/bin/env bash
# kiosk-wayland.sh – VLMS kiosk on Raspberry Pi (Bookworm, Wayland + cage)
#
# Bookworm changes vs Trixie:
#   • Added --touch-events=enabled – otherwise touch drags select text
#   • Added --disable-features=TouchTextSelection – prevents text selection
#     on touch scroll, which was broken on Bookworm's Chromium + Wayland
#   • Added --disable-features=OverscrollHistoryNavigation – avoids
#     back/forward swipe from competing with scroll

set -euo pipefail

# 0️⃣  Clean stray X11 socket
rm -f /tmp/.X11-unix/X0
pkill -x Xwayland 2>/dev/null || true

# 1️⃣  The mode has already been programmed by the ExecStartPre helper,
#     but doing it again is harmless and guarantees the mode is present.
OUT="$(wlr-randr --json | jq -r '.[] | select(.enabled==true) | .name' | head -n1)"
[[ -n "$OUT" ]] && wlr-randr --output "$OUT" --mode 1024x600

# 2️⃣  Environment for cage – **no WAYLAND_DISPLAY**
export XDG_RUNTIME_DIR="/run/user/$(id -u)"

# 3️⃣  Chromium binary
CHROMIUM="/usr/bin/chromium"
[[ -x "$CHROMIUM" ]] || CHROMIUM="/usr/bin/chromium-browser"

# 4️⃣  Start cage + Chromium in kiosk mode
exec cage -- "$CHROMIUM" \
    --kiosk \
    --start-fullscreen \
    --no-first-run \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --ozone-platform=wayland \
    --disable-features=WaylandWindowDecorations \
    --disable-features=TouchTextSelection \
    --disable-features=OverscrollHistoryNavigation \
    --touch-events=enabled \
    --no-sandbox \
    --start-maximized \
    --noerrdialogs \
    "http://172.30.2.24/kiosk"
