<div align="center">
  <br/>
  <img src="resources/icon.png" alt="RedHawk" width="80" height="80"/>
  <h1 align="center">RedHawk 🦅</h1>
  <p align="center"><b>Offensive red teaming suite for Windows</b></p>
  <p align="center">
    Recon · Exploit · Phish · C2 · Exfil — all in one desktop app.
    <br/>
    No terminal crawling. No piecing together a dozen tools.
  </p>

  <p align="center">
    <a href="https://github.com/srivanththeattack/redhawk/releases">
      <img src="https://img.shields.io/github/v/release/srivanththeattack/redhawk?color=red&label=version" alt="Version"/>
    </a>
    <a href="https://github.com/srivanththeattack/redhawk/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-GPLv3-red" alt="License"/>
    </a>
    <a href="https://github.com/srivanththeattack/redhawk/stargazers">
      <img src="https://img.shields.io/github/stars/srivanththeattack/redhawk?style=social" alt="Stars"/>
    </a>
    <img src="https://img.shields.io/badge/platform-Windows-blue" alt="Platform"/>
  </p>

  <br/>
</div>

---

## Install

**Quickest way** — grab the latest installer from the [Releases page](https://github.com/srivanththeattack/redhawk/releases):

```
RedHawk Setup 0.1.2.exe → run it → done
```

**From source:**

```powershell
git clone https://github.com/srivanththeattack/redhawk.git
cd redhawk
npm install
npm run package
```

That produces `release\RedHawk Setup <version>.exe`. Run the installer.

### Dependencies

RedHawk handles most of these automatically, but here's what's needed under the hood:

| Dependency | How it's handled |
|---|---|
| **Nmap** | Auto-installed via "Install Deps" button in the header |
| **Python 3.12** | Embedded — downloaded on first launch |
| **Metasploit** (Exploit tab) | Needs `msfrpcd` running in WSL: `msfrpc -P redhawk -S -f -j` |
| **Evilginx2** (Phish tab) | Install in WSL: [instructions](https://github.com/kgretzky/evilginx2) |

---

## Quick Start

1. **Launch RedHawk** — the Recon tab opens with a pre-filled target (`example.com`)
2. **Hit "Launch Scan"** — runs WHOIS, DNS, subdomains, email OSINT, and a Nmap port scan automatically
3. **Browse results** — each scan section is collapsible, results are saved to history
4. **Switch tabs** — click Exploit to connect to Metasploit, Phish to set up campaigns, C2 to start a command server, or Exfil to package data

> Press **Ctrl+Enter** from the target input to launch a scan without touching the mouse.

---

## What's inside

| Tab | Icon | What it does |
|---|---|---|
| **Recon** | 🔍 | WHOIS, DNS enumeration, subdomain brute-force, email OSINT, Nmap (port/service/vuln/SSL/WAF/tech/dirbust), HTTP headers |
| **Exploit** | 💀 | Metasploit RPC — search exploits, generate payloads, manage sessions |
| **Phish** | 🎣 | Evilginx2 campaign management — templates, credential capture, deployment guide |
| **C2** | 📡 | Built-in HTTP command & control server with AES-256 encrypted agents (PowerShell, Python, VBScript) |
| **Exfil** | 📤 | File collection, screenshot capture, browser data extraction, AES-256 packaging, FTP/SMB exfiltration |

### Extra features

- **Split panes** — work on Recon and C2 side-by-side. Drag dividers to resize
- **Cyber Kill Chain** — visual progress bar tracks which phase you're actively working on
- **Operations** — group targets, scans, and activity into named operations. Export full op reports
- **5 themes** — Dark, Light, Dracula, Nord, Monokai. Pick from the header
- **History sidebar** — per-tab scan history and activity log with clear button
- **Help & Updates** — built-in searchable help banner and GitHub release checker
- **Scan modes** — Quick, Full, Stealth (`-sS -T2 -f`), and Hyper (`-T5 -A`) scans

---

## Legal

> ⚠️ RedHawk is a red teaming tool designed for **authorized security testing only**.
>
> You must have explicit written permission before using this tool against any system or network.
> Unauthorized access is illegal in most jurisdictions and punishable by law.
>
> The developer assumes no liability and is not responsible for any misuse or damage.

---

## Development

```powershell
npm run dev          # Vite hot-reload for the renderer
npm run build        # Compile renderer + electron
npm run package      # Build + create NSIS installer
npm run typecheck    # TypeScript type checking
```

### Tech stack

React 18 · TypeScript · Tailwind CSS · Zustand · Electron 31 · Vite · Python 3.12 · Nmap

---

## License

[GPLv3](LICENSE) — free to use, modify, and distribute. If you improve it, share it back.
