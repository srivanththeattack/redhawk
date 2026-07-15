#!/usr/bin/env python3
"""Maigret username OSINT wrapper for RedHawk.
Searches for a username across hundreds of social networks and websites.

Usage: python maigret_lookup.py <username>
Output: JSON with found sites and metadata
"""

import sys
import json
import subprocess
import os


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No username provided", "username": ""}))
        sys.exit(1)

    username = sys.argv[1].strip()
    if not username:
        print(json.dumps({"error": "Empty username", "username": ""}))
        sys.exit(1)

    # First check if maigret is installed
    try:
        check = subprocess.run(
            ["maigret", "--help"],
            capture_output=True, text=True, timeout=10
        )
        if check.returncode != 0:
            print(json.dumps({
                "error": "Maigret CLI not responding",
                "username": username,
                "detail": check.stderr[:500] if check.stderr else "Unknown error"
            }))
            sys.exit(1)
    except FileNotFoundError:
        print(json.dumps({
            "error": "Maigret is not installed. Run: pip install maigret",
            "username": username
        }))
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print(json.dumps({
            "error": "Maigret check timed out",
            "username": username
        }))
        sys.exit(1)

    try:
        # Run maigret with JSON output to stdout
        result = subprocess.run(
            ["maigret", username, "--all", "--json", "-"],
            capture_output=True, text=True, timeout=120  # 2 min timeout for thorough search
        )

        if result.returncode != 0 and result.returncode != 1:
            # maigret returns 1 when some sites are unreachable, which is fine
            print(json.dumps({
                "error": f"Maigret exited with code {result.returncode}",
                "username": username,
                "stderr": result.stderr[:500] if result.stderr else ""
            }))
            sys.exit(1)

        # Parse JSON output
        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError:
            # Try to extract JSON from output (maigret may print banners)
            lines = result.stdout.strip().split('\n')
            for i, line in enumerate(lines):
                if line.strip().startswith('{'):
                    try:
                        output = json.loads('\n'.join(lines[i:]))
                        break
                    except json.JSONDecodeError:
                        continue
            else:
                print(json.dumps({
                    "error": "Failed to parse maigret output",
                    "username": username,
                    "raw": result.stdout[:1000]
                }))
                sys.exit(1)

        # Process and simplify the output
        sites_found = {}
        total_checked = 0

        for site_name, site_data in output.items():
            if not isinstance(site_data, dict):
                continue
            total_checked += 1
            status = site_data.get("status", {})
            if isinstance(status, dict) and status.get("found"):
                sites_found[site_name] = {
                    "url": status.get("url", ""),
                    "username": status.get("username", username),
                    "status": status.get("status", "claimed")
                }

        print(json.dumps({
            "username": username,
            "total_sites_checked": total_checked,
            "sites_found_count": len(sites_found),
            "sites": sites_found
        }))

    except subprocess.TimeoutExpired:
        print(json.dumps({
            "error": "Maigret timed out after 120 seconds",
            "username": username
        }))
        sys.exit(1)
    except FileNotFoundError:
        print(json.dumps({
            "error": "Maigret not installed. Run: pip install maigret",
            "username": username
        }))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "username": username
        }))


if __name__ == "__main__":
    main()
