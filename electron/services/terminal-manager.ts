import { spawn, IPty } from 'node-pty';
import { BrowserWindow } from 'electron';

/**
 * Manages a single WSL pty instance for the integrated terminal.
 * Only one terminal session at a time (matching VS Code's single-instance style).
 */
export class TerminalManager {
  private pty: IPty | null = null;

  /** Create a new WSL pty session. Returns false if one is already running. */
  create(win: BrowserWindow, cols: number, rows: number): boolean {
    if (this.pty) return false;

    try {
      this.pty = spawn('wsl.exe', [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: process.env.USERPROFILE,
        env: { ...process.env, TERM: 'xterm-256color' },
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
