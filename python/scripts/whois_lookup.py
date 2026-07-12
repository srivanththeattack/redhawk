"""
RedHawk — WHOIS Lookup Script
Returns JSON with domain registration details.
Usage: python whois_lookup.py <domain>
"""

import sys
import json
import re

def clean_whois_data(raw_text: str) -> dict:
    """Parse raw WHOIS text into structured data."""
    result = {
        "domain": "",
        "registrar": "",
        "creationDate": "",
        "expirationDate": "",
        "nameServers": [],
        "orgName": "",
        "country": "",
        "emails": [],
    }

    if not raw_text:
        return result

    lines = raw_text.split('\n')

    for line in lines:
        line_lower = line.lower().strip()

        # Domain name
        if re.match(r'^\s*domain\s*name:\s*', line_lower, re.IGNORECASE):
            result["domain"] = line.split(':')[-1].strip()

        # Registrar
        elif re.match(r'^\s*registrar\s*:', line_lower, re.IGNORECASE):
            result["registrar"] = line.split(':')[-1].strip()

        # Creation date
        elif re.match(r'^\s*(creation|created)\s*date:\s*', line_lower, re.IGNORECASE):
            result["creationDate"] = line.split(':')[-1].strip()

        # Expiration date
        elif re.match(r'^\s*(registry|expir|expiration)\s*date:\s*', line_lower, re.IGNORECASE):
            result["expirationDate"] = line.split(':')[-1].strip()

        # Name servers
        elif re.match(r'^\s*name\s*server:\s*', line_lower, re.IGNORECASE):
            ns = line.split(':')[-1].strip()
            if ns and ns not in result["nameServers"]:
                result["nameServers"].append(ns)

        # Organization
        elif re.match(r'^\s*org\s*name:\s*', line_lower, re.IGNORECASE):
            result["orgName"] = line.split(':')[-1].strip()

        # Country
        elif re.match(r'^\s*country:\s*', line_lower, re.IGNORECASE):
            result["country"] = line.split(':')[-1].strip()

        # Email
        elif re.match(r'^\s*e?\s*mail:\s*', line_lower, re.IGNORECASE):
            email = line.split(':')[-1].strip()
            if '@' in email:
                result["emails"].append(email)

    return result


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No domain provided. Usage: whois_lookup.py <domain>"}))
        sys.exit(1)

    domain = sys.argv[1].strip().lower()

    # Remove protocol and path if present
    domain = re.sub(r'^https?://', '', domain)
    domain = domain.split('/')[0]
    domain = domain.split('?')[0]

    try:
        import whois
    except ImportError:
        print(json.dumps({"error": "python-whois module not installed. Run: pip install python-whois"}))
        sys.exit(1)

    try:
        w = whois.whois(domain)

        result = {
            "domain": str(w.domain_name) if w.domain_name else domain,
            "registrar": str(w.registrar) if w.registrar else None,
            "creationDate": str(w.creation_date) if w.creation_date else None,
            "expirationDate": str(w.expiration_date) if w.expiration_date else None,
            "nameServers": [str(ns) for ns in (w.name_servers or [])],
            "orgName": str(w.org) if w.org else None,
            "country": str(w.country) if w.country else None,
            "emails": [str(e) for e in (w.emails or [])],
        }

        # Clean up array formatting
        for key in ["domain", "registrar", "creationDate", "expirationDate", "orgName", "country"]:
            if result[key]:
                result[key] = result[key].replace('[', '').replace(']', '').replace("'", '').strip()

        print(json.dumps(result, indent=2))

    except Exception as e:
        # Fallback to raw whois parsing
        try:
            import subprocess
            raw = subprocess.check_output(['whois', domain], stderr=subprocess.STDOUT, timeout=15)
            raw_text = raw.decode('utf-8', errors='ignore')
            result = clean_whois_data(raw_text)
            if result["domain"]:
                print(json.dumps(result, indent=2))
            else:
                print(json.dumps({"error": f"WHOIS lookup failed: {str(e)}"}))
        except Exception as e2:
            print(json.dumps({"error": f"WHOIS lookup failed: {str(e2)}"}))


if __name__ == "__main__":
    main()
