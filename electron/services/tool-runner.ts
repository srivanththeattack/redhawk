import { spawn, execSync } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

export class ToolRunner extends EventEmitter {
  private nmapPath: string;

  constructor() {
    super();
    this.nmapPath = 'nmap';
  }

  /**
   * Find nmap executable (check common locations on Windows)
   */
  async findNmap(): Promise<string | null> {
    const possiblePaths = [
      'nmap',
      'C:\\Program Files (x86)\\Nmap\\nmap.exe',
      'C:\\Program Files\\Nmap\\nmap.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Nmap', 'nmap.exe'),
    ];

    for (const p of possiblePaths) {
      try {
        execSync(`"${p}" --version`, { stdio: 'ignore' });
        this.nmapPath = p;
        return p;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Run nmap scan and return raw XML output
   */
  async runNmap(target: string, flags: string = '-sS -T4 --top-ports 1000'): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [...flags.split(' ').filter(Boolean), '-oX', '-', target];
      const proc = spawn(this.nmapPath, args, { shell: true });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        this.emit('output', text);
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 || code === null) {
          resolve(stdout);
        } else {
          // nmap returns non-zero sometimes even on success (e.g. no open ports)
          // Only reject if we got no output at all
          if (!stdout.trim()) {
            reject(new Error(`nmap failed (code ${code}): ${stderr}`));
          } else {
            resolve(stdout);
          }
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn nmap: ${err.message}`));
      });
    });
  }

  /**
   * Subscribe to real-time output
   */
  onOutput(callback: (data: string) => void) {
    this.on('output', callback);
  }

  /**
   * Check if a tool is available
   */
  async isToolAvailable(tool: string): Promise<boolean> {
    try {
      execSync(`where ${tool}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
