import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class PythonRunner {
  private pythonPath: string;
  private scriptsDir: string;

  constructor(userDataPath: string, isPackaged: boolean) {
    if (isPackaged) {
      // In packaged app, python is bundled alongside the app
      this.pythonPath = path.join(process.resourcesPath, 'python', 'python._embed', 'python.exe');
      this.scriptsDir = path.join(process.resourcesPath, 'python', 'scripts');
    } else {
      // In dev mode, look relative to project root
      this.pythonPath = path.join(__dirname, '..', '..', 'python', 'python._embed', 'python.exe');
      this.scriptsDir = path.join(__dirname, '..', '..', 'python', 'scripts');
    }

    // Fallback to system python if embedded not found
    if (!fs.existsSync(this.pythonPath)) {
      this.pythonPath = 'python';
    }
  }

  /**
   * Run a Python script and return parsed JSON output
   */
  async runScript(scriptName: string, args: string[] = []): Promise<any> {
    const scriptPath = path.join(this.scriptsDir, scriptName);

    if (!fs.existsSync(scriptPath)) {
      return { error: `Script not found: ${scriptName}` };
    }

    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, [scriptPath, ...args], {
        shell: true,
        timeout: 30000, // 30s timeout per script
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        // Try to parse JSON output
        const trimmed = stdout.trim();

        // Find JSON in output (in case there's debug logging before it)
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            resolve(JSON.parse(jsonMatch[0]));
          } catch {
            resolve({ raw: trimmed, error: stderr.trim() || null });
          }
        } else if (trimmed) {
          resolve({ raw: trimmed, error: stderr.trim() || null });
        } else {
          resolve({ error: stderr.trim() || 'No output from script' });
        }
      });

      proc.on('error', (err) => {
        resolve({ error: `Failed to run script: ${err.message}` });
      });
    });
  }

  /**
   * Install pip packages
   */
  async installPackages(requirementsPath: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, [
        '-m',
        'pip',
        'install',
        '-r',
        requirementsPath,
      ]);

      let output = '';

      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output,
        });
      });

      proc.on('error', (err) => {
        resolve({ success: false, output: err.message });
      });
    });
  }
}
