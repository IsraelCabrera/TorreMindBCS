#!/usr/bin/env bash
# setup-kiosk.sh – First-time setup for VLMS kiosk on Raspberry Pi OS Bookworm
#
# Run this ONCE on a fresh Raspberry Pi OS Lite (Bookworm) installation:
#
#   sudo bash scripts/kiosk/bookworm/setup-kiosk.sh
#
# What it does:
#   1. System update & package install (chromium, cage, wlr-randr, etc.)
#   2. Creates 'mind' user and adds to required groups (video, input, seat)
#   3. Enables seatd for Wayland seat management
#   4. Disables default desktop (Wayfire/Waybar) and sets console auto-login
#   5. Installs kiosk systemd service and enables it
#   6. Configures touchscreen (libinput) for proper scroll behavior
#   7. Applies Raspberry Pi firmware tweaks for the 10.1" display
#   8. Configures WiFi (optional, prompted interactively)

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
KIOSK_USER="mind"
KIOSK_HOME="/home/${KIOSK_USER}"
KIOSK_URL="${KIOSK_URL:-http://172.30.2.24/kiosk}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REBOOT_REQUIRED=false

# ── Color helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
section() { echo; echo -e "${YELLOW}── $1 ──${NC}"; }

# Must be root
if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root: sudo bash $0"
    exit 1
fi

# Must be Bookworm
if ! grep -qi "bookworm" /etc/os-release 2>/dev/null; then
    warn "This script is designed for Raspberry Pi OS Bookworm."
    warn "Detected: $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"')"
    echo -n "Continue anyway? (y/N) "; read -r answer
    [[ "$answer" != "y" && "$answer" != "Y" ]] && exit 1
fi

# ── 1. System update + essential packages ──────────────────────────────────
section "Step 1/8 – System update & packages"

apt-get update -qq
apt-get upgrade -y -qq
info "System updated"

apt-get install -y -qq \
    chromium \
    cage \
    wlr-randr \
    jq \
    seatd \
    libinput-tools \
    libvulkan-broadcom \
    raspi-config \
    unclutter-xfixes \
    xdg-utils \
    fonts-dejavu-core \
    curl \
    git
info "Required packages installed"

# ── 2. Create 'mind' user + groups ────────────────────────────────────────
section "Step 2/8 – User & groups"

if id "$KIOSK_USER" &>/dev/null; then
    info "User '$KIOSK_USER' already exists"
else
    useradd -m -s /bin/bash "$KIOSK_USER"
    echo "Set password for user '$KIOSK_USER':"
    passwd "$KIOSK_USER"
    info "User '$KIOSK_USER' created"
fi

usermod -aG video,input,seat "$KIOSK_USER"
info "User added to groups: video, input, seat"

loginctl enable-linger "$KIOSK_USER" 2>/dev/null || true
info "Lingering enabled for $KIOSK_USER (user services run without login)"

# ── 3. Enable seatd ────────────────────────────────────────────────────────
section "Step 3/8 – seatd (Wayland seat management)"

systemctl enable --now seatd 2>/dev/null || true
if systemctl is-active --quiet seatd; then
    info "seatd is running"
else
    warn "seatd not running – will check after reboot"
    REBOOT_REQUIRED=true
fi

# ── 4. Disable desktop + console auto-login ───────────────────────────────
section "Step 4/8 – Disable desktop, enable console auto-login"

# Mask the default desktop components
for unit in wayfire waybar wfrespawn lightdm gdm3; do
    systemctl mask "$unit" 2>/dev/null || true
done
info "Default desktop masked (Wayfire/Waybar)"

# Set console auto-login for the kiosk user
raspi-config nonint do_boot_behaviour B2  # B2 = Console AutoLogin
if [[ -f /etc/systemd/system/getty@tty1.service.d/autologin.conf ]]; then
    # Override the auto-login user to 'mind'
    sed -i "s/--autologin [^ ]*/--autologin $KIOSK_USER/" \
        /etc/systemd/system/getty@tty1.service.d/autologin.conf 2>/dev/null || true
fi
info "Console auto-login set for user '$KIOSK_USER'"

# ── 5. Install kiosk scripts + systemd service ────────────────────────────
section "Step 5/8 – Kiosk service installation"

# Copy scripts to the kiosk user's home
cp "$SCRIPT_DIR/kiosk-wayland.sh"       "$KIOSK_HOME/"
cp "$SCRIPT_DIR/kiosk-prepare-display.sh" "$KIOSK_HOME/"
cp "$SCRIPT_DIR/vlms-kiosk.service"     "$KIOSK_HOME/"
chown "$KIOSK_USER:$KIOSK_USER" \
    "$KIOSK_HOME/kiosk-wayland.sh" \
    "$KIOSK_HOME/kiosk-prepare-display.sh" \
    "$KIOSK_HOME/vlms-kiosk.service"
chmod +x "$KIOSK_HOME/kiosk-wayland.sh" "$KIOSK_HOME/kiosk-prepare-display.sh"
info "Kiosk scripts copied to $KIOSK_HOME"

