import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ToolRunner } from './services/tool-runner';
import { NmapParser } from './services/nmap-parser';
import { PythonRunner } from './services/python-runner';
import { DependencyChecker } from './services/dependency';
import { TargetStore } from './services/target-store';

let mainWindow: BrowserWindow | null = null;
let toolRunner: ToolRunner;
let nmapParser: NmapParser;
let pythonRunner: PythonRunner;
let depChecker: DependencyChecker;
let targetStore: TargetStore;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'RedHawk',
    backgroundColor: '#070b17',
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // ── Target Management ──
  ipcMain.handle('set-target', async (_event, target: string) => {
    return targetStore.setTarget(target);
  });

  ipcMain.handle('get-target', async () => {
    return targetStore.getTarget();
  });

  // ── Dependency Check ──
  ipcMain.handle('check-deps', async () => {
    return depChecker.checkAll();
  });

  ipcMain.handle('install-deps', async (_event, confirm: boolean) => {
    if (!confirm) return { success: false, message: 'User cancelled' };
    return depChecker.installAll();
  });

  // ── Recon Tools ──
  ipcMain.handle('run-whois', async (_event, domain: string) => {
    const result = await pythonRunner.runScript('whois_lookup.py', [domain]);
    return result;
  });

  ipcMain.handle('run-dns-enum', async (_event, domain: string) => {
    const result = await pythonRunner.runScript('dns_enum.py', [domain]);
    return result;
  });

  ipcMain.handle('run-subdomain-enum', async (_event, domain: string) => {
    const result = await pythonRunner.runScript('subdomain_enum.py', [domain]);
    return result;
  });

  ipcMain.handle('run-email-osint', async (_event, domain: string) => {
    const result = await pythonRunner.runScript('email_osint.py', [domain]);
    return result;
  });

  ipcMain.handle('run-nmap-scan', async (_event, ip: string, flags: string) => {
    const rawXml = await toolRunner.runNmap(ip, flags);
    const parsed = await nmapParser.parse(rawXml);
    return parsed;
  });

  // ── Quick Scan (does all basic recon at once) ──
  ipcMain.handle('run-quick-scan', async (_event, target: string) => {
    const isDomain = target.includes('.') && !target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    const results: any = { target, timestamp: new Date().toISOString() };

    // Stream status updates
    const sendStatus = (msg: string) => {
      mainWindow?.webContents.send('scan-status', { target, message: msg });
    };

    try {
      if (isDomain) {
        sendStatus('Running WHOIS lookup...');
        results.whois = await pythonRunner.runScript('whois_lookup.py', [target]);

        sendStatus('Enumerating DNS records...');
        results.dns = await pythonRunner.runScript('dns_enum.py', [target]);

        sendStatus('Finding subdomains...');
        results.subdomains = await pythonRunner.runScript('subdomain_enum.py', [target]);

        sendStatus('Looking up emails...');
        results.emails = await pythonRunner.runScript('email_osint.py', [target]);
      }

      // Always try a basic nmap scan
      sendStatus('Running port scan (top 1000 ports)...');
      const nmapResult = await toolRunner.runNmap(
        isDomain ? target : target,
        '-sS -T4 --top-ports 1000'
      );
      results.nmap = await nmapParser.parse(nmapResult);

    } catch (err: any) {
      results.error = err.message;
    }

    // Save to store
    targetStore.addScanResult(target, results);
    mainWindow?.webContents.send('scan-complete', results);
    return results;
  });

  // ── Results ──
  ipcMain.handle('get-scan-results', async (_event, target: string) => {
    return targetStore.getScanResults(target);
  });

  ipcMain.handle('get-scan-history', async () => {
    return targetStore.getHistory();
  });

  // ── Live output ──
  toolRunner.onOutput((data: string) => {
    mainWindow?.webContents.send('scan-output', data);
  });
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');

  toolRunner = new ToolRunner();
  nmapParser = new NmapParser();
  pythonRunner = new PythonRunner(userDataPath, app.isPackaged);
  depChecker = new DependencyChecker(userDataPath);
  targetStore = new TargetStore(userDataPath);

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
