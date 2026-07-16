import { spawn, IPty } from 'node-pty';
import { BrowserWindow } from 'electron';
import {
  isWindows,
  getDefaultTerminalShell,
  getTerminalShellArgs,
  getTerminalEnvVars,
  getTerminalCwd,
} from './platform';

/**
 * Manages a single terminal pty instance for the integrated terminal.
 * Windows: wsl.exe | macOS/Linux: /bin/bash (or $SHELL)
 */
export class TerminalManager {
  private pty: IPty | null = null;

  /** Create a new terminal pty session. Returns false if one is already running. */
  create(win: BrowserWindow, cols: number, rows: number): boolean {
    if (this.pty) return false;

    try {
      const shell = getDefaultTerminalShell();
      const shellArgs = getTerminalShellArgs();
      const cwd = getTerminalCwd();
      const env = getTerminalEnvVars();

      this.pty = spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
      });

      this.pty.onData((data: string) => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal-data', data);
        }
      });

      this.pty.onExit(() => {
        this.pty = null;
        if (!win.isDestroyed()) {
          win.webContents.send('terminal-exit');
        }
      });

      return true;
    } catch (err) {
      console.error('Terminal spawn failed:', err);
      this.pty = null;
      return false;
    }
  }

  /** Write data to the pty (user input). */
  write(data: string): void {
    if (this.pty) {
      this.pty.write(data);
    }
  }

  /** Resize the pty dimensions. */
  resize(cols: number, rows: number): void {
    if (this.pty) {
      try {
        this.pty.resize(cols, rows);
      } catch {
        // ignore resize errors on dead pty
      }
    }
  }

  /** Kill the pty session. */
  kill(): void {
    if (this.pty) {
      try {
        this.pty.kill();
      } catch {
        // ignore
      }
      this.pty = null;
    }
  }

  get isAlive(): boolean {
    return this.pty !== null;
  }
}
