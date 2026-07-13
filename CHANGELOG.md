# Changelog

All notable changes to RedHawk are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.3] — 2026-07-13

### Added

#### First-Run Quick Start Guide
- New users see a dismissable welcome guide in the Recon tab with 3 steps: enter a target, hit Launch Scan, explore tabs
- Target is pre-filled with `example.com` on first launch so users can immediately scan
- Guide auto-dismisses after the first scan, with a "Got it" button
- First-run state persisted in localStorage (`redhawk_first_run`)

#### Proper README
- Complete rewrite with badges, feature table, install instructions, quick start guide, and legal disclaimer
- Covers all 5 tabs, split panes, kill chain, operations, themes, and scan modes

### Fixed

#### Evilginx2 Check No Longer Freezes the UI
- Replaced `execSync` with async `exec` in `evilginxManager.checkAvailability()`
- Previously, the synchronous `execSync('wsl which evilginx2', { timeout: 5000 })` blocked Electron's main process for up to 5 seconds, making the entire app unresponsive during the availability check
- Tab switching and all other UI interactions now work while the check runs in the background

#### Kill Chain — Removed "Dorking" Phase
- Removed the `dorking` entry from the kill chain — the chain now shows: Reconnaissance → Exploitation → Phishing → C2 → Exfiltration
- Updated `KillChainPhaseId` type, default state, and kill chain bar UI

### Changed
- Added `author` field to `package.json` (fixes electron-builder warning)

---

## [0.1.1] — 2026-07-12

### Added

#### Operations System
- **Operations** as a project grouping layer — targets, scans, and activity are all associated with an active operation
- Full CRUD: create, switch, archive, and delete operations
- Auto-association: scanning a target automatically links it to the current operation
- **Comprehensive Operation Report**: one-click HTML export covering all targets, scan results, and activity across the whole op
- Operations persisted to `redhawk-operations.json` in the user data directory

#### Multi-Windowing (Split Panes)
- Side-by-side pane splitting — hover a tab and click `>` to open it in a second pane
- Draggable dividers with resize handles between panes
- Tab cycle button (`↻`) rotates tabs in-place within a pane
- Collapse button returns to single-pane view
- Layout state persisted to `localStorage` (key: `redhawk_split_layout`)
- `ReconContent` extracted as its own component so each pane gets independent scroll state and section tracking

#### Theme System
- 5 themes: Dark, Light, Dracula, Nord, Monokai
- Theme picker in the header with color swatches
- Themes applied at runtime via CSS variables — no rebuild required
- Theme preference persisted in `localStorage`

#### Kill Chain
- Kill chain bar now tracks real phase status across all tabs
- Phases: Reconnaissance → Dorking → Exploitation → Phishing → C2 → Exfiltration
- `recon` phase auto-completes on scan finish; active tab's phase marked as `active`
- Progress bar updates dynamically as phases complete
- State managed through Zustand store (`KillChainState`) exposed via `useScan` hook

#### Stealth & Hyper Scan Modes
- **Stealth Scan** (`-sS -T2 -f`): slower, less detectable port scan
- **Hyper Scan** (`-T5 -A`): aggressive full OS detection + traceroute + service versioning
- Dedicated buttons alongside the existing Quick and Full scans

#### Cross-Tab Activity Logging
- Centralized activity log in `TargetStore.activityLog` with `addActivity`, `getActivity`, `clearActivity` APIs
- C2 Panel logs agent check-ins, command sends, and session events
- Phishing Panel logs campaign starts, target additions, credential captures
- MSF Panel logs exploit searches, payload generations, and session management
- Exfil Panel log file collections, screenshot captures, and package exports
- Activity entries display in the sidebar history panel per tab

#### Help Banner
- Searchable documentation component (`HelpBanner`) accessible from the header
- Per-tab explanations, parameter descriptions, and troubleshooting sections
- Inline search filters topics as you type

#### History Sidebar
- Tab-aware history panel in the sidebar
- Recon tab shows scan history; C2/Phish/MSF/Exfil tabs show activity log entries
- **Clear button** with confirmation dialog to wipe history for the active tab
- Backend IPC handlers (`clear-scan-history`, `clearActivity`) fully wired

