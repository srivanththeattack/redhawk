import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { paths } from './paths';

export class DependencyChecker {
  private userDataPath: string;

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath;
  }

  /**
   * Check all required dependencies
   */
  async checkAll(): Promise<{
    nmap: boolean;
    python: boolean;
    pip: boolean;
    metasploit: boolean;
    evilginx: boolean;
    all: boolean;
  }> {
    const nmap = await this.checkNmap();
    const python = await this.checkPython();
    const pip = await this.checkPip();
    const metasploit = await this.checkMetasploit();
    const evilginx = await this.checkEvilginx();

    return {
      nmap,
      python,
      pip,
      metasploit,
      evilginx,
      all: nmap && python && pip,
    };
  }

  /**
   * Install all missing dependencies
   */
  async installAll(): Promise<{ success: boolean; results: Record<string, any> }> {
    const results: Record<string, any> = {};

    const nmapOk = await this.checkNmap();
    if (!nmapOk) {
      results.nmap = await this.installNmap();
    } else {
      results.nmap = { status: 'already_installed' };
    }

    const pythonOk = await this.checkPython();
    if (!pythonOk) {
      results.python = await this.installPython();
    } else {
      results.python = { status: 'already_installed' };
    }

    const pipOk = await this.checkPip();
    if (!pipOk) {
      results.pip = await this.installPipPackages();
    } else {
      results.pip = { status: 'already_installed' };
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

  private async checkMetasploit(): Promise<boolean> {
    const paths = [
      'C:\\metasploit\\MSP\\msfrpcd.exe',
      `${process.env.ProgramFiles}\\Metasploit\\MSP\\msfrpcd.exe`,
    ];
    return paths.some((p) => fs.existsSync(p));
  }

  private async checkEvilginx(): Promise<boolean> {
    // 1. Check Windows PATH
    try {
      execSync('where evilginx2', { stdio: 'ignore', timeout: 3000, shell: true as any });
      return true;
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
    ];
    if (knownPaths.some((p) => fs.existsSync(p))) return true;

    // 3. Check WSL (only if wsl.exe actually exists)
    const wslPaths = [
      `${process.env.SystemRoot}\\System32\\wsl.exe`,
      `${process.env.SystemRoot}\\Sysnative\\wsl.exe`,
    ];
    if (wslPaths.some((p) => fs.existsSync(p))) {
      try {
        const wslCheck = execSync('wsl which evilginx2 2>/dev/null || echo ""', { timeout: 3000 }).toString().trim();
        if (wslCheck) return true;
      } catch {
        // wsl exists but not evilginx2
      }
    }

    return false;
  }

  private async checkNmap(): Promise<boolean> {
    try {
      execSync('where nmap', { stdio: 'ignore', shell: true as any });
      return true;
    } catch {
      // Check common install paths
      const nmapPaths = [
        'C:\\Program Files (x86)\\Nmap\\nmap.exe',
        'C:\\Program Files\\Nmap\\nmap.exe',
      ];
      return nmapPaths.some((p) => fs.existsSync(p));
    }
  }

  private async checkPython(): Promise<boolean> {
    try {
      execSync('python --version', { stdio: 'ignore', shell: true as any });
      return true;
    } catch {
      // Check embedded python
      return fs.existsSync(paths.pythonExe);
    }
  }

  private async checkPip(): Promise<boolean> {
    try {
      execSync('python -m pip --version', { stdio: 'ignore', shell: true as any });
      return true;
    } catch {
      return false;
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
