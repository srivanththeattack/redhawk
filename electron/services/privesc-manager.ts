/**
 * RedHawk — Cross-Platform Privilege Escalation Manager
 *
 * Windows: whoami /groups, reg query, wmic, PowerUp
 * macOS:   id, sudo -l, SUID, SIP, FileVault
 * Linux:   id, sudo -l, SUID/SGID, kernel exploits, cron, capabilities
 */

import { execSync } from 'child_process';
import * as os from 'os';
import { isWindows, isMac, isLinux, getOsInfo, getHomeDir } from './platform';

export class PrivescManager {
  getSystemInfo(): { os: string; arch: string; user: string; integrity: string; domain: string } {
    try {
      const info = getOsInfo();
      let user = 'Unknown';
      let integrity = 'N/A';
      let domain = '—';

      if (isWindows()) {
        try { user = execSync('whoami', { timeout: 5000, encoding: 'utf-8' }).trim(); } catch { user = info.user; }
        try {
          const groups = execSync('whoami /groups', { timeout: 5000, encoding: 'utf-8' });
          integrity = groups.includes('S-1-16-12288') ? 'High' : groups.includes('S-1-16-16384') ? 'System' : groups.includes('S-1-16-8192') ? 'Medium' : 'Low';
        } catch { integrity = 'Unknown'; }
        try { domain = execSync('echo %USERDOMAIN%', { timeout: 3000, encoding: 'utf-8' }).trim(); } catch { domain = '—'; }
      } else {
        try { user = execSync('whoami', { timeout: 5000, encoding: 'utf-8' }).trim(); } catch { user = info.user; }
        try {
          const groups = execSync('id -G', { timeout: 5000, encoding: 'utf-8' }).trim();
          integrity = `Groups(${groups.split(' ').length})`;
        } catch { integrity = 'Unknown'; }
        try { domain = execSync('hostname', { timeout: 3000, encoding: 'utf-8' }).trim(); } catch { domain = os.hostname(); }
      }
      return { os: `${os.type()} ${os.release()}`, arch: os.arch(), user, integrity, domain };
    } catch {
      return { os: `${os.type()} ${os.release()}`, arch: os.arch(), user: 'Unknown', integrity: 'N/A', domain: '—' };
    }
  }

  async runChecks(): Promise<{ category: string; checks: { name: string; status: string; detail: string }[] }[]> {
    if (isWindows()) return await this.windowsChecks();
    if (isMac()) return this.macosChecks();
    return this.linuxChecks();
  }

  // ── Windows Checks ──

  private async windowsChecks(): Promise<{ category: string; checks: { name: string; status: string; detail: string }[] }[]> {
    const info = this.getSystemInfo();
    const results: { category: string; checks: { name: string; status: string; detail: string }[] }[] = [];

    const tokenChecks: { name: string; status: string; detail: string }[] = [];
    tokenChecks.push({ name: 'Admin Integrity', status: (info.integrity === 'High' || info.integrity === 'System') ? 'vulnerable' : 'safe', detail: `Integrity: ${info.integrity}` });
    try {
      const tokens = execSync('whoami /priv', { timeout: 5000, encoding: 'utf-8' });
      const hasSeImpersonate = tokens.includes('SeImpersonatePrivilege');
      const hasSeDebug = tokens.includes('SeDebugPrivilege');
      const hasSeTakeOwnership = tokens.includes('SeTakeOwnershipPrivilege');
      tokenChecks.push({ name: 'SeImpersonatePrivilege', status: hasSeImpersonate ? 'vulnerable' : 'safe', detail: hasSeImpersonate ? 'Enabled — JuicyPotato/RogueWinRM' : 'Not available' });
      tokenChecks.push({ name: 'SeDebugPrivilege', status: hasSeDebug ? 'vulnerable' : 'safe', detail: hasSeDebug ? 'Enabled — debug processes' : 'Not available' });
      tokenChecks.push({ name: 'SeTakeOwnershipPrivilege', status: hasSeTakeOwnership ? 'vulnerable' : 'safe', detail: hasSeTakeOwnership ? 'Enabled — take ownership' : 'Not available' });
    } catch {}
    results.push({ category: 'Tokens & Privileges', checks: tokenChecks });

    const regChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const aie = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v AlwaysInstallElevated 2>nul', { timeout: 5000, encoding: 'utf-8' });
      regChecks.push({ name: 'AlwaysInstallElevated', status: aie.includes('0x1') ? 'vulnerable' : 'safe', detail: aie.includes('0x1') ? 'MSI run as SYSTEM' : 'Disabled' });
    } catch { regChecks.push({ name: 'AlwaysInstallElevated', status: 'safe', detail: 'Not configured' }); }
    results.push({ category: 'Registry', checks: regChecks });

