import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ToolRunner } from './services/tool-runner';
import { NmapParser } from './services/nmap-parser';
import { PythonRunner } from './services/python-runner';
import { DependencyChecker } from './services/dependency';
import { TargetStore } from './services/target-store';
import { MsfRpcClient } from './services/msf-rpc-client';
import { EvilginxManager } from './services/evilginx-manager';

let mainWindow: BrowserWindow | null = null;
let toolRunner: ToolRunner;
let nmapParser: NmapParser;
let pythonRunner: PythonRunner;
let depChecker: DependencyChecker;
let targetStore: TargetStore;
let msfClient: MsfRpcClient;
let evilginxManager: EvilginxManager;

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
    return pythonRunner.runScript('whois_lookup.py', [domain]);
  });

  ipcMain.handle('run-dns-enum', async (_event, domain: string) => {
    return pythonRunner.runScript('dns_enum.py', [domain]);
  });

  ipcMain.handle('run-subdomain-enum', async (_event, domain: string) => {
    return pythonRunner.runScript('subdomain_enum.py', [domain]);
  });

  ipcMain.handle('run-email-osint', async (_event, domain: string) => {
    return pythonRunner.runScript('email_osint.py', [domain]);
  });

  ipcMain.handle('run-nmap-scan', async (_event, ip: string, flags: string) => {
    const rawXml = await toolRunner.runNmap(ip, flags);
    return nmapParser.parse(rawXml);
  });

  // ── Google Dorking ──
  ipcMain.handle('run-google-dork', async (_event, query: string) => {
    // Split query into individual args safely
    const args = [query];
    return pythonRunner.runScript('google_dork.py', args);
  });

  // ── Quick Scan ──
  ipcMain.handle('run-quick-scan', async (_event, target: string) => {
    const isDomain = target.includes('.') && !target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    const results: any = { target, timestamp: new Date().toISOString() };

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

      sendStatus('Running port scan (top 1000 ports)...');
      const nmapResult = await toolRunner.runNmap(
        isDomain ? target : target,
        '-sS -T4 --top-ports 1000'
      );
      results.nmap = await nmapParser.parse(nmapResult);

    } catch (err: any) {
      results.error = err.message;
    }

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

  // ── Metasploit RPC ──
  ipcMain.handle('msf-connect', async (_event, host: string, port: number, password: string) => {
    try {
      msfClient = new MsfRpcClient(host, port, password);
      await msfClient.connect();
      const version = await msfClient.getVersion();
      return { connected: true, version };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  });

  ipcMain.handle('msf-disconnect', async () => {
    if (msfClient) msfClient.disconnect();
    return { success: true };
  });

  ipcMain.handle('msf-search', async (_event, query: string) => {
    if (!msfClient?.isConnected()) throw new Error('Not connected to Metasploit');
    return msfClient.searchExploits(query);
  });

  ipcMain.handle('msf-generate-payload', async (_event, payload: string, lhost: string, lport: number) => {
    if (!msfClient?.isConnected()) throw new Error('Not connected to Metasploit');
    return msfClient.generatePayload(payload, lhost, lport);
  });

  ipcMain.handle('msf-list-sessions', async () => {
    if (!msfClient?.isConnected()) throw new Error('Not connected to Metasploit');
    return msfClient.listSessions();
  });

  // ── Phishing / Evilginx ──
  ipcMain.handle('phish-check', async () => {
    return evilginxManager.checkAvailability();
  });

  ipcMain.handle('phish-get-phishlets', async () => {
    return evilginxManager.getPhishlets();
  });

  ipcMain.handle('phish-create-campaign', async (_event, name: string, targetDomain: string, phishlet: string) => {
    return evilginxManager.createCampaign(name, targetDomain, phishlet);
  });

  ipcMain.handle('phish-get-campaigns', async () => {
    return evilginxManager.getCampaigns();
  });

  ipcMain.handle('phish-start-campaign', async (_event, campaignId: string, domain: string, ip: string) => {
    return evilginxManager.startCampaign(campaignId, domain, ip);
  });

  ipcMain.handle('phish-stop-campaign', async (_event, campaignId: string) => {
    return evilginxManager.stopCampaign(campaignId);
  });

  ipcMain.handle('phish-get-credentials', async (_event, campaignId: string) => {
    return evilginxManager.getCapturedCredentials(campaignId);
  });

  ipcMain.handle('phish-delete-campaign', async (_event, campaignId: string) => {
    return evilginxManager.deleteCampaign(campaignId);
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
  msfClient = new MsfRpcClient();
  evilginxManager = new EvilginxManager(userDataPath);

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
