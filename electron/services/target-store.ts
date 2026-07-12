import * as path from 'path';
import * as fs from 'fs';

interface ScanEntry {
  target: string;
  timestamp: string;
  results: any;
}

interface StoreData {
  currentTarget: string | null;
  scanHistory: ScanEntry[];
}

const DEFAULT_DATA: StoreData = { currentTarget: null, scanHistory: [] };

export class TargetStore {
  private dbPath: string;
  private data: StoreData;

  constructor(userDataPath: string) {
    this.dbPath = path.join(userDataPath, 'redhawk-db.json');
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
      console.error('TargetStore save failed:', err);
    }
  }

  async setTarget(target: string) {
    this.data.currentTarget = target;
    this.save();
    return { success: true, target };
  }

  async getTarget(): Promise<string | null> {
    return this.data.currentTarget;
  }

  async addScanResult(target: string, results: any) {
    const entry: ScanEntry = {
      target,
      timestamp: new Date().toISOString(),
      results,
    };
    this.data.scanHistory.unshift(entry);
    // Keep last 50 scans
    if (this.data.scanHistory.length > 50) {
      this.data.scanHistory = this.data.scanHistory.slice(0, 50);
    }
    this.save();
    return entry;
  }

  async getScanResults(target: string): Promise<ScanEntry | null> {
    return this.data.scanHistory.find((e) => e.target === target) || null;
  }

  async getHistory(): Promise<ScanEntry[]> {
    return this.data.scanHistory;
  }
}
