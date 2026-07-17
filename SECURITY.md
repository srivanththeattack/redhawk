# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅                 |
| < 0.1   | ❌                 |

## Reporting a Vulnerability

RedHawk is an offensive security tool, but that doesn't mean the project itself should have security issues. If you find a vulnerability in RedHawk's code, build process, or infrastructure:

**Do not open a public GitHub issue.** Instead, send details to:

**srivanththeattack@protonmail.com**

### What to include

- Type of vulnerability (XSS, RCE, privilege escalation, etc.)
- Full steps to reproduce
- Affected version(s) and platform(s)
- Proof of concept or exploit code (if applicable)
- Your contact info (optional, for follow-up)

### What to expect

- **Acknowledgment** within 48 hours
- **Status update** within 5 business days
- **Fix timeline** communicated once triage is complete

We'll credit you in the release notes and CHANGELOG unless you prefer to remain anonymous.

## Responsible Disclosure

We ask that you give us reasonable time to fix and release a patch before publishing details. We'll do the same — we'll coordinate with you on disclosure timing.

## Scope

This policy covers:
- The RedHawk source code in this repository
- The build and release pipeline (GitHub Actions, electron-builder config)
- Dependencies (run `npm audit` for known vulnerabilities)

Out of scope:
- Third-party tools RedHawk interfaces with (Metasploit, Evilginx2, Nmap, etc.)
- Misuse of RedHawk's features for illegal activity (that's on the user)

## Responsible Use

RedHawk is designed for authorized red team engagements and security research only. Using RedHawk against systems without explicit permission is illegal. The project maintainers assume no liability for misuse.
