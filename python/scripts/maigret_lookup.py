#!/usr/bin/env python3
"""Maigret username OSINT wrapper for RedHawk.
Searches for a username across thousands of social networks and websites.

Usage: python maigret_lookup.py <username>
Output: JSON with found sites and metadata
"""

import sys
import json
import os
import tempfile
import glob
import subprocess
import re


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No username provided", "username": ""}))
        return

    username = sys.argv[1].strip()
    if not username:
        print(json.dumps({"error": "Empty username", "username": ""}))
        return

    # Create temp directory for maigret output
    tmpdir = tempfile.mkdtemp(prefix='redhawk_maigret_')

    try:
        # Set env to avoid Windows console encoding issues
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'

        # Build the maigret command
        maigret_args = [
            sys.executable, '-m', 'maigret',
            username,
            '-a',
            '--no-color',
            '--no-progressbar',
            '--dns-resolver', 'threaded',
            '-J', 'simple',
            '--folderoutput', tmpdir,
        ]

        result = subprocess.run(
            maigret_args,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=3600,
            env=env,
        )

        # If maigret exited with non-zero code, report it
        if result.returncode != 0:
            stderr_info = result.stderr.strip() if result.stderr else ''
            stdout_info = result.stdout.strip() if result.stdout else ''
            error_msg = f'Maigret exited with code {result.returncode}'
            if stderr_info:
                # Extract the most useful part of the error
                lines = stderr_info.split('\n')
                useful = [l for l in lines if 'Error' in l or 'error' in l or 'Traceback' in l or 'File' in l]
                if useful:
                    error_msg += ': ' + ' '.join(useful[:3])
            print(json.dumps({
                'error': error_msg,
                'username': username,
                '_stderr': stderr_info[:500],
                '_stdout': stdout_info[:500],
            }, ensure_ascii=False))
            return

        # Find the JSON report file
        json_files = glob.glob(os.path.join(tmpdir, '*simple*.json'))
        if not json_files:
            json_files = glob.glob(os.path.join(tmpdir, '*.json'))
            if not json_files:
                json_files = glob.glob(os.path.join(tmpdir, f'*{username}*.json'))

        raw_data = {}
        if json_files:
            try:
                with open(json_files[0], 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
            except (json.JSONDecodeError, IOError):
                raw_data = {}

        # Parse the JSON report into our simplified format
        sites_found = {}
        total_checked = 0

        if raw_data and isinstance(raw_data, dict):
            for site_name, site_data in raw_data.items():
                if not isinstance(site_data, dict):
                    continue
                total_checked += 1
                status = site_data.get('status')
                if isinstance(status, dict):
                    found = status.get('found', False)
                    if found:
                        sites_found[site_name] = {
                            'url': status.get('url', ''),
                            'username': status.get('username', username),
                            'status': status.get('status', 'claimed'),
                        }

        # If raw_data wasn't useful, fall back to parsing console output
        if not sites_found and result.stdout:
            stdout_str = result.stdout if isinstance(result.stdout, str) else result.stdout.decode('utf-8', errors='replace')
            for line in stdout_str.split('\n'):
                match = re.match(r'^\[\+\] (\S+):\s*(\S+)', line)
                if match:
                    site_name = match.group(1)
                    url = match.group(2)
                    sites_found[site_name] = {
                        'url': url,
                        'username': username,
                        'status': 'claimed',
                    }
                    total_checked += 1

        # Count total from the summary line if available
        found_count = 0
        if result.stdout:
            stdout_str = result.stdout if isinstance(result.stdout, str) else result.stdout.decode('utf-8', errors='replace')
            summary_match = re.search(
                r'Search by username \S+ returned (\d+) accounts',
                stdout_str
            )
            if summary_match:
                found_count = int(summary_match.group(1))

        print(json.dumps({
            'username': username,
            'total_sites_checked': total_checked or found_count or len(sites_found) or 0,
            'sites_found_count': found_count or len(sites_found),
            'sites': sites_found,
        }, ensure_ascii=False))

    except subprocess.TimeoutExpired:
        print(json.dumps({
            'error': 'Maigret timed out after 3600 seconds',
            'username': username,
        }))
    except FileNotFoundError:
        print(json.dumps({
            'error': 'Maigret not installed. Run: pip install maigret',
            'username': username,
        }))
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'username': username,
        }))
    finally:
        # Clean up temp directory
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass


if __name__ == '__main__':
    main()
