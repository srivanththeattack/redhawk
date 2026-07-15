<div align="center">
  <br/>
  <img src="resources/icon.png" alt="RedHawk" width="80" height="80"/>
  <h1 align="center">RedHawk 🦅</h1>
  <p align="center"><b>Offensive red teaming suite for Windows</b></p>
  <p align="center">
    Recon · Exploit · Phish · Payload · Evade · Privesc · C2 · Exfil · Ops · Team
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
RedHawk Setup 0.1.6.exe → run it → done
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
| **Nmap** | Auto-installed via NSIS installer or "Install Deps" button |
| **Python 3.12** | Embedded — downloaded on first launch |
| **Node.js** | Auto-installed via NSIS installer or "Install Deps" |
| **Metasploit** (Exploit tab) | Needs `msfrpcd` running in WSL: `msfrpc -P redhawk -S -f -j` |
| **Evilginx2** (Phish tab) | Install in WSL or via NSIS installer |
| **WSL** | Auto-installed by NSIS installer if missing |

---

## Quick Start

1. **Launch RedHawk** — the Recon tab opens with a pre-filled target (`example.com`)
2. **Hit "Launch Scan"** — runs WHOIS, DNS, subdomains, email OSINT, and a Nmap port scan automatically
3. **Browse results** — each scan section is collapsible, results are saved to history
4. **Switch tabs** — Exploit (Metasploit), Phish (evilginx2 campaigns), Payload (shells + obfuscation), Evade (AMSI bypass + injection), Privesc (escalation), C2 (command server + malleable profiles), Exfil (data collection), Ops (operation tracking), or Team (shared collaboration hub)

> Press **Ctrl+Enter** from the target input to launch a scan without touching the mouse.

---

## What's inside

## Modules

| Module | Highlights |
|---------|------------|
| 🛰 **Recon** | WHOIS, DNS, Subdomains, Email OSINT, HTTP Headers, GeoIP, Reverse DNS, Nmap integration, Port & Service Discovery |
| 💥 **Exploit** | Metasploit RPC integration, exploit search, payload generation, session management |
| 🎣 **Phish** | Evilginx2 integration, campaign management, phishlet support, credential capture |
| 💀 **Payload** | Reverse shell generation, shellcode generation, payload import, multiple obfuscation methods |
| 🥷 **Evade** | AMSI bypass techniques, ETW patching, Defender checks, process injection utilities |
| 🔓 **Privesc** | System enumeration, privilege checks, registry analysis, PowerUp integration, exploit suggestions |
| 📡 **C2** | HTTP/HTTPS command server, beacon configuration, malleable profiles, task console, multiple agent types |
| 📦 **Exfil** | File collection, browser data collection, screenshot capture, encrypted packaging |
| 📋 **Ops** | Findings management, notes, screenshots, timelines, operation tracking |
| 👥 **Team** | Shared notes, collaboration, live activity feed, target coordination |

### Extra features

- **Team collaboration** — built-in shared hub with live activity feed, findings, notes, and target coordination. No separate server setup — it's part of the C2
- **Malleable C2 profiles** — customize beacon URIs, response headers, user-agent, and sleep patterns. 4 built-in profiles (default, cs-like, minimal, onedrive) plus JSON editor for custom profiles
- **Split panes** — work on Recon and C2 side-by-side. Drag dividers to resize. Toggle on/off in Settings
- **Hamburger menu** — single ☰ button replaces separate Updates, Help, Settings, and History buttons
- **Settings panel** — full-screen Apple-style settings with 4 sections (General, Tab Order, Appearance, Operations)
- **Tab reordering** — drag-and-drop tabs to reorder the navigation bar. Ctrl+Tab / Ctrl+Shift+Tab to cycle
- **Toggleable preferences** — Compact Mode, Status Bar, Auto-Save, Split Panes — all in Settings > General
- **30 themes** — Dark, Light, Dracula, Nord, Monokai, Catppuccin, Tokyo Night, SynthWave, Cyberpunk, and more
- **Cyber Kill Chain** — visual progress bar tracks which phase you're actively working on
- **Operations** — group targets, scans, and activity into named operations. Export full op reports
- **History sidebar** — per-tab scan history and activity log with clear button
- **Help & Updates** — built-in searchable help and GitHub release checker in the hamburger menu
- **Scan modes** — Quick, Full, Stealth (`-sS -T2 -f`), and Hyper (`-T5 -A`) scans
- **10 agent types** — Python, PowerShell (with AMSI-bypassed variant), Batch, Bash, SH, C#, VBA, Nim, Rust

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

> [!NOTE]
> ## Development Status
>
> **RedHawk is currently in active beta.**
>
> This project was developed iteratively with significant AI assistance throughout the design, implementation, testing, and documentation process. AI was used as a development aid to accelerate prototyping and refinement, while all architecture, feature selection, integration decisions, and final code review were directed by the project's author.
>
> As RedHawk is still in beta, you may encounter bugs, incomplete features, performance issues, or breaking changes between releases. Feedback, bug reports, and feature suggestions are greatly appreciated and help improve the project.

---

## License

[GPLv3](LICENSE) — free to use, modify, and distribute. If you improve it, share it back.
