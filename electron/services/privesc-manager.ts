/**
 * Privilege Escalation Manager — enumerate privesc vectors, services, and suggest exploits
 */

import { execSync } from 'child_process';
import * as os from 'os';

export class PrivescManager {
  /**
   * Get system information
   */
  getSystemInfo(): { os: string; arch: string; user: string; integrity: string; domain: string } {
    try {
      const result = execSync('whoami', { timeout: 5000, encoding: 'utf-8' }).trim();
      const user = result;
      let integrity = 'Unknown';
      try {
        const whoamiGroups = execSync('whoami /groups', { timeout: 5000, encoding: 'utf-8' });
        integrity = whoamiGroups.includes('S-1-16-12288') ? 'High' :
                    whoamiGroups.includes('S-1-16-16384') ? 'System' :
                    whoamiGroups.includes('S-1-16-8192') ? 'Medium' : 'Low';
      } catch {}
      let domain = '';
      try {
        domain = execSync('echo %USERDOMAIN%', { timeout: 3000, encoding: 'utf-8' }).trim();
      } catch {}
      return {
        os: `${os.version()} (${os.release()})`,
        arch: os.arch(),
        user,
        integrity,
        domain: domain || '—',
      };
    } catch {
      return {
        os: `${os.version()} (${os.release()})`,
        arch: os.arch(),
        user: 'Unknown',
        integrity: 'Unknown',
        domain: '—',
      };
    }
  }

