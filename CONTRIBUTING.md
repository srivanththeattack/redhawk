# Contributing to RedHawk

First off, thanks for taking the time to contribute! RedHawk is a full-stack Electron + React + Tailwind red teaming suite, and every contribution helps.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

- Check the [issues](https://github.com/srivanththeattack/redhawk/issues) to see if it's already been reported
- Use the bug report template when creating a new issue
- Include as much detail as possible: OS, build version, steps to reproduce

### Suggesting Features

- Check existing issues and discussions for similar ideas
- Use the feature request template
- Explain the *why* — what problem does this solve for red team workflows?

### Pull Requests

1. Fork the repo and create your branch from `master`
2. If you've added code, add tests if applicable
3. Ensure the build still passes (`npm run build`)
4. Make sure your code lints
5. Issue the pull request using the PR template

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- For Windows: PowerShell 7+, WSL2 (optional, for WSL terminal features)
- For macOS: Homebrew
- For Linux: apt/dnf/pacman (varies by distro)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/yourusername/redhawk.git
cd redhawk

# Install dependencies
npm install

# Run in dev mode (frontend hot-reload)
npm run dev

# Or run full Electron with Vite backend
npx electron . --dev

# Build for production
npm run build

# Package for your platform
npm run package
```

### Platform-Specific Setup

Platform-specific install scripts are in the `scripts/` directory:

- Windows: `scripts/install-deps.ps1` (run as admin)
- macOS: `scripts/install-deps-mac.sh`
- Linux: `scripts/install-deps-linux.sh`

## Architecture Overview

```
src/                     # React frontend (Vite + Tailwind)
  components/            # UI components (10 tabs, panels, etc.)
  hooks/                 # React hooks (useScan, useSplitPanes)
  store/                 # Zustand state management
  types/                 # TypeScript interfaces & API types
  theme/                 # 27 built-in themes

electron/                # Electron main process
  main.ts                # IPC handlers, 16 services
  preload.ts             # ~85 window.api bindings
  services/
    platform.ts          # Cross-platform abstraction layer (single source of truth)
    paths.ts             # Path resolver (dev vs packaged)
    tool-runner.ts       # Nmap execution (cross-platform)
    terminal-manager.ts  # node-pty terminal
    c2-server.ts         # HTTP/HTTPS C2 server
    ...                  # Other services

scripts/                 # Platform-specific installers
```

### Cross-Platform Notes

RedHawk maintains three codebase copies (Windows, macOS, Linux) with a shared frontend.
All OS-specific logic lives in `electron/services/platform.ts`. When adding platform-specific
features, add to `platform.ts` rather than hardcoding OS checks.

**Key platforms differences handled in `platform.ts`:**
- Python command (`python` vs `python3`)
- Shell paths (`cmd.exe` vs `/bin/bash`)
- Package managers (`winget`/`choco` vs `brew` vs `apt`/`dnf`/`pacman`/`zypper`)
- Screenshot commands, browser paths, tool search paths

### Packaging

```bash
npm run package    # Builds platform-specific installer in release/
```

Expected outputs:
- **Windows**: `release\RedHawk Setup <ver>.exe` + portable `RedHawk <ver>.exe`
- **macOS**: `release/RedHawk-<ver>.dmg` + `RedHawk-<ver>.zip`
- **Linux**: `release/RedHawk-<ver>.AppImage` + `.deb` + `.rpm`

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript/TypeScript

- 2 spaces for indentation
- Semicolons required
- Use TypeScript types — avoid `any` where possible
- Prefer `const` over `let` over `var`
- Use async/await over raw promises where reasonable

### React Components

- Functional components with hooks (no class components)
- Props typed with TypeScript interfaces
- Tailwind classes for styling (no CSS modules unless necessary)

## Additional Notes

### Issue and Pull Request Labels

- `bug` — confirmed bug
- `enhancement` — new feature
- `help-wanted` — open for contribution
- `platform:windows` / `platform:mac` / `platform:linux` — platform-specific
- `good-first-issue` — good for newcomers

### Security

If you find a security vulnerability, **do not open a public issue**. Email srivanththeattack@protonmail.com instead.

---

Thanks again for contributing! 🚀