    const svcChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const unquoted = execSync('wmic service get name,pathname,startname 2>nul | findstr /v /i "C:\\\\Windows\\\\System32"', { timeout: 10000, encoding: 'utf-8' });
      const paths = unquoted.split('\n').filter(l => l.trim()).filter(l => !l.includes('"') && l.includes(' '));
      svcChecks.push({ name: 'Unquoted Service Paths', status: paths.length > 0 ? 'vulnerable' : 'safe', detail: paths.length > 0 ? `${paths.length} potential` : 'None' });
    } catch { svcChecks.push({ name: 'Unquoted Service Paths', status: 'checking', detail: 'Could not enumerate' }); }
    results.push({ category: 'Services', checks: svcChecks });

    return results;
  }

  // ── macOS Checks ──

  private macosChecks(): { category: string; checks: { name: string; status: string; detail: string }[] }[] {
    const results: { category: string; checks: { name: string; status: string; detail: string }[] }[] = [];

    const userChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const whoami = execSync('whoami', { timeout: 5000, encoding: 'utf-8' }).trim();
      userChecks.push({ name: 'Current User', status: whoami === 'root' ? 'vulnerable' : 'safe', detail: `User: ${whoami}` });
    } catch { userChecks.push({ name: 'Current User', status: 'safe', detail: 'Unknown' }); }
    try {
      const sudoResult = execSync('sudo -n -l 2>&1 || echo "no sudo"', { timeout: 5000, encoding: 'utf-8' });
      const hasSudo = !sudoResult.includes('no sudo') && !sudoResult.includes('not allowed');
      userChecks.push({ name: 'Sudo Privileges', status: hasSudo ? 'vulnerable' : 'safe', detail: hasSudo ? `Sudo rights:\n${sudoResult.split('\n').slice(0, 3).join('\n')}` : 'No passwordless sudo' });
    } catch { userChecks.push({ name: 'Sudo Privileges', status: 'safe', detail: 'Could not enumerate' }); }
    try {
      const sip = execSync('csrutil status', { timeout: 5000, encoding: 'utf-8' }).trim();
      userChecks.push({ name: 'SIP', status: sip.includes('disabled') ? 'vulnerable' : 'safe', detail: sip });
    } catch { userChecks.push({ name: 'SIP', status: 'info', detail: 'Could not check' }); }
    results.push({ category: 'User & System', checks: userChecks });

    const suidChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const suid = execSync('find / -perm -4000 -type f 2>/dev/null | head -30', { timeout: 15000, encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
      const interesting = suid.filter(f => ['python', 'ruby', 'perl', 'bash', 'nmap', 'vim'].some(k => f.includes(k)));
      suidChecks.push({ name: 'SUID Binaries', status: interesting.length > 0 ? 'vulnerable' : 'safe', detail: `${suid.length} SUID files${interesting.length ? ` (exploitable: ${interesting.join(', ')})` : ''}` });
    } catch { suidChecks.push({ name: 'SUID Binaries', status: 'checking', detail: 'Could not enumerate' }); }
    results.push({ category: 'SUID', checks: suidChecks });

    return results;
  }

  // ── Linux Checks ──

  private linuxChecks(): { category: string; checks: { name: string; status: string; detail: string }[] }[] {
    const results: { category: string; checks: { name: string; status: string; detail: string }[] }[] = [];

    const userChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const whoami = execSync('whoami', { timeout: 5000, encoding: 'utf-8' }).trim();
      const isRoot = whoami === 'root';
      userChecks.push({ name: 'Current User', status: isRoot ? 'vulnerable' : 'safe', detail: `Running as: ${whoami}${isRoot ? ' (ROOT!)' : ''}` });
    } catch { userChecks.push({ name: 'Current User', status: 'safe', detail: 'Unknown' }); }

    try {
      const idResult = execSync('id', { timeout: 5000, encoding: 'utf-8' }).trim();
      const inSudoGroup = idResult.includes('(sudo)') || idResult.includes('(wheel)') || idResult.includes('(admin)');
      userChecks.push({ name: 'Sudo/Wheel Group', status: inSudoGroup ? 'vulnerable' : 'safe', detail: inSudoGroup ? 'User is in sudo/wheel group' : 'Not in sudo group' });
    } catch { userChecks.push({ name: 'Sudo Group', status: 'safe', detail: 'Could not check' }); }

    try {
      const sudoResult = execSync('sudo -n -l 2>&1 || echo "no sudo"', { timeout: 5000, encoding: 'utf-8' });
      const hasSudo = !sudoResult.includes('no sudo') && !sudoResult.includes('not allowed');
      userChecks.push({ name: 'Sudo Privileges', status: hasSudo ? 'vulnerable' : 'safe', detail: hasSudo ? `Rights:\n${sudoResult.split('\n').slice(0, 3).join('\n')}` : 'No passwordless sudo' });
    } catch { userChecks.push({ name: 'Sudo Privileges', status: 'safe', detail: 'Could not enumerate' }); }

    try {
      const crontab = execSync('ls -la /etc/cron* 2>/dev/null; ls -la /var/spool/cron/ 2>/dev/null; cat /etc/crontab 2>/dev/null', { timeout: 5000, encoding: 'utf-8' }).trim();
      const hasCrons = crontab.length > 50;
      userChecks.push({ name: 'Cron Jobs', status: hasCrons ? 'info' : 'safe', detail: hasCrons ? 'Cron jobs found (check for writable scripts)' : 'No cron jobs detected' });
    } catch {}
    results.push({ category: 'User & System', checks: userChecks });

    // SUID/SGID
    const suidChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const suid = execSync('find / -perm -4000 -type f 2>/dev/null | head -50', { timeout: 15000, encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
      const interesting = suid.filter(f => ['python', 'ruby', 'perl', 'bash', 'sh', 'nmap', 'vim', 'less', 'more', 'cp', 'mv'].some(k => f.includes(k)));
      suidChecks.push({ name: 'SUID Binaries', status: interesting.length > 0 ? 'vulnerable' : 'info', detail: `${suid.length} SUID files${interesting.length ? `\nExploitable: ${interesting.join(', ')}` : ''}` });
    } catch { suidChecks.push({ name: 'SUID Binaries', status: 'checking', detail: 'Could not enumerate' }); }

    try {
      const sgid = execSync('find / -perm -2000 -type f 2>/dev/null | head -30', { timeout: 10000, encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
      suidChecks.push({ name: 'SGID Binaries', status: sgid.length > 0 ? 'info' : 'safe', detail: `${sgid.length} SGID files` });
    } catch {}
    results.push({ category: 'SUID/SGID', checks: suidChecks });

    // Capabilities
    const capChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const caps = execSync('getcap -r / 2>/dev/null | grep -i "cap_setuid\\|cap_sys_admin\\|cap_dac_override" | head -20 || echo "none"', { timeout: 15000, encoding: 'utf-8' }).trim().split('\n').filter(l => l !== 'none');
      capChecks.push({ name: 'Dangerous Capabilities', status: caps.length > 0 ? 'vulnerable' : 'safe', detail: caps.length > 0 ? caps.join('\n') : 'No dangerous capabilities found' });
    } catch { capChecks.push({ name: 'Capabilities', status: 'info', detail: 'getcap not available' }); }
    results.push({ category: 'Capabilities', checks: capChecks });

    // Writable paths
    const permChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const writableEtc = execSync('find /etc -type f -writable 2>/dev/null | head -10 || echo "none"', { timeout: 5000, encoding: 'utf-8' }).trim().split('\n').filter(l => l !== 'none' && l);
      permChecks.push({ name: 'Writable /etc', status: writableEtc.length > 0 ? 'vulnerable' : 'safe', detail: writableEtc.length > 0 ? `${writableEtc.length} writable files` : 'None' });
    } catch {}
    try {
      const writablePath = execSync('find / -path /proc -prune -o -path /sys -prune -o -type d -writable 2>/dev/null | head -20 || echo "none"', { timeout: 5000, encoding: 'utf-8' }).trim().split('\n').filter(l => l !== 'none' && l && !l.startsWith('/proc') && !l.startsWith('/sys'));
      permChecks.push({ name: 'Writable Directories', status: writablePath.length > 5 ? 'info' : 'safe', detail: `${writablePath.length} world-writable dirs (excl. /proc /sys)` });
    } catch {}
    results.push({ category: 'Permissions', checks: permChecks });

    return results;
  }

  // ── PowerUp (Windows only) ──

  async runPowerUp(): Promise<any[]> {
    if (isLinux()) return [{ note: 'PowerUp is Windows-only. Use the Linux SUID/sudo checks above.' }];
    if (isMac()) return [{ note: 'PowerUp is Windows-only. Use the macOS SUID/sudo checks above.' }];
    try {
      const result = execSync(
        `powershell -NoP -NonI -Command "
          Get-WmiObject Win32_Service | Where-Object { \$_.PathName -notlike '*C:\\\\Windows\\\\System32*' } | ForEach-Object {
            \$vuln = \$false; if (\$_.PathName -notlike '*\"*' -and \$_.PathName -match ' ') { \$vuln = \$true };
            [PSCustomObject]@{ Name=\$_.Name; DisplayName=\$_.DisplayName; Path=\$_.PathName; StartName=\$_.StartName; Vulnerable=\$vuln }
          } | ConvertTo-Json
        "`, { timeout: 30000, encoding: 'utf-8' });
      return JSON.parse(result.trim());
    } catch { return []; }
  }

  // ── Exploit Suggester (cross-platform) ──

  suggestExploit(): { name: string; cve: string; edbId: string; description: string; reliability: string }[] {
    const release = os.release();
    const suggestions: { name: string; cve: string; edbId: string; description: string; reliability: string }[] = [];

    if (isWindows()) {
      if (os.version().includes('10') || os.version().includes('11')) {
        suggestions.push(
          { name: 'PrintNightmare', cve: 'CVE-2021-34527', edbId: '50001', description: 'Print Spooler RCE', reliability: 'High' },
          { name: 'NoPac', cve: 'CVE-2021-42278', edbId: '50287', description: 'AD sAMAccountName spoofing', reliability: 'High' },
        );
      }
      suggestions.push(
        { name: 'Juicy Potato', cve: '', edbId: '', description: 'DCOM token impersonation (SeImpersonate)', reliability: 'High' },
        { name: 'AlwaysInstallElevated', cve: '', edbId: '', description: 'MSI privilege escalation', reliability: 'Medium' },
      );
    } else if (isMac()) {
      suggestions.push(
        { name: 'CVE-2021-1782', cve: 'CVE-2021-1782', edbId: '49445', description: 'macOS IOKit root escalation', reliability: 'Medium' },
        { name: 'CVE-2021-30657', cve: 'CVE-2021-30657', edbId: '49957', description: 'Gatekeeper bypass', reliability: 'High' },
        { name: 'CVE-2021-30937', cve: 'CVE-2021-30937', edbId: '50415', description: 'macOS 12+ audio driver LPE', reliability: 'Medium' },
        { name: 'Sudo Baron Samedit', cve: 'CVE-2021-3156', edbId: '49688', description: 'sudo heap overflow (< 1.8.31)', reliability: 'High' },
      );
    } else {
      // Linux exploit suggestions
      const major = parseInt(release.split('.')[0]) || 0;

      suggestions.push(
        { name: 'Dirty Pipe', cve: 'CVE-2022-0847', edbId: '50808', description: 'Linux kernel 5.8-5.16 — arbitrary file overwrite via pipe', reliability: 'High' },
        { name: 'PwnKit', cve: 'CVE-2021-4034', edbId: '50689', description: 'pkexec local privilege escalation (all versions)', reliability: 'High' },
        { name: 'DirtyCow', cve: 'CVE-2016-5195', edbId: '40847', description: 'Linux kernel race condition (pre-4.8)', reliability: 'High' },
        { name: 'CVE-2021-22555', cve: 'CVE-2021-22555', edbId: '50316', description: 'Linux kernel 2.6-5.11 — Netfilter heap overflow', reliability: 'Medium' },
        { name: 'Sudo Baron Samedit', cve: 'CVE-2021-3156', edbId: '49688', description: 'sudo heap overflow (< 1.8.31)', reliability: 'High' },
      );

      if (major < 5) {
        suggestions.push(
          { name: 'CVE-2017-1000112', cve: 'CVE-2017-1000112', edbId: '43418', description: 'Linux kernel <4.13 — UFO privilege escalation', reliability: 'Medium' },
        );
      }

      suggestions.push(
        { name: 'Linux Capabilities Abuse', cve: '', edbId: '', description: 'CAP_SETUID / CAP_DAC_OVERRIDE on binaries', reliability: 'Medium' },
        { name: 'LD_PRELOAD Abuse', cve: '', edbId: '', description: 'LD_PRELOAD via sudo (env_keep)', reliability: 'Medium' },
      );
    }

    return suggestions;
  }

  async enumServices(): Promise<{ name: string; displayName: string; startType: string; user: string; path: string; vulnerable: boolean }[]> {
    if (isLinux()) {
      try {
        const result = execSync('systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -60 || service --status-all 2>/dev/null | head -60', { timeout: 10000, encoding: 'utf-8' });
        return result.trim().split('\n').filter(Boolean).map(line => ({
          name: line.split(/\s+/).filter(Boolean)[0] || line,
          displayName: line, startType: 'running', user: '?', path: line, vulnerable: false,
        }));
      } catch { return []; }
    }
    if (isMac()) {
      try {
        const result = execSync('launchctl list 2>/dev/null | head -50', { timeout: 10000, encoding: 'utf-8' });
        return result.trim().split('\n').filter(Boolean).map(line => {
          const parts = line.trim().split(/\s+/);
          return { name: parts[parts.length - 1] || line, displayName: line, startType: parts[0] || '?', user: parts.length > 2 ? parts[1] : '?', path: line, vulnerable: false };
        });
      } catch { return []; }
    }
    // Windows
    try {
      const result = execSync(
        `powershell -NoP -NonI -Command "Get-WmiObject Win32_Service | ForEach-Object {
          \$vuln=\$false; if (\$_.PathName -notlike '*\"*' -and \$_.PathName -match ' ') { \$vuln=\$true };
          [PSCustomObject]@{ Name=\$_.Name; DisplayName=\$_.DisplayName; StartType=\$_.StartMode; User=\$_.StartName; Path=\$_.PathName; Vulnerable=\$vuln }
        } | ConvertTo-Json"`, { timeout: 30000, encoding: 'utf-8' });
      return JSON.parse(result.trim());
    } catch { return []; }
  }

  checkUnquotedPaths(): { path: string; name: string }[] {
    if (!isWindows()) return [];
    try {
      const result = execSync('wmic service get name,pathname 2>nul | findstr /v /i "C:\\\\Windows" | findstr /v "System32"', { timeout: 10000, encoding: 'utf-8' });
      return result.split('\n').filter(l => l.trim()).map(l => {
        const parts = l.trim().split(/\s+/);
        return parts.length >= 2 && !parts.slice(1).join(' ').startsWith('"') && parts.slice(1).join(' ').includes(' ')
          ? { path: parts.slice(1).join(' '), name: parts[0] } as any : null;
      }).filter(Boolean);
    } catch { return []; }
  }

  checkAlwaysInstallElevated(): boolean {
    if (!isWindows()) return false;
    try {
      const result = execSync('reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul', { timeout: 5000, encoding: 'utf-8' });
      return result.includes('0x1');
    } catch { return false; }
  }
}
