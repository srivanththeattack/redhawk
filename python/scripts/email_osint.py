"""
RedHawk — Email OSINT Script
Performs basic email discovery for a domain using common patterns and public sources.
Usage: python email_osint.py <domain>
"""

import sys
import json
import re
import socket
import smtplib

# Common email patterns
EMAIL_PATTERNS = [
    "admin@{domain}",
    "info@{domain}",
    "support@{domain}",
    "sales@{domain}",
    "contact@{domain}",
    "help@{domain}",
    "webmaster@{domain}",
    "postmaster@{domain}",
    "hostmaster@{domain}",
    "abuse@{domain}",
    "noreply@{domain}",
    "newsletter@{domain}",
    "marketing@{domain}",
    "privacy@{domain}",
    "legal@{domain}",
    "billing@{domain}",
    "careers@{domain}",
    "jobs@{domain}",
    "hr@{domain}",
    "recruitment@{domain}",
    "press@{domain}",
    "media@{domain}",
    "social@{domain}",
    "community@{domain}",
    "feedback@{domain}",
    "survey@{domain}",
    "test@{domain}",
    "dev@{domain}",
    "ops@{domain}",
    "security@{domain}",
]

# Common catch-all username patterns
USERNAME_PATTERNS = [
    "admin", "info", "support", "sales", "contact", "help",
    "webmaster", "postmaster", "hostmaster", "abuse",
    "marketing", "privacy", "legal", "billing",
    "careers", "hr", "press", "media", "feedback",
    "security", "dev", "ops", "test", "hello",
]


def verify_email_smtp(email: str, mx_server: str, timeout: int = 5) -> bool:
    """Try to verify email via SMTP (may not work on all servers)."""
    try:
        server = smtplib.SMTP(mx_server, timeout=timeout)
        server.helo()
        server.mail('')
        code, _ = server.rcpt(email)
        server.quit()
        return code == 250
    except Exception:
        return False


def get_mx_record(domain: str) -> str | None:
    """Get the MX record for a domain."""
    try:
        _, _, ips = socket.gethostbyname_ex(domain)
        return ips[0] if ips else None
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No domain provided. Usage: email_osint.py <domain>"}))
        sys.exit(1)

    domain = sys.argv[1].strip().lower()
    domain = re.sub(r'^https?://', '', domain)
    domain = domain.split('/')[0]
    domain = domain.split('?')[0]

    emails = []

    # Generate common email addresses
    for pattern in EMAIL_PATTERNS:
        email = pattern.replace("{domain}", domain)
        emails.append({
            "email": email,
            "source": "common_pattern",
            "confidence": "low",
        })

    # Look for MX record (for SMTP verification)
    mx = get_mx_record(domain)

    result = {
        "domain": domain,
        "emails": emails,
        "totalEmails": len(emails),
        "mxRecord": mx,
        "note": "Emails generated from common patterns. Use external OSINT tools for more accurate results."
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
