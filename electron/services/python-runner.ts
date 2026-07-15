import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { paths } from './paths';

export class PythonRunner {
  private pythonPath: string;
  private scriptsDir: string;

  constructor(userDataPath: string, _isPackaged: boolean) {
    this.scriptsDir = paths.pythonScripts;

    // Always use the system Python from PATH. The embedded python._embed at
    // paths.pythonExe is a minimal runtime without pip packages (maigret, etc.)
    // installed, so it would fail for any script that imports them.
    this.pythonPath = 'python';
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
      // Use shell: false to avoid path-with-spaces being split by cmd.exe
      // Set PYTHONIOENCODING so Python scripts use UTF-8 for stdout (fixes UnicodeEncodeError
      // on Windows cp1252 consoles when printing special chars like ♥ in banners).
      const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
      const proc = spawn(this.pythonPath, [scriptPath, ...args], {
        shell: false,
        env,
        // Note: no timeout here — the Python wrapper handles its own timeout internally.
        // Node.js spawn timeout would kill the process prematurely for long-running tools like maigret.
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
