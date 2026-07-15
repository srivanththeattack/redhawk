import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { paths } from './paths';

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

  /**
   * Check all required dependencies
   */
  async checkAll(): Promise<{
    nmap: DepDetail;
    python: DepDetail;
    pip: DepDetail;
    nodejs: DepDetail;
    maigret: DepDetail;
    metasploit: DepDetail;
    msfRunning: DepDetail;
    evilginx: DepDetail;
    wsl: DepDetail;
    all: boolean;
  }> {
    const nmap = await this.checkNmap();
    const python = await this.checkPython();
    const pip = await this.checkPip();
    const nodejs = await this.checkNodejs();
    const maigret = await this.checkMaigret();
    const metasploit = await this.checkMetasploit();
    const msfRunning = await this.checkMsfRunning();
    const evilginx = await this.checkEvilginx();
    const wsl = await this.checkWsl();

    return {
      nmap,
      python,
      pip,
      nodejs,
      maigret,
      metasploit,
      msfRunning,
      evilginx,
      wsl,
      all: nmap.installed && python.installed && pip.installed && nodejs.installed,
    };
  }

  /**
   * Check if msfrpcd is actually listening by trying a TCP connect
   */
  private async checkMsfRunning(): Promise<DepDetail> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ installed: false, detail: 'Connection timed out (default port 55553)' });
      }, 3000);
      socket.setTimeout(3000);
      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ installed: true, detail: 'msfrpcd is listening on localhost:55553' });
      });
      socket.on('error', (err: any) => {
        clearTimeout(timer);
        resolve({ installed: false, detail: `Cannot connect: ${err.message}` });
      });
      socket.on('timeout', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ installed: false, detail: 'Connection timed out' });
      });
      socket.connect(55553, '127.0.0.1');
    });
  }

  private async checkWsl(): Promise<DepDetail> {
    const wslBin = `${process.env.SystemRoot}\\System32\\wsl.exe`;
    const wslAlt = `${process.env.SystemRoot}\\Sysnative\\wsl.exe`;
    const wslPath = fs.existsSync(wslBin) ? wslBin : fs.existsSync(wslAlt) ? wslAlt : null;
    if (!wslPath) return { installed: false, detail: 'WSL not installed (wsl.exe not found)' };
    try {
      const distros = execSync('wsl -l -q', { stdio: 'pipe', timeout: 5000 }).toString().trim().split('\n').filter(Boolean);
      if (distros.length === 0) return { installed: true, detail: 'WSL installed but no distros found', path: wslPath };
      return { installed: true, detail: `WSL distros: ${distros.join(', ')}`, path: wslPath, version: distros[0] };
    } catch (err: any) {
      return { installed: true, detail: `WSL binary found but listing failed: ${err.message}`, path: wslPath };
    }
  }

  /**
   * Install all missing dependencies
   */
  async installAll(): Promise<{ success: boolean; results: Record<string, any> }> {
    const results: Record<string, any> = {};

    // Nmap
    const nmapOk = await this.checkNmap();
    if (!nmapOk.installed) {
      results.nmap = await this.installNmap();
    } else {
      results.nmap = { status: 'already_installed', detail: nmapOk.detail };
    }

    // Python
    const pythonOk = await this.checkPython();
    if (!pythonOk.installed) {
      results.python = await this.installPython();
    } else {
      results.python = { status: 'already_installed', version: pythonOk.version };
    }

    // Pip packages (includes maigret now)
    const pipOk = await this.checkPip();
    if (pipOk.installed) {
      results.pip = await this.installPipPackages();
    } else {
      results.pip = { status: 'skipped', detail: 'pip not available, cannot install packages' };
    }

    // Node.js
    const nodeOk = await this.checkNodejs();
    if (!nodeOk.installed) {
      results.nodejs = await this.installNodejs();
    } else {
      results.nodejs = { status: 'already_installed', version: nodeOk.version };
    }

    // Maigret (Python package)
    const maigretOk = await this.checkMaigret();
    if (!maigretOk.installed) {
      results.maigret = await this.installMaigret();
    } else {
      results.maigret = { status: 'already_installed', version: maigretOk.version };
    }

    // Metasploit (via script)
    const msfOk = await this.checkMetasploit();
    if (!msfOk.installed) {
      results.metasploit = await this.installMetasploit();
    } else {
      results.metasploit = { status: 'already_installed', path: msfOk.path };
    }

    // Evilginx (via script or pip)
    const evilginxOk = await this.checkEvilginx();
    if (!evilginxOk.installed) {
      results.evilginx = await this.installEvilginx();
    } else {
      results.evilginx = { status: 'already_installed', path: evilginxOk.path };
    }

    // WSL
    const wslOk = await this.checkWsl();
    if (!wslOk.installed) {
      results.wsl = await this.installWsl();
    } else {
      results.wsl = { status: 'already_installed', detail: wslOk.detail };
    }

    const allOk = Object.values(results).every(
      (r: any) => r.status === 'already_installed' || r.success
    );

    return { success: allOk, results };
  }

  /**
   * Install Metasploit (launches the installer script)
   */
  async installMetasploit(): Promise<{ success: boolean; message: string }> {
    const scriptPath = path.join(paths.scripts, 'install-metasploit.ps1');
    if (fs.existsSync(scriptPath)) {
      try {
        execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 300000 });
        return { success: true, message: 'Metasploit installation initiated' };
      } catch (err: any) {
        return { success: false, message: `Failed: ${err.message}` };
      }
    }
    return { success: false, message: 'Installer script not found' };
  }

  /**
   * Install Evilginx2 (launches the installer script)
   */
  async installEvilginx(): Promise<{ success: boolean; message: string }> {
    const scriptPath = path.join(paths.scripts, 'install-evilginx.ps1');
    if (fs.existsSync(scriptPath)) {
      try {
        execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 300000 });
        return { success: true, message: 'Evilginx2 installation initiated' };
      } catch (err: any) {
        return { success: false, message: `Failed: ${err.message}` };
      }
    }
    return { success: false, message: 'Installer script not found' };
  }

  private async checkMetasploit(): Promise<DepDetail> {
    const msfPaths = [
      { p: 'C:\\metasploit\\MSP\\msfrpcd.exe', label: 'C:\\metasploit' },
      { p: `${process.env.ProgramFiles}\\Metasploit\\MSP\\msfrpcd.exe`, label: 'Program Files' },
      { p: `${process.env.LOCALAPPDATA}\\Metasploit\\msfrpcd.exe`, label: 'LocalAppData' },
    ];
    for (const entry of msfPaths) {
      if (fs.existsSync(entry.p)) {
        try {
          const ver = execSync(`"${entry.p}" --version 2>/dev/null || echo "unknown"`, { timeout: 3000, shell: true as any })
            .toString().trim();
          return { installed: true, path: entry.p, version: ver, detail: `Found at ${entry.label}` };
        } catch {
          return { installed: true, path: entry.p, detail: `Found at ${entry.label} (version unknown)` };
        }
      }
    }
    return { installed: false, detail: 'Metasploit not found in any standard path' };
  }

  private async checkEvilginx(): Promise<DepDetail> {
    // 1. Check Windows PATH
    try {
      const result = execSync('where evilginx2', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const p = result.toString().trim().split('\n')[0];
      return { installed: true, path: p, detail: 'Found on PATH' };
    } catch {
      // Not on PATH
    }

    // 2. Check known install paths
    const knownPaths = [
      `${process.env.LOCALAPPDATA}\\RedHawk\\tools\\evilginx2.exe`,
      `${process.env.USERPROFILE}\\.evilginx\\`,
      `${process.env.ProgramFiles}\\evilginx2\\evilginx2.exe`,
      `${process.env.LOCALAPPDATA}\\Programs\\evilginx2\\evilginx2.exe`,
      `C:\\cybersec stuff\\evilginx2\\evilginx2.exe`,
      `C:\\tools\\evilginx2\\evilginx2.exe`,
    ];
    for (const p of knownPaths) {
      if (fs.existsSync(p)) {
        return { installed: true, path: p, detail: 'Found in known location' };
      }
    }

    // 3. Check WSL with distro awareness
    const wslBin = `${process.env.SystemRoot}\\System32\\wsl.exe`;
    const wslAlt = `${process.env.SystemRoot}\\Sysnative\\wsl.exe`;
    const wslExe = fs.existsSync(wslBin) ? wslBin : fs.existsSync(wslAlt) ? wslAlt : null;
    if (wslExe) {
      try {
        // Try common distros
        for (const distro of ['Ubuntu', 'Debian', 'kali-linux']) {
          try {
            const installed = execSync(`wsl -d ${distro} which evilginx2 2>/dev/null || echo ""`, { timeout: 5000 })
              .toString().trim();
            if (installed) {
              return { installed: true, path: `WSL(${distro}):${installed}`, detail: `Installed in WSL ${distro}` };
            }
          } catch {
            continue;
          }
        }
        // Fallback: try default distro
        const result = execSync('wsl which evilginx2 2>/dev/null || echo ""', { timeout: 3000 }).toString().trim();
        if (result) return { installed: true, path: `WSL:${result}`, detail: 'Installed in WSL (default distro)' };
      } catch {
        // WSL exists but evilginx2 not found
      }
      return { installed: false, detail: 'WSL available but evilginx2 not found in any distro' };
    }

    return { installed: false, detail: 'Evilginx2 not found on PATH, in standard paths, or in WSL' };
  }

  private async checkMaigret(): Promise<DepDetail> {
    try {
      const result = execSync('python -m pip show maigret 2>&1', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const output = result.toString().trim();
      const versionMatch = output.match(/^Version:\s*(.+)$/m);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      return { installed: true, version, detail: 'Maigret Python package installed' };
    } catch {
      // Also check if maigret CLI is directly available
      try {
        const result = execSync('maigret --help 2>&1', { stdio: 'pipe', timeout: 3000, shell: true as any });
        return { installed: true, version: 'unknown', detail: 'maigret CLI found on PATH' };
      } catch {
        return { installed: false, detail: 'Maigret not installed. Run: pip install maigret' };
      }
    }
  }

  private async checkNodejs(): Promise<DepDetail> {
    try {
      const result = execSync('node --version', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const version = result.toString().trim();
      return { installed: true, version, detail: 'Node.js found on PATH' };
    } catch {
      // Check common install paths
      const nodePaths = [
        `${process.env.ProgramFiles}\\nodejs\\node.exe`,
        `${process.env.ProgramFiles(x86)}\\nodejs\\node.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\nodejs\\node.exe`,
      ];
      for (const p of nodePaths) {
        if (fs.existsSync(p)) {
          try {
            const ver = execSync(`"${p}" --version`, { timeout: 3000, shell: true as any }).toString().trim();
            return { installed: true, path: p, version: ver, detail: 'Found in Program Files' };
          } catch {
            return { installed: true, path: p, detail: 'Found in Program Files (version unknown)' };
          }
        }
      }
      return { installed: false, detail: 'Node.js not found. Download from https://nodejs.org' };
    }
  }

  private async installMaigret(): Promise<{ success: boolean; message: string }> {
    try {
      execSync('python -m pip install maigret --quiet', { timeout: 120000, shell: true as any });
      // Verify installation
      const check = await this.checkMaigret();
      if (check.installed) {
        return { success: true, message: `Maigret installed successfully (${check.version || 'unknown version'})` };
      }
      return { success: false, message: 'Maigret pip install completed but verification failed' };
    } catch (err: any) {
      return { success: false, message: `Failed to install maigret: ${err.message}` };
    }
  }

  private async installNodejs(): Promise<{ success: boolean; message: string }> {
    // Try to download and install Node.js LTS silently via choco or direct download
    try {
      // First try winget (built-in Windows package manager)
      execSync('winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements', { timeout: 120000, shell: true as any });
      return { success: true, message: 'Node.js LTS installed via winget' };
    } catch {
      try {
        // Fallback: try chocolatey
        execSync('choco install nodejs-lts -y', { timeout: 120000, shell: true as any });
        return { success: true, message: 'Node.js LTS installed via Chocolatey' };
      } catch {
        // Last resort: open download page
        const { shell } = require('electron');
        shell.openExternal('https://nodejs.org/en/download/');
        return { success: false, message: 'Could not auto-install Node.js. Download page opened.' };
      }
    }
  }

  private async installWsl(): Promise<{ success: boolean; message: string }> {
    try {
      execSync('wsl --install', { timeout: 300000, shell: true as any });
      return { success: true, message: 'WSL installation initiated. You may need to reboot.' };
    } catch (err: any) {
      return { success: false, message: `Failed to install WSL: ${err.message}. Run 'wsl --install' as Administrator.` };
    }
  }

  private async checkNmap(): Promise<DepDetail> {
    try {
      const result = execSync('where nmap', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const p = result.toString().trim().split('\n')[0];
      const ver = execSync('nmap --version 2>/dev/null | findstr /i "version"', { timeout: 3000, shell: true as any })
        .toString().trim().split('\n')[0] || 'unknown';
      return { installed: true, path: p, version: ver, detail: 'Found on PATH' };
    } catch {
      const nmapPaths = [
        'C:\\Program Files (x86)\\Nmap\\nmap.exe',
        'C:\\Program Files\\Nmap\\nmap.exe',
      ];
      for (const p of nmapPaths) {
        if (fs.existsSync(p)) return { installed: true, path: p, detail: 'Found in Program Files' };
      }
      return { installed: false, detail: 'Nmap not found' };
    }
  }

  private async checkPython(): Promise<DepDetail> {
    try {
      const result = execSync('python --version', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const ver = result.toString().trim();
      return { installed: true, version: ver, detail: 'Found on PATH' };
    } catch {
      if (fs.existsSync(paths.pythonExe)) {
        return { installed: true, path: paths.pythonExe, detail: 'Embedded Python' };
      }
      return { installed: false, detail: 'Python not found' };
    }
  }

  private async checkPip(): Promise<DepDetail> {
    try {
      const result = execSync('python -m pip --version', { stdio: 'pipe', timeout: 3000, shell: true as any });
      const ver = result.toString().trim();
      return { installed: true, version: ver, detail: 'pip available' };
    } catch {
      return { installed: false, detail: 'pip not available' };
    }
  }

  private async installNmap(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      // Launch the nmap installer silently if we have it bundled
      const installerPath = path.join(paths.resources, 'nmap-installer.exe');

      if (fs.existsSync(installerPath)) {
        try {
          execSync(`"${installerPath}" /S`, { timeout: 120000 });
          resolve({ success: true, message: 'Nmap installed successfully' });
        } catch (err: any) {
          resolve({ success: false, message: `Installation failed: ${err.message}` });
        }
      } else {
        // Open download page
        const { shell } = require('electron');
        shell.openExternal('https://nmap.org/download.html');
        resolve({
          success: false,
          message: 'Nmap installer not bundled. Download page opened.',
        });
      }
    });
  }

  private async installPython(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const downloadScript = path.join(paths.scripts, 'download-python.ps1');

      if (fs.existsSync(downloadScript)) {
        try {
          execSync(
            `powershell -ExecutionPolicy Bypass -File "${downloadScript}"`,
            { timeout: 120000 }
          );
          resolve({ success: true, message: 'Python embedded runtime installed' });
        } catch (err: any) {
          resolve({ success: false, message: `Failed: ${err.message}` });
        }
      } else {
        resolve({ success: false, message: 'Download script not found' });
      }
    });
  }

  private async installPipPackages(): Promise<{ success: boolean; message: string }> {
    const reqPath = path.join(paths.python, 'requirements.txt');

    if (!fs.existsSync(reqPath)) {
      return { success: false, message: 'requirements.txt not found' };
    }

    return new Promise((resolve) => {
      const proc = spawn('python', ['-m', 'pip', 'install', '-r', reqPath], {
        shell: false,
        timeout: 120000,
      });

      let output = '';
      proc.stdout.on('data', (d: Buffer) => (output += d.toString()));
      proc.stderr.on('data', (d: Buffer) => (output += d.toString()));

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          message: code === 0 ? 'Packages installed' : `Failed: ${output.slice(0, 200)}`,
        });
      });
    });
  }
}
