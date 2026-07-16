#!/bin/bash
# ──────────────────────────────────────────────
# RedHawk — Linux Dependency Installer
# ──────────────────────────────────────────────
# Detects distro (apt/dnf/pacman) and installs
# all required tools for RedHawk on Linux.
# ──────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[*]${NC} $1"; }
ok()    { echo -e "${GREEN}[+]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[-]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       RedHawk Linux Setup            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Detect package manager ──
if command -v apt &>/dev/null; then
    PKG_MANAGER="apt"
    INSTALL_CMD="sudo apt install -y"
    UPDATE_CMD="sudo apt update"
    PYTHON="python3"
    PIP="pip3"
elif command -v dnf &>/dev/null; then
    PKG_MANAGER="dnf"
    INSTALL_CMD="sudo dnf install -y"
    UPDATE_CMD="sudo dnf check-update || true"
    PYTHON="python3"
    PIP="pip3"
elif command -v pacman &>/dev/null; then
    PKG_MANAGER="pacman"
    INSTALL_CMD="sudo pacman -S --noconfirm"
    UPDATE_CMD="sudo pacman -Sy"
    PYTHON="python"
    PIP="pip"
else
    err "No supported package manager found (apt, dnf, pacman)."
    err "Install dependencies manually."
    exit 1
fi

info "Detected package manager: ${PKG_MANAGER}"
echo ""

# ── System packages ──
info "Updating package lists..."
eval "$UPDATE_CMD"
echo ""

info "Installing system packages..."

case "$PKG_MANAGER" in
    apt)
        $INSTALL_CMD \
            curl wget git jq \
            nmap whois dnsutils netcat-openbsd \
            "$PYTHON" "$PYTHON"-pip "$PYTHON"-venv \
            openssl ca-certificates \
            xclip scrot gnome-screenshot \
            smbclient \
            build-essential
        ;;
    dnf)
        $INSTALL_CMD \
            curl wget git jq \
            nmap whois bind-utils nc \
            "$PYTHON" "$PIP" \
            openssl ca-certificates \
            xclip scrot gnome-screenshot \
            smbclient \
            make automake gcc gcc-c++ kernel-devel
        ;;
    pacman)
        $INSTALL_CMD \
            curl wget git jq \
            nmap whois bind-tools gnu-netcat \
            "$PYTHON" python-pip \
            openssl ca-certificates \
            xclip scrot gnome-screenshot \
            smbclient \
            base-devel
        ;;
esac

ok "System packages installed."
echo ""

# ── Python packages ──
info "Installing Python dependencies..."
$PIP install --user --upgrade pip

# Python packages needed by RedHawk scripts
$PIP install --user \
    requests \
    beautifulsoup4 \
    dnspython \
    python-whois \
    colorama \
    tqdm \
    aiohttp \
    asyncio 2>/dev/null || true

ok "Python dependencies installed."
echo ""

# ── Node.js (if not present) ──
if ! command -v node &>/dev/null; then
    info "Installing Node.js via NodeSource..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    elif [ "$PKG_MANAGER" = "dnf" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
        sudo dnf install -y nodejs
    elif [ "$PKG_MANAGER" = "pacman" ]; then
        sudo pacman -S --noconfirm nodejs npm
    fi
    ok "Node.js installed."
else
    ok "Node.js already present: $(node --version)"
fi
echo ""

# ── Metasploit (Rapid7) ──
if ! command -v msfconsole &>/dev/null; then
    warn "Metasploit not found. Installing..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > /tmp/msfinstall
        chmod +x /tmp/msfinstall
        sudo /tmp/msfinstall
        rm /tmp/msfinstall
    elif [ "$PKG_MANAGER" = "dnf" ]; then
        curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > /tmp/msfinstall
        chmod +x /tmp/msfinstall
        sudo /tmp/msfinstall
        rm /tmp/msfinstall
    elif [ "$PKG_MANAGER" = "pacman" ]; then
        # AUR helper needed; suggest manual install
        warn "On Arch, install metasploit from AUR: yay -S metasploit"
        warn "Or use the Rapid7 installer:"
        warn "  curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb | bash"
    fi
    ok "Metasploit installed."
else
    ok "Metasploit already present: $(msfconsole --version 2>/dev/null | head -1)"
fi
echo ""

# ── Evilginx2 (if not present) ──
if ! command -v evilginx2 &>/dev/null; then
    warn "Evilginx2 not found. Installing via Go..."
    if ! command -v go &>/dev/null; then
        info "Installing Go..."
        case "$PKG_MANAGER" in
            apt) $INSTALL_CMD golang-go ;;
            dnf) $INSTALL_CMD golang ;;
            pacman) $INSTALL_CMD go ;;
        esac
    fi
    go install github.com/kgretzky/evilginx2@latest
    ok "Evilginx2 installed. Ensure ~/go/bin is in your PATH."
else
    ok "Evilginx2 already present: $(evilginx2 --version 2>/dev/null | head -1)"
fi
echo ""

# ── Electron App ──
info "Installing npm dependencies for RedHawk..."
npm install

info "Building RedHawk..."
npm run build

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  RedHawk Linux setup complete!       ║${NC}"
echo -e "${GREEN}║  Run: npm start                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
