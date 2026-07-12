import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

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
    all: boolean;
  }> {
    const nmap = await this.checkNmap();
    const python = await this.checkPython();
    const pip = await this.checkPip();

    return {
      nmap,
      python,
      pip,
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

  private async checkNmap(): Promise<boolean> {
    try {
      execSync('where nmap', { stdio: 'ignore' });
      return true;
    } catch {
      // Check common install paths
      const paths = [
        'C:\\Program Files (x86)\\Nmap\\nmap.exe',
        'C:\\Program Files\\Nmap\\nmap.exe',
      ];
      return paths.some((p) => fs.existsSync(p));
    }
  }

  private async checkPython(): Promise<boolean> {
    try {
      execSync('python --version', { stdio: 'ignore' });
      return true;
    } catch {
      // Check embedded python
      const embedPath = path.join(
        __dirname,
        '..',
        '..',
        'python',
        'python._embed',
        'python.exe'
      );
      return fs.existsSync(embedPath);
    }
  }

  private async checkPip(): Promise<boolean> {
    try {
      execSync('python -m pip --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async installNmap(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      // Launch the nmap installer silently if we have it bundled
      const installerPath = path.join(
        __dirname,
        '..',
        '..',
        'resources',
        'nmap-installer.exe'
      );

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
      const downloadScript = path.join(
        __dirname,
        '..',
        '..',
        'scripts',
        'download-python.ps1'
      );

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
    const reqPath = path.join(__dirname, '..', '..', 'python', 'requirements.txt');

    if (!fs.existsSync(reqPath)) {
      return { success: false, message: 'requirements.txt not found' };
    }

    return new Promise((resolve) => {
      const proc = spawn('python', ['-m', 'pip', 'install', '-r', reqPath], {
        shell: true,
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
