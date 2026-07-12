"""
RedHawk — DNS Enumeration Script
Returns JSON with A, AAAA, MX, NS, TXT, CNAME, SOA records.
Usage: python dns_enum.py <domain>
"""

import sys
import json
import re


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No domain provided. Usage: dns_enum.py <domain>"}))
        sys.exit(1)

    domain = sys.argv[1].strip().lower()
    domain = re.sub(r'^https?://', '', domain)
    domain = domain.split('/')[0]
    domain = domain.split('?')[0]

    try:
        import dns.resolver
        import dns.exception
    except ImportError:
        print(json.dumps({"error": "dnspython module not installed. Run: pip install dnspython"}))
        sys.exit(1)

    resolver = dns.resolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 10

    records = []
    record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA']

    for rtype in record_types:
        try:
            answers = resolver.resolve(domain, rtype)
            for rdata in answers:
                value = str(rdata)
                # Clean up TXT record formatting
                if rtype == 'TXT':
                    value = value.strip('"')
                records.append({
                    "type": rtype,
                    "name": domain,
                    "value": value,
                    "ttl": str(answers.response.answer[0].ttl) if answers.response.answer else None,
                })
        except dns.resolver.NoAnswer:
            continue
        except dns.resolver.NXDOMAIN:
            continue
        except dns.exception.Timeout:
            continue
        except Exception:
            continue

    # Also try common subdomains quickly
    common = ['www', 'mail', 'ftp', 'admin', 'blog', 'api', 'dev', 'test']
    for sub in common:
        fqdn = f"{sub}.{domain}"
        try:
            answers = resolver.resolve(fqdn, 'A')
            for rdata in answers:
                records.append({
                    "type": "A",
                    "name": fqdn,
                    "value": str(rdata),
                    "ttl": str(answers.response.answer[0].ttl) if answers.response.answer else None,
                })
        except Exception:
            continue

    result = {
        "domain": domain,
        "records": records,
        "recordCount": len(records),
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