  /**
   * Run privilege escalation checks
   */
  async runChecks(): Promise<{ category: string; checks: { name: string; status: string; detail: string }[] }[]> {
    const results: { category: string; checks: { name: string; status: string; detail: string }[] }[] = [];
    const info = this.getSystemInfo();

    // Token & Integrity checks
    const tokenChecks: { name: string; status: string; detail: string }[] = [];
    tokenChecks.push({
      name: 'Admin Integrity Level',
      status: info.integrity === 'High' || info.integrity === 'System' ? 'vulnerable' : 'safe',
      detail: `Current integrity: ${info.integrity}`,
    });
    try {
      const tokens = execSync('whoami /priv', { timeout: 5000, encoding: 'utf-8' });
      const hasSeImpersonate = tokens.includes('SeImpersonatePrivilege');
      const hasSeAssignPrimary = tokens.includes('SeAssignPrimaryTokenPrivilege');
      const hasSeDebug = tokens.includes('SeDebugPrivilege');
      const hasSeTakeOwnership = tokens.includes('SeTakeOwnershipPrivilege');
      const hasSeLoadDriver = tokens.includes('SeLoadDriverPrivilege');
      tokenChecks.push({
        name: 'SeImpersonatePrivilege',
        status: hasSeImpersonate ? 'vulnerable' : 'safe',
        detail: hasSeImpersonate ? 'Enabled — potential for token impersonation attacks (JuicyPotato, RogueWinRM)' : 'Not available',
      });
      tokenChecks.push({
        name: 'SeDebugPrivilege',
        status: hasSeDebug ? 'vulnerable' : 'safe',
        detail: hasSeDebug ? 'Enabled — can debug processes, potential for privilege escalation' : 'Not available',
      });
      tokenChecks.push({
        name: 'SeTakeOwnershipPrivilege',
        status: hasSeTakeOwnership ? 'vulnerable' : 'safe',
        detail: hasSeTakeOwnership ? 'Enabled — can take ownership of any object' : 'Not available',
      });
    } catch {}
    results.push({ category: 'Tokens & Privileges', checks: tokenChecks });

    // Registry checks
    const regChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const aie = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v AlwaysInstallElevated 2>nul',
        { timeout: 5000, encoding: 'utf-8' }
      );
      regChecks.push({
        name: 'AlwaysInstallElevated',
        status: aie.includes('0x1') ? 'vulnerable' : 'safe',
        detail: aie.includes('0x1') ? 'Enabled — MSI installers run with SYSTEM privileges' : 'Disabled',
      });
    } catch {
      regChecks.push({ name: 'AlwaysInstallElevated', status: 'safe', detail: 'Not configured (default)' });
    }
    results.push({ category: 'Registry', checks: regChecks });

    // Service checks
    const svcChecks: { name: string; status: string; detail: string }[] = [];
    try {
      const unquoted = execSync(
        'wmic service get name,pathname,startname 2>nul | findstr /v /i "C:\\\\Windows\\\\System32"',
        { timeout: 10000, encoding: 'utf-8' }
      );
      const lines = unquoted.split('\n').filter(l => l.trim());
      const paths = lines.filter(l => !l.includes('"') && l.includes(' '));
      svcChecks.push({
        name: 'Unquoted Service Paths',
        status: paths.length > 0 ? 'vulnerable' : 'safe',
        detail: paths.length > 0 ? `${paths.length} potential unquoted paths found` : 'No unquoted paths detected',
      });
    } catch {
      svcChecks.push({ name: 'Unquoted Service Paths', status: 'checking', detail: 'Could not enumerate' });
    }

    try {
      const weakServices = execSync(
        'wmic service get name,startname 2>nul | findstr /i "LocalSystem"',
        { timeout: 5000, encoding: 'utf-8' }
      );
      const count = weakServices.split('\n').filter(l => l.trim()).length;
      svcChecks.push({
        name: 'Services Running as SYSTEM',
        status: count > 20 ? 'checking' : 'safe',
        detail: `${count} services running as SYSTEM`,
      });
    } catch {}
    results.push({ category: 'Services', checks: svcChecks });

    return results;
  }

  /**
   * Run PowerUp-style checks via PowerShell
   */
  async runPowerUp(): Promise<any[]> {
    try {
      const result = execSync(
        `powershell -NoP -NonI -Command "
          \$services = Get-WmiObject Win32_Service | Where-Object { \$_.PathName -notlike '*C:\\\\Windows\\\\System32*' -and \$_.PathName -notlike '' };
          \$output = @();
          foreach (\$s in \$services) {
            \$vuln = \$false;
            if (\$s.PathName -notlike '*\"*' -and \$s.PathName -match ' ') { \$vuln = \$true };
            \$output += @{ Name = \$s.Name; DisplayName = \$s.DisplayName; Path = \$s.PathName; StartName = \$s.StartName; Vulnerable = \$vuln };
          }
          ConvertTo-Json \$output
        "`,
        { timeout: 30000, encoding: 'utf-8' }
      );
      return JSON.parse(result.trim());
    } catch {
      return [];
    }
  }

  /**
   * Suggest kernel exploits based on OS version
   */
  suggestExploit(): { name: string; cve: string; edbId: string; description: string; reliability: string }[] {
    const release = os.release();
    const version = os.version();

    const suggestions: { name: string; cve: string; edbId: string; description: string; reliability: string }[] = [];

    // Windows 10/11 kernel exploits
    if (version.includes('10') || version.includes('11') || release.includes('10')) {
      suggestions.push(
        { name: 'PrintNightmare', cve: 'CVE-2021-34527', edbId: '50001', description: 'Windows Print Spooler RCE — allows SYSTEM escalation via print spooler service', reliability: 'High' },
        { name: 'NoPac (SamAccountName Spoofing)', cve: 'CVE-2021-42278', edbId: '50287', description: 'Active Directory privilege escalation via sAMAccountName spoofing', reliability: 'High' },
        { name: 'SeriousSAM', cve: 'CVE-2021-36934', edbId: '50008', description: 'Windows 10/11 SAM file permission vulnerability — allows local privilege escalation', reliability: 'Medium' },
        { name: 'HiveNightmare', cve: 'CVE-2021-36934', edbId: '50008', description: 'Shadow copy volume allows reading SAM, SYSTEM, SECURITY hives', reliability: 'Medium' },
      );
    }

    // Windows 7/Server 2008
    if (version.includes('7') || version.includes('2008') || release.includes('6.1')) {
      suggestions.push(
        { name: 'MS16-032', cve: 'CVE-2016-0099', edbId: '39719', description: 'Secondary Logon Handle — PowerShell escalation via WebClient', reliability: 'High' },
        { name: 'MS15-051', cve: 'CVE-2015-1701', edbId: '37049', description: 'Win32k elevation of privilege via crafted application', reliability: 'Medium' },
        { name: 'MS14-058', cve: 'CVE-2014-4113', edbId: '35164', description: 'TrackPopupMenu Win32k NULL pointer dereference', reliability: 'Medium' },
      );
    }

    // Windows 8/Server 2012
    if (version.includes('8') || version.includes('2012') || release.includes('6.2') || release.includes('6.3')) {
      suggestions.push(
        { name: 'MS16-032', cve: 'CVE-2016-0099', edbId: '39719', description: 'Secondary Logon Handle — PowerShell escalation via WebClient', reliability: 'High' },
        { name: 'MS15-051', cve: 'CVE-2015-1701', edbId: '37049', description: 'Win32k elevation of privilege', reliability: 'Medium' },
      );
    }

    // General suggestions (for any Windows)
    suggestions.push(
      { name: 'Juicy Potato', cve: '', edbId: '', description: 'Token impersonation via DCOM — requires SeImpersonatePrivilege (typically available as IIS/NETWORK SERVICE)', reliability: 'High' },
      { name: 'RogueWinRM', cve: '', edbId: '', description: 'WinRM service abuse — requires SeImpersonatePrivilege', reliability: 'Medium' },
      { name: 'AlwaysInstallElevated', cve: '', edbId: '', description: 'MSI installer privilege escalation — check registry if enabled', reliability: 'Medium' },
    );

    return suggestions;
  }

  /**
   * Enumerate services
   */
  async enumServices(): Promise<{ name: string; displayName: string; startType: string; user: string; path: string; vulnerable: boolean }[]> {
    try {
      const result = execSync(
        `powershell -NoP -NonI -Command "
          Get-WmiObject Win32_Service | ForEach-Object {
            \$vuln = \$false;
            if (\$_.PathName -notlike '*\"*' -and \$_.PathName -match ' ') { \$vuln = \$true };
            [PSCustomObject]@{
              Name = \$_.Name;
              DisplayName = \$_.DisplayName;
              StartType = \$_.StartMode;
              User = \$_.StartName;
              Path = \$_.PathName;
              Vulnerable = \$vuln
            }
          } | ConvertTo-Json
        "`,
        { timeout: 30000, encoding: 'utf-8' }
      );
      return JSON.parse(result.trim());
    } catch {
      return [];
    }
  }

  /**
   * Check for unquoted service paths
   */
  checkUnquotedPaths(): { path: string; name: string }[] {
    try {
      const result = execSync(
        `wmic service get name,pathname 2>nul | findstr /v /i "C:\\\\Windows" | findstr /v "System32"`,
        { timeout: 10000, encoding: 'utf-8' }
      );
      const lines = result.split('\n').filter(l => l.trim());
      const unquoted: { path: string; name: string }[] = [];
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const path = parts.slice(1).join(' ');
          if (!path.startsWith('"') && path.includes(' ')) {
            unquoted.push({ path, name });
          }
        }
      }
      return unquoted;
    } catch {
      return [];
    }
  }

  /**
   * Check AlwaysInstallElevated registry setting
   */
  checkAlwaysInstallElevated(): boolean {
    try {
      const result = execSync(
        'reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul',
        { timeout: 5000, encoding: 'utf-8' }
      );
      return result.includes('0x1');
    } catch {
      return false;
    }
  }
}