#### Disclaimer Persistence
- Disclaimer acceptance stored in `localStorage` under key `redhawk_disclaimer_accepted`
- Once accepted, the disclaimer dialog is skipped on subsequent launches

#### ReportExporter
- Rewritten to cover all 11 scan types: SSL, WAF, Technology, Directory Bruteforce, Service Scan, Vulnerability Scan, HTTP Headers — plus the original WHOIS, DNS, Subdomain, Email OSINT
- Only renders sections that were actually run (no "Not scanned" placeholders)
- Supports operation-wide reports via the "Save Operation Report" button

### Changed
- **Menu bar removed**: `Menu.setApplicationMenu(null)` — no more File/Edit/View/Window/Help clutter
- **Footer cleaned**: "Ctrl+Enter to scan" text removed from the status bar
- `.gitignore` now tracks `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json` (previously blocked by the `*.json` rule)

---

## [0.1.0] — 2026-07-12

### Added

#### Recon Tab
- WHOIS lookup via embedded Python script
- DNS enumeration (A, AAAA, MX, NS, TXT, CNAME, SOA records)
- Subdomain enumeration with wordlist-based brute forcing
- Email OSINT (email format discovery, breach checks)
- **Nmap integration** with auto-install and path detection
  - Quick Scan (`-T4 -F`)
  - Full Scan (`-sS -sV -sC -O -T4`)
  - Service Scan (`-sV`)
  - Vulnerability Scan (`--script vuln`)
  - SSL/TLS analysis (`--script ssl-enum-ciphers`)
  - WAF detection (`--script http-waf-detect`)
  - Technology detection (`--script http-technologies-detect`)
  - Directory brute force (`--script http-enum`)
  - HTTP headers fetch (`--script http-headers`)
- Collapsible per-section results display
- JSON result export

#### Exploit Tab
- Metasploit RPC integration via `msfrpc`
  - Connect/disconnect with host, port, and password
  - Module search and info display
  - Payload generation (Windows reverse TCP, Linux reverse TCP, macOS reverse TCP)
  - Session management — list, interact, background, kill
- Console output display with clear functionality

#### Phish Tab
- Evilginx2 integration for phishing campaign management
  - Start/stop phishlet server
  - Load phishlets from the phishlet directory
  - Set lure and redirect URLs
  - View captured credentials in real-time
- Phishlet directory browser with `.yaml` file loading

#### C2 Tab
- Built-in HTTP command & control server (embedded in the app)
  - Start/stop server on configurable host:port
  - Agent generation — PowerShell, Python, VBScript payloads
  - Task system — send commands to agents, view output
  - Real-time agent check-in monitoring
- Agent payloads with AES-256 encrypted C2 communication
- Task queuing and result retrieval

#### Exfil Tab
- File collection from target (recursive directory walk)
- Screenshot capture
- Browser data extraction (Chrome saved passwords, cookies, history via Python)
- AES-256 encrypted payload packaging
- Output to configurable directory with auto-cleanup

#### General
- Disclaimer dialog on first launch
- Target input with Enter-to-scan flow
- Results panel with tabbed output (console, Nmap, raw)
- Scan progress tracking with cancel support
- Dependency management panel (auto-install Nmap, Python, Evilginx2, Metasploit)
- Updates checker with GitHub releases integration
- Zustand-based state management with TypeScript throughout
- Installer built with electron-builder (NSIS)
- Desktop shortcut creator script

### Technical
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Electron 31 main process with IPC bridge
- **Python**: Embedded Python 3.12 runtime for scripting tasks
- **Database**: JSON file-based persistence per scan
- **Packaging**: electron-builder with NSIS installer
- **Scripts**: PowerShell automation for dependency installation

---

[0.1.3]: https://github.com/srivanththeattack/redhawk/releases/tag/v0.1.3
[0.1.2]: https://github.com/srivanththeattack/redhawk/releases/tag/v0.1.2
[0.1.1]: https://github.com/srivanththeattack/redhawk/releases/tag/v0.1.1
[0.1.0]: https://github.com/srivanththeattack/redhawk/releases/tag/v0.1.0
