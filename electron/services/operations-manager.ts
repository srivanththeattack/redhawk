import * as path from 'path';
import * as fs from 'fs';

export interface Operation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  targets: string[];
  notes: string;
  status: 'active' | 'archived';
}

interface StoreData {
  operations: Operation[];
  currentOperationId: string | null;
}

const DEFAULT_DATA: StoreData = { operations: [], currentOperationId: null };

export class OperationsManager {
  private dbPath: string;
  private data: StoreData;

  constructor(userDataPath: string) {
    this.dbPath = path.join(userDataPath, 'redhawk-operations.json');
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // corrupted file, reset
    }
    return { ...DEFAULT_DATA };
  }

  private save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('OperationsManager save failed:', err);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async listOperations(): Promise<Operation[]> {
    return this.data.operations;
  }

  async getCurrentOperation(): Promise<Operation | null> {
    if (!this.data.currentOperationId) return null;
    return this.data.operations.find((o) => o.id === this.data.currentOperationId) || null;
  }

  async getOperation(id: string): Promise<Operation | null> {
    return this.data.operations.find((o) => o.id === id) || null;
  }

  async createOperation(name: string, description: string): Promise<Operation> {
    const op: Operation = {
      id: this.generateId(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targets: [],
      notes: '',
      status: 'active',
    };
    this.data.operations.push(op);
    this.data.currentOperationId = op.id;
    this.save();
    return op;
  }

  async setCurrentOperation(id: string): Promise<void> {
    if (this.data.operations.find((o) => o.id === id)) {
      this.data.currentOperationId = id;
      this.save();
    }
  }

  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation | null> {
    const idx = this.data.operations.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    this.data.operations[idx] = {
      ...this.data.operations[idx],
      ...updates,
      id, // never change id
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.operations[idx];
  }

  async addTargetToOperation(id: string, target: string): Promise<void> {
    const op = this.data.operations.find((o) => o.id === id);
    if (!op) return;
    if (!op.targets.includes(target)) {
      op.targets.push(target);
      op.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  async deleteOperation(id: string): Promise<void> {
    this.data.operations = this.data.operations.filter((o) => o.id !== id);
    if (this.data.currentOperationId === id) {
      this.data.currentOperationId = this.data.operations[0]?.id || null;
    }
    this.save();
  }

  async archiveOperation(id: string): Promise<void> {
    const op = this.data.operations.find((o) => o.id === id);
    if (op) {
      op.status = 'archived';
      op.updatedAt = new Date().toISOString();
      this.save();
    }
  }
}
