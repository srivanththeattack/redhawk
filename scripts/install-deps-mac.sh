#!/bin/bash
# ──────────────────────────────────────────────
# RedHawk — macOS Dependency Installer
# ──────────────────────────────────────────────
# Installs all required tools on macOS via
# Homebrew and pip3.
# ──────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[*]${NC} $1"; }
ok()    { echo -e "${GREEN}[+]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[-]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       RedHawk macOS Setup            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Homebrew ──
if ! command -v brew &>/dev/null; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ok "Homebrew installed."
else
    ok "Homebrew already present: $(brew --version | head -1)"
fi
echo ""

# ── System packages ──
info "Installing system packages..."
brew install \
    curl wget git jq \
    nmap whois bind \
    python3 \
    openssl \
    gnupg \
    smbclient

ok "System packages installed."
echo ""

# ── Python packages ──
info "Installing Python dependencies..."
pip3 install --user --upgrade pip
pip3 install --user \
    requests \
    beautifulsoup4 \
    dnspython \
    python-whois \
    colorama \
    tqdm \
    aiohttp

ok "Python dependencies installed."
echo ""

# ── Metasploit ──
if ! command -v msfconsole &>/dev/null; then
    warn "Metasploit not found. Installing via Homebrew..."
    brew install metasploit
    ok "Metasploit installed."
else
    ok "Metasploit already present: $(msfconsole --version 2>/dev/null | head -1)"
fi
echo ""

# ── Evilginx2 ──
if ! command -v evilginx2 &>/dev/null; then
    warn "Evilginx2 not found. Installing via Go..."
    if ! command -v go &>/dev/null; then
        info "Installing Go..."
        brew install go
    fi
    go install github.com/kgretzky/evilginx2@latest
    ok "Evilginx2 installed. Ensure ~/go/bin is in your PATH."
else
    ok "Evilginx2 already present."
fi
echo ""

# ── Node.js ──
if ! command -v node &>/dev/null; then
    info "Installing Node.js..."
    brew install node
    ok "Node.js installed."
else
    ok "Node.js already present: $(node --version)"
fi
echo ""

# ── Electron App ──
info "Installing npm dependencies..."
npm install

info "Building RedHawk..."
npm run build

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  RedHawk macOS setup complete!       ║${NC}"
echo -e "${GREEN}║  Run: npm start                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
