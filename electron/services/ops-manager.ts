/**
 * Ops Dashboard Manager — notes, findings, todos, screenshots, timeline
 */

import * as fs from 'fs';
import * as path from 'path';

interface StoredFinding {
  target: string;
  title: string;
  severity: string;
  description: string;
  timestamp: string;
}

interface StoredTodo {
  text: string;
  done: boolean;
}

export class OpsDashboardManager {
  private dataDir: string;
  private notesDir: string;
  private screenshotsDir: string;

  constructor(userDataPath: string) {
    this.dataDir = path.join(userDataPath, 'ops-dashboard');
    this.notesDir = path.join(this.dataDir, 'notes');
    this.screenshotsDir = path.join(this.dataDir, 'screenshots');
    for (const dir of [this.dataDir, this.notesDir, this.screenshotsDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ── Notes ──

  saveNote(target: string, note: string): boolean {
    try {
      const filePath = path.join(this.notesDir, `${sanitize(target)}.json`);
      const notes = this.getNotes(target);
      notes.push(`${new Date().toISOString()} — ${note}`);
      fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
      return true;
    } catch { return false; }
  }

  getNotes(target: string): string[] {
    try {
      const filePath = path.join(this.notesDir, `${sanitize(target)}.json`);
      if (!fs.existsSync(filePath)) return [];
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch { return []; }
  }

  // ── Findings ──

  private getFindingsFilePath(): string {
    return path.join(this.dataDir, 'findings.json');
  }

  getFindings(): StoredFinding[] {
    try {
      const fp = this.getFindingsFilePath();
      if (!fs.existsSync(fp)) return [];
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch { return []; }
  }

  saveFinding(finding: { target: string; title: string; severity: string; description: string }): boolean {
    try {
      const findings = this.getFindings();
      findings.push({ ...finding, timestamp: new Date().toISOString() });
      fs.writeFileSync(this.getFindingsFilePath(), JSON.stringify(findings, null, 2));
      return true;
    } catch { return false; }
  }

  // ── Todos ──

  private getTodosFilePath(): string {
    return path.join(this.dataDir, 'todos.json');
  }

  getTodos(): StoredTodo[] {
    try {
      const fp = this.getTodosFilePath();
      if (!fs.existsSync(fp)) return [];
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch { return []; }
  }

  saveTodo(todo: { text: string; done: boolean }): boolean {
    try {
      const todos = this.getTodos();
      todos.push(todo);
      fs.writeFileSync(this.getTodosFilePath(), JSON.stringify(todos, null, 2));
      return true;
    } catch { return false; }
  }

  toggleTodo(index: number): boolean {
    try {
      const todos = this.getTodos();
      if (index < 0 || index >= todos.length) return false;
      todos[index].done = !todos[index].done;
      fs.writeFileSync(this.getTodosFilePath(), JSON.stringify(todos, null, 2));
      return true;
    } catch { return false; }
  }

  deleteTodo(index: number): boolean {
    try {
      const todos = this.getTodos();
      if (index < 0 || index >= todos.length) return false;
      todos.splice(index, 1);
      fs.writeFileSync(this.getTodosFilePath(), JSON.stringify(todos, null, 2));
      return true;
    } catch { return false; }
  }

  // ── Screenshots ──

  saveScreenshot(name: string, dataUrl: string): { success: boolean; filePath?: string } {
    try {
      const timestamp = Date.now();
      const ext = 'png';
      const filename = `${sanitize(name)}_${timestamp}.${ext}`;
      const filePath = path.join(this.screenshotsDir, filename);

      // dataUrl format: data:image/png;base64,...
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false };
    }
  }

  getScreenshots(): { name: string; path: string; timestamp: string }[] {
    try {
      if (!fs.existsSync(this.screenshotsDir)) return [];
      const files = fs.readdirSync(this.screenshotsDir).filter(f => f.endsWith('.png'));
      return files.map(f => {
        const stat = fs.statSync(path.join(this.screenshotsDir, f));
        return {
          name: f.replace(/_\d+\.png$/, ''),
          path: path.join(this.screenshotsDir, f),
          timestamp: stat.mtime.toISOString(),
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch { return []; }
  }

  // ── Timeline ──
  // Reuses the activity log from the main process
  getTimeline(activity: any[]): any[] {
    return (activity || []).sort((a: any, b: any) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}
