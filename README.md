# RedHawk 🦅

**Offensive security reconnaissance suite** — Point it at a target, get actionable intel, decide your next move.

Built with Electron + React + Python. No CLI required.

> ⚠️ **For authorized security testing only.** You must have explicit written permission before testing any system.

---

## Quick Start (Windows)

### Prerequisites
- **Windows 10/11** (64-bit)
- **Node.js 18+** — [Download here](https://nodejs.org/) (LTS version)
- That's it. Everything else is handled automatically.

### One-Click Install

```powershell
git clone https://github.com/YOUR_USERNAME/RedHawk.git
cd RedHawk
```

Then **double-click** `RedHawk.bat` — it will:
1. Install npm dependencies
2. Download embedded Python 3.12 + required packages
3. Check for Nmap (prompts to install if missing)
4. Build and launch the app

Or use the desktop shortcut (created automatically after first run):

```
RedHawk.lnk  ← on your desktop
```

### Manual Install

```powershell
# Install all dependencies (nmap, python, pip packages)
npm run setup

# Create desktop shortcut
npm run shortcut

# Build and launch
npm start
```

---

## What It Does

### Phase 1 — Reconnaissance

| Module | What it finds |
|---|---|
| **WHOIS** | Registrar, creation/expiry dates, org name, name servers, contact emails |
| **DNS Enumeration** | A, AAAA, MX, NS, TXT, CNAME, SOA records + common subdomains |
| **Subdomain Discovery** | 2500+ subdomain wordlist bruteforce via DNS resolution |
| **Email OSINT** | Common email patterns (admin@, info@, support@, etc.) |
| **Port Scanning** | Nmap integration — top 1000 ports, version detection, OS fingerprinting |

### Coming in Phase 2+
- Vulnerability scanning (nmap scripts + searchsploit)
- Metasploit RPC integration
- Evilginx2 phishing framework bridge
- Full kill chain tracker
- Report export (PDF/HTML)

---

## Project Structure

```
RedHawk/
├── electron/          # Electron main process + backend services
│   ├── main.ts        # App entry, window, IPC handlers
│   ├── preload.ts     # Secure bridge (renderer ↔ main)
│   └── services/      # Tool runner, nmap parser, Python runner, etc.
├── src/               # React frontend
│   ├── components/    # UI components (cards, forms, prompts)
│   ├── hooks/         # React hooks (useScan)
│   ├── store/         # Zustand state management
│   └── types/         # TypeScript definitions
├── python/            # Embedded Python runtime + OSINT scripts
│   ├── scripts/       # whois_lookup.py, dns_enum.py, etc.
│   └── requirements.txt
├── scripts/           # PowerShell installer scripts
├── resources/         # Icons, disclaimers
├── RedHawk.bat        # One-click launcher
└── package.json
```

---

## For Developers

```powershell
# Dev mode (hot-reload frontend)
npm run dev

# Type-check
npm run typecheck

# Build only
npm run build

# Package for distribution (creates installer .exe)
npm run package
```

The dev workflow:
1. Run `npm run dev` — starts Vite dev server on `localhost:5173`
2. In another terminal: `npx tsc -p tsconfig.node.json && npx electron .` — launches Electron pointing at the dev server
3. Edit React code → instant hot reload

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand |
| Backend | Electron 31, Node.js child_process |
| Scripting | Embedded Python 3.12 + pip packages |
| Scanning | Nmap 7.95 (via subprocess) |
| Data | lowdb (local JSON storage) |
| Installer | NSIS (via electron-builder) |

---

## License

GPLv3 — Free and open source.

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```
