/**
 * RedHawk — Collaboration Hub
 *
 * Provides shared ops state, live activity feed, and target coordination
 * for red team members. Runs as a set of REST endpoints mounted on the
 * existing C2 HTTP server.
 *
 * Data is persisted to disk so it survives server restarts.
 */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

// ── Types ──

export interface CollabMember {
  id: string;
  name: string;
  lastSeen: string;
  currentTarget?: string;
  currentTab?: string;
  color: string;
}

export interface CollabActivity {
  id: string;
  memberId: string;
  memberName: string;
  type: 'scan' | 'exploit' | 'phish' | 'payload' | 'c2' | 'exfil' | 'note' | 'finding' | 'target';
  label: string;
  detail: string;
  target?: string;
  timestamp: string;
}

export interface CollabFinding {
  id: string;
  target: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'confirmed' | 'dismissed';
}

export interface CollabNote {
  id: string;
  target: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface CollabTodo {
  id: string;
  text: string;
  done: boolean;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
}

export interface CollabTarget {
  target: string;
  status: 'pending' | 'in_progress' | 'complete';
  checkedOutBy?: string;
  checkedOutAt?: string;
  lastUpdated: string;
  notes: string;
}

const MEMBER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export class CollabHub extends EventEmitter {
  private dataDir: string;
  private members: Map<string, CollabMember> = new Map();
  private activities: CollabActivity[] = [];
  private findings: CollabFinding[] = [];
  private notes: CollabNote[] = [];
  private todos: CollabTodo[] = [];
  private targets: Map<string, CollabTarget> = new Map();

  constructor(dataDir: string) {
    super();
    this.dataDir = path.join(dataDir, 'collab');
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  private fileFor(name: string) {
    return path.join(this.dataDir, `${name}.json`);
  }

  private load() {
    for (const key of ['activities', 'findings', 'notes', 'todos', 'targets', 'members']) {
      const fp = this.fileFor(key);
      if (fs.existsSync(fp)) {
        try {
          const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
          if (key === 'activities') this.activities = data;
          else if (key === 'findings') this.findings = data;
          else if (key === 'notes') this.notes = data;
          else if (key === 'todos') this.todos = data;
          else if (key === 'targets') this.targets = new Map(data);
          else if (key === 'members') this.members = new Map(data);
        } catch { /* skip corrupt files */ }
      }
    }
  }

  private save() {
    const entries: [string, any][] = [
      ['activities', this.activities],
      ['findings', this.findings],
      ['notes', this.notes],
      ['todos', this.todos],
      ['targets', [...this.targets.entries()]],
      ['members', [...this.members.entries()]],
    ];
    for (const [key, data] of entries) {
      fs.writeFileSync(this.fileFor(key), JSON.stringify(data, null, 2));
    }
  }

  // ── Member Management ──

  heartbeat(memberId: string, name: string, target?: string, tab?: string): CollabMember {
    const now = new Date().toISOString();
    let member = this.members.get(memberId);
    if (!member) {
      const colorIdx = this.members.size % MEMBER_COLORS.length;
      member = { id: memberId, name, lastSeen: now, color: MEMBER_COLORS[colorIdx] };
      this.members.set(memberId, member);
    }
    member.lastSeen = now;
    member.name = name;
    if (target !== undefined) member.currentTarget = target;
    if (tab !== undefined) member.currentTab = tab;
    this.save();
    this.emit('memberUpdate', member);
    return member;
  }

  getMembers(): CollabMember[] {
    // Filter out members not seen in 5 minutes
    const cutoff = Date.now() - 5 * 60 * 1000;
    return Array.from(this.members.values())
      .filter((m) => new Date(m.lastSeen).getTime() > cutoff);
  }

  // ── Activity Feed ──

  addActivity(entry: Omit<CollabActivity, 'id' | 'timestamp'>): CollabActivity {
    const activity: CollabActivity = {
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.activities.unshift(activity);
    if (this.activities.length > 500) this.activities = this.activities.slice(0, 500);
    this.save();
    this.emit('newActivity', activity);
    return activity;
  }

  getActivities(limit = 50): CollabActivity[] {
    return this.activities.slice(0, limit);
  }

  // ── Findings ──

  addFinding(finding: Omit<CollabFinding, 'id' | 'createdAt'>): CollabFinding {
    const f: CollabFinding = {
      ...finding,
      id: `find_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.findings.push(f);
    this.save();
    this.emit('newFinding', f);
    return f;
  }

  updateFinding(id: string, updates: Partial<CollabFinding>): CollabFinding | null {
    const idx = this.findings.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.findings[idx] = { ...this.findings[idx], ...updates };
    this.save();
    this.emit('findingUpdate', this.findings[idx]);
    return this.findings[idx];
  }

  getFindings(target?: string): CollabFinding[] {
    if (target) return this.findings.filter((f) => f.target === target);
    return [...this.findings];
  }

  deleteFinding(id: string): boolean {
    const before = this.findings.length;
    this.findings = this.findings.filter((f) => f.id !== id);
    if (this.findings.length !== before) { this.save(); return true; }
    return false;
  }

  // ── Notes ──

  addNote(note: Omit<CollabNote, 'id' | 'createdAt'>): CollabNote {
    const n: CollabNote = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.notes.push(n);
    this.save();
    this.emit('newNote', n);
    return n;
  }

  getNotes(target?: string): CollabNote[] {
    if (target) return this.notes.filter((n) => n.target === target);
    return [...this.notes];
  }

  deleteNote(id: string): boolean {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length !== before) { this.save(); return true; }
    return false;
  }

  // ── Todos ──

  addTodo(todo: Omit<CollabTodo, 'id' | 'createdAt'>): CollabTodo {
    const t: CollabTodo = {
      ...todo,
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(t);
    this.save();
    this.emit('newTodo', t);
    return t;
  }

  updateTodo(id: string, updates: Partial<CollabTodo>): CollabTodo | null {
    const idx = this.todos.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.todos[idx] = { ...this.todos[idx], ...updates };
    this.save();
    this.emit('todoUpdate', this.todos[idx]);
    return this.todos[idx];
  }

  getTodos(): CollabTodo[] {
    return [...this.todos];
  }

  deleteTodo(id: string): boolean {
    const before = this.todos.length;
    this.todos = this.todos.filter((t) => t.id !== id);
    if (this.todos.length !== before) { this.save(); return true; }
    return false;
  }

  // ── Target Coordination ──

  getTargets(): CollabTarget[] {
    return Array.from(this.targets.values());
  }

  checkInTarget(target: string, memberId: string, memberName: string): { success: boolean; target: CollabTarget; message: string } {
    const existing = this.targets.get(target);
    const now = new Date().toISOString();
    if (existing && existing.checkedOutBy && existing.checkedOutBy !== memberId) {
      return {
        success: false,
        target: existing,
        message: `Target "${target}" is already checked out by ${existing.checkedOutBy}`,
      };
    }
    const t: CollabTarget = {
      target,
      status: 'in_progress',
      checkedOutBy: memberId,
      checkedOutAt: now,
      lastUpdated: now,
      notes: existing?.notes || '',
    };
    this.targets.set(target, t);
    this.save();
    this.emit('targetUpdate', t);
    this.addActivity({ memberId, memberName, type: 'target', label: `Checked out target`, detail: target, target });
    return { success: true, target: t, message: `Checked out ${target}` };
  }

  checkOutTarget(target: string, memberId: string, memberName: string): CollabTarget | null {
    const existing = this.targets.get(target);
    if (existing) {
      existing.checkedOutBy = undefined;
      existing.checkedOutAt = undefined;
      existing.lastUpdated = new Date().toISOString();
      this.save();
      this.emit('targetUpdate', existing);
      this.addActivity({ memberId, memberName, type: 'target', label: `Released target`, detail: target, target });
    }
    return existing || null;
  }

  updateTarget(target: string, updates: Partial<CollabTarget>): CollabTarget | null {
    const existing = this.targets.get(target);
    if (!existing) return null;
    Object.assign(existing, updates, { lastUpdated: new Date().toISOString() });
    this.save();
    this.emit('targetUpdate', existing);
    return existing;
  }

  // ── REST API handler ──
  // Returns a function that handles /api/collab/* requests

  handleApi(pathname: string, body: any, method: string, remoteAddress?: string): { status: number; data: any } {
    const respond = (status: number, data: any) => ({ status, data });

    try {
      // ── Members ──
      if (pathname === '/api/collab/members' && method === 'GET') {
        return respond(200, this.getMembers());
      }
      if (pathname === '/api/collab/heartbeat' && method === 'POST') {
        const { memberId, name, currentTarget, currentTab } = body || {};
        if (!memberId || !name) return respond(400, { error: 'memberId and name required' });
        const member = this.heartbeat(memberId, name, currentTarget, currentTab);
        return respond(200, member);
      }

      // ── Activity ──
      if (pathname === '/api/collab/activity' && method === 'GET') {
        return respond(200, this.getActivities(body?.limit || 50));
      }
      if (pathname === '/api/collab/activity' && method === 'POST') {
        const { memberId, memberName, type, label, detail, target } = body || {};
        if (!memberId || !type || !label) return respond(400, { error: 'memberId, type, label required' });
        const activity = this.addActivity({ memberId, memberName, type, label, detail, target });
        return respond(200, activity);
      }

      // ── Findings ──
      if (pathname === '/api/collab/findings' && method === 'GET') {
        return respond(200, this.getFindings(body?.target));
      }
      if (pathname === '/api/collab/findings' && method === 'POST') {
        const { target, title, severity, description, createdBy, assignedTo } = body || {};
        if (!target || !title || !createdBy) return respond(400, { error: 'target, title, createdBy required' });
        const finding = this.addFinding({ target, title, severity: severity || 'medium', description: description || '', createdBy, assignedTo, status: 'open' });
        return respond(200, finding);
      }
      const findingMatch = pathname.match(/^\/api\/collab\/findings\/(.+)$/);
      if (findingMatch) {
        const fid = findingMatch[1];
        if (method === 'PATCH') {
          const updated = this.updateFinding(fid, body);
          if (!updated) return respond(404, { error: 'finding not found' });
          return respond(200, updated);
        }
        if (method === 'DELETE') {
          return respond(this.deleteFinding(fid) ? 200 : 404, {});
        }
      }

      // ── Notes ──
      if (pathname === '/api/collab/notes' && method === 'GET') {
        return respond(200, this.getNotes(body?.target));
      }
      if (pathname === '/api/collab/notes' && method === 'POST') {
        const { target, content, createdBy } = body || {};
        if (!target || !content || !createdBy) return respond(400, { error: 'target, content, createdBy required' });
        const note = this.addNote({ target, content, createdBy });
        return respond(200, note);
      }
      const noteMatch = pathname.match(/^\/api\/collab\/notes\/(.+)$/);
      if (noteMatch) {
        if (method === 'DELETE') {
          return respond(this.deleteNote(noteMatch[1]) ? 200 : 404, {});
        }
      }

      // ── Todos ──
      if (pathname === '/api/collab/todos' && method === 'GET') {
        return respond(200, this.getTodos());
      }
      if (pathname === '/api/collab/todos' && method === 'POST') {
        const { text, createdBy, assignedTo } = body || {};
        if (!text || !createdBy) return respond(400, { error: 'text, createdBy required' });
        const todo = this.addTodo({ text, done: false, createdBy, assignedTo });
        return respond(200, todo);
      }
      const todoMatch = pathname.match(/^\/api\/collab\/todos\/(.+)$/);
      if (todoMatch) {
        const tid = todoMatch[1];
        if (method === 'PATCH') {
          const updated = this.updateTodo(tid, body);
          if (!updated) return respond(404, { error: 'todo not found' });
          return respond(200, updated);
        }
        if (method === 'DELETE') {
          return respond(this.deleteTodo(tid) ? 200 : 404, {});
        }
      }

      // ── Targets ──
      if (pathname === '/api/collab/targets' && method === 'GET') {
        return respond(200, this.getTargets());
      }
      if (pathname === '/api/collab/targets/checkin' && method === 'POST') {
        const { target, memberId, memberName } = body || {};
        if (!target || !memberId || !memberName) return respond(400, { error: 'target, memberId, memberName required' });
        return respond(200, this.checkInTarget(target, memberId, memberName));
      }
      if (pathname === '/api/collab/targets/checkout' && method === 'POST') {
        const { target, memberId, memberName } = body || {};
        if (!target || !memberId || !memberName) return respond(400, { error: 'target, memberId, memberName required' });
        return respond(200, this.checkOutTarget(target, memberId, memberName) || {});
      }
      const targetMatch = pathname.match(/^\/api\/collab\/targets\/(.+)$/);
      if (targetMatch) {
        if (method === 'PATCH') {
          const updated = this.updateTarget(targetMatch[1], body);
          if (!updated) return respond(404, { error: 'target not found' });
          return respond(200, updated);
        }
      }

      return respond(404, { error: 'unknown collab endpoint' });
    } catch (err: any) {
      return respond(500, { error: err.message });
    }
  }
}
