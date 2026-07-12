import * as path from 'path';
import * as fs from 'fs';

const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

interface ScanEntry {
  target: string;
  timestamp: string;
  results: any;
}

interface StoreData {
  currentTarget: string | null;
  scanHistory: ScanEntry[];
}

export class TargetStore {
  private db: any;
  private initialized = false;

  constructor(userDataPath: string) {
    const dbPath = path.join(userDataPath, 'redhawk-db.json');
    const adapter = new JSONFile(dbPath);
    this.db = new Low(adapter, { currentTarget: null, scanHistory: [] } as StoreData);
  }

  private async ensureInit() {
    if (!this.initialized) {
      await this.db.read();
      this.db.data ||= { currentTarget: null, scanHistory: [] };
      this.initialized = true;
    }
  }

  async setTarget(target: string) {
    await this.ensureInit();
    this.db.data.currentTarget = target;
    await this.db.write();
    return { success: true, target };
  }

  async getTarget(): Promise<string | null> {
    await this.ensureInit();
    return this.db.data.currentTarget;
  }

  async addScanResult(target: string, results: any) {
    await this.ensureInit();
    const entry: ScanEntry = {
      target,
      timestamp: new Date().toISOString(),
      results,
    };
    this.db.data.scanHistory.unshift(entry);
    // Keep last 50 scans
    if (this.db.data.scanHistory.length > 50) {
      this.db.data.scanHistory = this.db.data.scanHistory.slice(0, 50);
    }
    await this.db.write();
    return entry;
  }

  async getScanResults(target: string): Promise<ScanEntry | null> {
    await this.ensureInit();
    return (
      this.db.data.scanHistory.find((e: ScanEntry) => e.target === target) || null
    );
  }

  async getHistory(): Promise<ScanEntry[]> {
    await this.ensureInit();
    return this.db.data.scanHistory;
  }
}
