# RedHawk 🦅

**Offensive red teaming suite for Windows.** Recon, dorking, exploit, phish, C2, exfil — all in one Electron app. No terminal crawling required.

> ⚠️ **Beta.** Stuff breaks. Only use on systems you own or have written permission to test.

---

## Install

```powershell
git clone https://github.com/srivanththeattack/redhawk.git
cd redhawk
npm install
npm run package
```

That spits out an installer at `release\RedHawk Setup 0.1.1.exe` — run it, and you're done.

Or just grab the portable exe from `release\win-unpacked\RedHawk.exe` and pin it to your taskbar.

### What else you'll need

- **Node.js 18+** — grab it from [nodejs.org](https://nodejs.org/)
- **Nmap** — the app can auto-install it (hit "Install Deps" in the header), or get it from [nmap.org](https://nmap.org/)
- **Embedded Python** — auto-downloaded by the app on first launch
- **msfrpcd** (if you want the Exploit tab) — runs in WSL: `msfrpcd -P redhawk -S -f -j`

---

## What's inside

| Tab | What it does |
|---|---|
| **Recon** | WHOIS, DNS, subdomains, email OSINT, Nmap port scan |
| **Exploit** | Metasploit RPC — search exploits, generate payloads, manage sessions |
| **Phish** | Evilginx2 campaign management |
| **C2** | Built-in HTTP command & control server + agent payloads |
| **Exfil** | File collection, screenshot, browser data, AES encrypted packaging |

---

## Dev

```powershell
npm run dev          # Vite hot-reload
npx electron . --dev # Electron pointing at Vite
npm run build        # Compile everything
npm run package      # Build + create installer
```

---

## Tech

React 18, TypeScript, Tailwind, Zustand, Electron 31, embedded Python 3.12, Nmap 7.95.

---

## License

GPLv3.
