/**
 * RedHawk — Cross-Platform Dependency Checker (Windows / macOS / Linux)
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { paths } from './paths';
import {
  isWindows, isMac, isLinux, isUnix,
  getWhichCommand, getNmapSearchPaths, getMetasploitSearchPaths,
  getEvilginxSearchPaths, getPythonCommand, getPackageManager,
  getPackageInstallCommand,
} from './platform';

export interface DepDetail {
  installed: boolean;
  version?: string;
  path?: string;
  detail?: string;
}

export class DependencyChecker {
  private userDataPath: string;

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath;
  }

  async checkAll(): Promise<{
    nmap: DepDetail; python: DepDetail; pip: DepDetail;
    nodejs: DepDetail; metasploit: DepDetail; msfRunning: DepDetail;
    evilginx: DepDetail; wsl: DepDetail; all: boolean;
  }> {
    const nmap = await this.checkNmap();
    const python = await this.checkPython();
    const pip = await this.checkPip();
    const nodejs = await this.checkNodejs();
    const metasploit = await this.checkMetasploit();
    const msfRunning = await this.checkMsfRunning();
    const evilginx = await this.checkEvilginx();
    const wsl = await this.checkWsl();

    return {
      nmap, python, pip, nodejs,
      metasploit, msfRunning, evilginx, wsl,
      all: nmap.installed && python.installed && pip.installed && nodejs.installed,
    };
  }

  // ── WSL (Windows only) ──

  private async checkWsl(): Promise<DepDetail> {
    if (!isWindows()) {
      return { installed: false, detail: 'WSL is Windows-only.' };
    }
    const wslBin = `${process.env.SystemRoot}\\System32\\wsl.exe`;
    const wslAlt = `${process.env.SystemRoot}\\Sysnative\\wsl.exe`;
    const wslPath = fs.existsSync(wslBin) ? wslBin : fs.existsSync(wslAlt) ? wslAlt : null;
    if (!wslPath) return { installed: false, detail: 'WSL not installed' };
    try {
      const distros = execSync('wsl -l -q', { stdio: 'pipe', timeout: 5000 }).toString().trim().split('\n').filter(Boolean);
      return {
        installed: true,
        detail: distros.length ? `WSL distros: ${distros.join(', ')}` : 'WSL installed but no distros',
        path: wslPath,
      };
    } catch (err: any) {
      return { installed: true, detail: `WSL found but listing failed: ${err.message}`, path: wslPath };
    }
  }

  // ── msfrpcd TCP check ──

  private async checkMsfRunning(): Promise<DepDetail> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => { socket.destroy(); resolve({ installed: false, detail: 'Timeout (port 55553)' }); }, 3000);
      socket.setTimeout(3000);
      socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve({ installed: true, detail: 'msfrpcd listening on localhost:55553' }); });
      socket.on('error', (err: any) => { clearTimeout(timer); resolve({ installed: false, detail: `Cannot connect: ${err.message}` }); });
      socket.on('timeout', () => { clearTimeout(timer); socket.destroy(); resolve({ installed: false, detail: 'Timeout' }); });
      socket.connect(55553, '127.0.0.1');
    });
  }

  // ── Nmap ──

  private async checkNmap(): Promise<DepDetail> {
    const which = getWhichCommand();
    try {
      const result = execSync(`${which} nmap`, { stdio: 'pipe', timeout: 3000, shell: isWindows() });
      const p = result.toString().trim().split('\n')[0];
      let ver = 'unknown';
      try {
        const vr = isWindows()
          ? execSync('nmap --version 2>nul | findstr /i "version"', { timeout: 3000, shell: true as any })
          : execSync('nmap --version 2>/dev/null | head -1', { timeout: 3000 });
        ver = vr.toString().trim().split('\n')[0] || 'unknown';
      } catch { /* ignore */ }
      return { installed: true, path: p, version: ver, detail: 'Found on PATH' };
    } catch {
      for (const p of getNmapSearchPaths().slice(1)) {
        if (fs.existsSync(p)) return { installed: true, path: p, detail: 'Found in known location' };
      }
      return { installed: false, detail: 'Nmap not found. Install: ' + this.getPkgSuggestion('nmap') };
    }
  }

  // ── Python ──

  private async checkPython(): Promise<DepDetail> {
    const py = getPythonCommand();
    try {
      const result = execSync(`${py} --version`, { stdio: 'pipe', timeout: 3000, shell: isWindows() });
      return { installed: true, version: result.toString().trim(), detail: `Found on PATH (${py})` };
    } catch {
      if (isWindows() && fs.existsSync(paths.pythonExe)) {
        return { installed: true, path: paths.pythonExe, detail: 'Embedded Python' };
      }
      return { installed: false, detail: 'Python not found. Install: ' + this.getPkgSuggestion('python3') };
    }
  }

  private async checkPip(): Promise<DepDetail> {
    const py = getPythonCommand();
    try {
      const result = execSync(`${py} -m pip --version`, { stdio: 'pipe', timeout: 3000, shell: isWindows() });
      return { installed: true, version: result.toString().trim(), detail: 'pip available' };
    } catch {
      return { installed: false, detail: 'pip not available. Install: ' + this.getPkgSuggestion('python3-pip') };
    }
  }

  // ── Node.js ──

  private async checkNodejs(): Promise<DepDetail> {
    try {
      const result = execSync('node --version', { stdio: 'pipe', timeout: 3000, shell: isWindows() });
      return { installed: true, version: result.toString().trim(), detail: 'Node.js found on PATH' };
    } catch {
      const nodePaths = isWindows()
        ? [`${process.env.ProgramFiles}\\nodejs\\node.exe`, `${process.env['ProgramFiles(x86)']}\\nodejs\\node.exe`, `${process.env.LOCALAPPDATA}\\Programs\\nodejs\\node.exe`]
        : ['/usr/local/bin/node', '/usr/bin/node'];
      for (const p of nodePaths) {
        if (fs.existsSync(p)) {
          try {
            const ver = execSync(`"${p}" --version`, { timeout: 3000, shell: isWindows() }).toString().trim();
            return { installed: true, path: p, version: ver, detail: 'Found in standard path' };
          } catch { return { installed: true, path: p, detail: 'Found (version unknown)' }; }
        }
      }
      return { installed: false, detail: 'Node.js not found. Install: ' + this.getPkgSuggestion('nodejs') };
    }
  }

  // ── Metasploit ──

  private async checkMetasploit(): Promise<DepDetail> {
    for (const entry of getMetasploitSearchPaths()) {
      if (fs.existsSync(entry.p)) {
        try {
          const ver = execSync(`"${entry.p}" --version 2>/dev/null || echo "unknown"`, { timeout: 3000, shell: isWindows() }).toString().trim();
          return { installed: true, path: entry.p, version: ver, detail: `Found at ${entry.label}` };
        } catch { return { installed: true, path: entry.p, detail: `Found at ${entry.label}` }; }
      }
    }
    if (isUnix()) {
      try {
        const result = execSync('which msfconsole', { stdio: 'pipe', timeout: 3000 });
        return { installed: true, path: result.toString().trim(), detail: 'Metasploit Framework found on PATH' };
      } catch { /* not found */ }
    }
    return { installed: false, detail: 'Metasploit not found. Install: ' + this.getPkgSuggestion('metasploit-framework') };
  }

  // ── Evilginx2 ──

  private async checkEvilginx(): Promise<DepDetail> {
    try {
      const which = getWhichCommand();
      const result = execSync(`${which} evilginx2`, { stdio: 'pipe', timeout: 3000, shell: isWindows() });
      return { installed: true, path: result.toString().trim().split('\n')[0], detail: 'Found on PATH' };
    } catch { /* not on PATH */ }

    for (const p of getEvilginxSearchPaths()) {
      if (fs.existsSync(p)) return { installed: true, path: p, detail: 'Found in known location' };
    }

    // Windows: check WSL
    if (isWindows()) {
      const wslExe = fs.existsSync(`${process.env.SystemRoot}\\System32\\wsl.exe`)
        ? `${process.env.SystemRoot}\\System32\\wsl.exe`
        : fs.existsSync(`${process.env.SystemRoot}\\Sysnative\\wsl.exe`)
          ? `${process.env.SystemRoot}\\Sysnative\\wsl.exe` : null;
      if (wslExe) {
        try {
          const result = execSync('wsl which evilginx2 2>/dev/null || echo ""', { timeout: 3000 }).toString().trim();
          if (result) return { installed: true, path: `WSL:${result}`, detail: 'Installed in WSL' };
        } catch { /* not in WSL */ }
        return { installed: false, detail: 'WSL available but evilginx2 not found' };
      }
    }

    return { installed: false, detail: 'Evilginx2 not found. Install: go install github.com/kgretzky/evilginx2@latest' };
  }

  // ── Install All ──

  async installAll(): Promise<{ success: boolean; results: Record<string, any> }> {
    const results: Record<string, any> = {};

    for (const [key, checkFn, installFn] of [
      ['nmap', () => this.checkNmap(), () => this.installNmap()],
      ['python', () => this.checkPython(), () => this.installPython()],
      ['pip', () => this.checkPip(), () => this.installPipPackages()],
      ['nodejs', () => this.checkNodejs(), () => this.installNodejs()],
      ['metasploit', () => this.checkMetasploit(), () => this.installMetasploit()],
      ['evilginx', () => this.checkEvilginx(), () => this.installEvilginx()],
    ] as const) {
      const status = await checkFn();
      if (!status.installed) {
        results[key] = await installFn();
      } else {
        results[key] = { status: 'already_installed', detail: status.detail };
      }
    }

    const wslCheck = await this.checkWsl();
    if (!wslCheck.installed && isWindows()) {
      results.wsl = await this.installWsl();
    } else {
      results.wsl = { status: isWindows() ? 'already_installed' : 'n/a', detail: wslCheck.detail };
    }

    const allOk = Object.values(results).every((r: any) => r.status === 'already_installed' || r.status === 'n/a' || r.success);
    return { success: allOk, results };
  }

  // ── Platform-Specific Installers ──

  private async installMetasploit(): Promise<{ success: boolean; message: string }> {
    const cmd = getPackageInstallCommand('metasploit-framework');
    if (cmd.length) {
      try {
        execSync(cmd.join(' '), { timeout: 300000, stdio: 'pipe' });
        return { success: true, message: 'Metasploit installation initiated' };
      } catch (err: any) {
        return { success: false, message: `Install failed: ${err.message}` };
      }
    }
    if (isWindows()) {
      const sp = path.join(paths.scripts, 'install-metasploit.ps1');
      if (fs.existsSync(sp)) {
        try { execSync(`powershell -ExecutionPolicy Bypass -File "${sp}"`, { timeout: 300000 }); return { success: true, message: 'Metasploit installation initiated' }; }
        catch (err: any) { return { success: false, message: `Failed: ${err.message}` }; }
      }
    }
    return { success: false, message: 'No installer available. See: https://metasploit.com' };
  }

  private async installEvilginx(): Promise<{ success: boolean; message: string }> {
    if (isUnix()) {
      try {
        execSync('go install github.com/kgretzky/evilginx2@latest', { timeout: 120000, stdio: 'pipe' });
        return { success: true, message: 'Evilginx2 installed via Go. Ensure $GOPATH/bin is on PATH.' };
      } catch (err: any) {
        return { success: false, message: `Go install failed: ${err.message}. Try: go install github.com/kgretzky/evilginx2@latest` };
      }
    }
    const sp = path.join(paths.scripts, 'install-evilginx.ps1');
    if (fs.existsSync(sp)) {
      try { execSync(`powershell -ExecutionPolicy Bypass -File "${sp}"`, { timeout: 300000 }); return { success: true, message: 'Evilginx2 installation initiated' }; }
      catch (err: any) { return { success: false, message: `Failed: ${err.message}` }; }
    }
    return { success: false, message: 'Installer script not found' };
  }

  private async installNmap(): Promise<{ success: boolean; message: string }> {
    const cmd = getPackageInstallCommand('nmap');
    if (cmd.length) {
      try { execSync(cmd.join(' '), { timeout: 120000, stdio: 'pipe' }); return { success: true, message: 'Nmap installed' }; }
      catch (err: any) { return { success: false, message: `Install failed: ${err.message}` }; }
    }
    if (isWindows()) {
      const ip = path.join(paths.resources, 'nmap-installer.exe');
      if (fs.existsSync(ip)) {
        try { execSync(`"${ip}" /S`, { timeout: 120000 }); return { success: true, message: 'Nmap installed' }; }
        catch (err: any) { return { success: false, message: `Failed: ${err.message}` }; }
      }
      const { shell } = require('electron');
      shell.openExternal('https://nmap.org/download.html');
      return { success: false, message: 'Download page opened.' };
    }
    return { success: false, message: 'No installer available.' };
  }

  private async installPython(): Promise<{ success: boolean; message: string }> {
    const cmd = getPackageInstallCommand('python3');
    if (cmd.length) {
      try { execSync(cmd.join(' '), { timeout: 120000, stdio: 'pipe' }); return { success: true, message: 'Python 3 installed' }; }
      catch (err: any) { return { success: false, message: `Install failed: ${err.message}` }; }
    }
    if (isWindows()) {
      const sp = path.join(paths.scripts, 'download-python.ps1');
      if (fs.existsSync(sp)) {
        try { execSync(`powershell -ExecutionPolicy Bypass -File "${sp}"`, { timeout: 120000 }); return { success: true, message: 'Python installed' }; }
        catch (err: any) { return { success: false, message: `Failed: ${err.message}` }; }
      }
    }
    return { success: false, message: 'No installer available.' };
  }

  private async installNodejs(): Promise<{ success: boolean; message: string }> {
    const cmd = getPackageInstallCommand(isLinux() ? 'nodejs' : 'node');
    if (cmd.length) {
      try { execSync(cmd.join(' '), { timeout: 120000, stdio: 'pipe' }); return { success: true, message: 'Node.js installed' }; }
      catch { /* fall through */ }
    }
    if (isWindows()) {
      try { execSync('winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements', { timeout: 120000, shell: true as any }); return { success: true, message: 'Node.js LTS installed' };}
      catch {
        try { execSync('choco install nodejs-lts -y', { timeout: 120000, shell: true as any }); return { success: true, message: 'Node.js LTS installed' }; }
        catch { /* fall through */ }
      }
    }
    const { shell } = require('electron');
    shell.openExternal('https://nodejs.org/en/download/');
    return { success: false, message: 'Download page opened.' };
  }

  private async installWsl(): Promise<{ success: boolean; message: string }> {
    try { execSync('wsl --install', { timeout: 300000, shell: true as any }); return { success: true, message: 'WSL installation initiated' }; }
    catch (err: any) { return { success: false, message: `Failed: ${err.message}` }; }
  }

  private async installPipPackages(): Promise<{ success: boolean; message: string }> {
    const reqPath = path.join(paths.python, 'requirements.txt');
    if (!fs.existsSync(reqPath)) return { success: false, message: 'requirements.txt not found' };
    const py = getPythonCommand();
    return new Promise((resolve) => {
      const proc = spawn(py, ['-m', 'pip', 'install', '-r', reqPath], { shell: isWindows(), timeout: 120000 });
      let output = '';
      proc.stdout.on('data', (d: Buffer) => output += d.toString());
      proc.stderr.on('data', (d: Buffer) => output += d.toString());
      proc.on('close', (code) => resolve({ success: code === 0, message: code === 0 ? 'Packages installed' : `Failed: ${output.slice(0, 200)}` }));
    });
  }

  private getPkgSuggestion(pkg: string): string {
    switch (getPackageManager()) {
      case 'apt': return `sudo apt install -y ${pkg}`;
      case 'dnf': return `sudo dnf install -y ${pkg}`;
      case 'pacman': return `sudo pacman -S ${pkg}`;
      case 'zypper': return `sudo zypper install ${pkg}`;
      case 'brew': return `brew install ${pkg}`;
      default: return `Install ${pkg} from your package manager`;
    }
  }
}