# Install the systemd user service
# Using system-wide path so it starts on boot before any user session
install -m 644 "$SCRIPT_DIR/vlms-kiosk.service" /etc/systemd/system/vlms-kiosk.service
systemctl daemon-reload
systemctl enable vlms-kiosk.service
info "vlms-kiosk.service installed and enabled"

# ── 6. Touchscreen configuration ──────────────────────────────────────────
section "Step 6/8 – Touchscreen configuration"

# Create libinput config snippet for touchscreen
mkdir -p /etc/libinput

# Create a udev rule to set ID_INPUT_TOUCHSCREEN if not already set
cat > /etc/udev/rules.d/99-vlms-touchscreen.rules << 'UDEV'
# Ensure the touchscreen is properly recognized
ACTION=="add|change", SUBSYSTEM=="input", ATTRS{name}=="*touch*", ENV{LIBINPUT_CALIBRATION_MATRIX}="1 0 0 0 1 0"
UDEV
udevadm control --reload-rules 2>/dev/null || true
info "Udev rule created for touchscreen"

# Calibrate if possible – this is interactive
if command -v libinput &>/dev/null; then
    echo ""
    echo "Touchscreen calibration (optional):"
    echo "  The kiosk uses a 10.1-inch 1024x600 panel."
    echo "  If touch coordinates are inverted or offset, run:"
    echo "    sudo libinput debug-events"
    echo "  And use the 'libinput touch' tool:"
    echo "    sudo apt-get install libinput-tools"
    echo "    sudo libinput measure touchscreen --device /dev/input/event*"
    echo ""
fi

# ── 7. Raspberry Pi firmware tweaks ───────────────────────────────────────
section "Step 7/8 – Raspberry Pi firmware tweaks"

CONFIG_FILE="/boot/firmware/config.txt"
if [[ ! -f "$CONFIG_FILE" ]]; then
    CONFIG_FILE="/boot/config.txt"  # older Pi OS layout
fi

if [[ -f "$CONFIG_FILE" ]]; then
    # Enable DRM VC4 driver (needed for Wayland)
    if grep -q "^#dtoverlay=vc4-fkms-v3d" "$CONFIG_FILE"; then
        sed -i 's/^#dtoverlay=vc4-fkms-v3d/dtoverlay=vc4-fkms-v3d/' "$CONFIG_FILE"
        info "vc4-fkms-v3d overlay enabled"
    fi

    # Set GPU memory to at least 128 MB for Chromium
    if grep -q "^gpu_mem=" "$CONFIG_FILE"; then
        sed -i 's/^gpu_mem=.*/gpu_mem=128/' "$CONFIG_FILE"
    else
        echo "gpu_mem=128" >> "$CONFIG_FILE"
    fi
    info "GPU memory set to 128 MB"

    # Disable overscan (full-screen output)
    if ! grep -q "^disable_overscan=1" "$CONFIG_FILE"; then
        echo "disable_overscan=1" >> "$CONFIG_FILE"
        info "Overscan disabled"
    fi

    REBOOT_REQUIRED=true
else
    warn "Could not find /boot/firmware/config.txt – skipping firmware tweaks"
fi

# ── 8. WiFi configuration (optional) ──────────────────────────────────────
section "Step 8/8 – WiFi configuration (optional)"

if command -v nmcli &>/dev/null; then
    echo ""
    echo -n "Configure WiFi now? (y/N): "; read -r setup_wifi
    if [[ "$setup_wifi" == "y" || "$setup_wifi" == "Y" ]]; then
        echo -n "WiFi SSID: "; read -r wifi_ssid
        echo -n "WiFi password: "; read -r -s wifi_pass; echo ""
        nmcli dev wifi connect "$wifi_ssid" password "$wifi_pass" 2>/dev/null && \
            info "WiFi connected to '$wifi_ssid'" || \
            err "Failed to connect to '$wifi_ssid' – check SSID/password"
    fi
else
    warn "nmcli not available – install NetworkManager to configure WiFi from this script"
fi

# ── Summary ────────────────────────────────────────────────────────────────
section "✅ Setup complete!"

echo "  Kiosk URL:     $KIOSK_URL"
echo "  Service:       vlms-kiosk.service (enabled)"
echo "  Scripts:       $KIOSK_HOME/{kiosk-wayland.sh,kiosk-prepare-display.sh}"
echo "  User:          $KIOSK_USER (groups: video, input, seat)"
echo "  Auto-login:    console → $KIOSK_USER"
echo ""
echo "  Touch fix:     --touch-events=enabled + --disable-features=TouchTextSelection"
echo "                 added to Chromium flags in kiosk-wayland.sh"
echo ""

if [[ "$REBOOT_REQUIRED" == true ]]; then
    echo -n "⚠ Reboot needed. Reboot now? (Y/n): "; read -r answer
    if [[ -z "$answer" || "$answer" == "y" || "$answer" == "Y" ]]; then
        info "Rebooting..."
        reboot
    else
        echo "  Reboot later with: sudo reboot"
    fi
fi
