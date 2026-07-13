import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as tls from 'tls';
import * as http from 'http';
import * as https from 'https';
import { ToolRunner } from './services/tool-runner';
import { NmapParser } from './services/nmap-parser';
import { PythonRunner } from './services/python-runner';
import { DependencyChecker } from './services/dependency';
import { TargetStore } from './services/target-store';
import { OperationsManager } from './services/operations-manager';
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
let operationsManager: OperationsManager;
let msfClient: MsfRpcClient;
let evilginxManager: EvilginxManager;
let c2Server: C2Server;
let exfilManager: ExfilManager;

function createWindow() {
  // Remove the default Electron menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

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
  // ── Operations Management ──
  ipcMain.handle('op-list', async () => {
    return operationsManager.listOperations();
  });

  ipcMain.handle('op-get-current', async () => {
    return operationsManager.getCurrentOperation();
  });

  ipcMain.handle('op-get', async (_event, id: string) => {
    return operationsManager.getOperation(id);
  });

  ipcMain.handle('op-create', async (_event, name: string, description: string) => {
    return operationsManager.createOperation(name, description);
  });

  ipcMain.handle('op-set-current', async (_event, id: string) => {
    await operationsManager.setCurrentOperation(id);
    return { success: true };
  });

  ipcMain.handle('op-update', async (_event, id: string, updates: any) => {
    return operationsManager.updateOperation(id, updates);
  });

  ipcMain.handle('op-add-target', async (_event, id: string, target: string) => {
    await operationsManager.addTargetToOperation(id, target);
    return { success: true };
  });

  ipcMain.handle('op-delete', async (_event, id: string) => {
    await operationsManager.deleteOperation(id);
    return { success: true };
  });

  ipcMain.handle('op-archive', async (_event, id: string) => {
    await operationsManager.archiveOperation(id);
    return { success: true };
  });

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

  ipcMain.handle('run-ssl-scan', async (_event, domain: string) => {
    try {
      const cert = await new Promise<any>((resolve, reject) => {
        const socket = tls.connect(443, domain, { servername: domain, rejectUnauthorized: false }, () => {
          const c = socket.getPeerCertificate();
          const rawSubjectAlt = (c as any).subjectalt || (c as any).subjectaltname || '';
          socket.end();
          resolve({
            subject: c.subject,
            issuer: c.issuer,
            validFrom: c.valid_from,
            validTo: c.valid_to,
            fingerprint: c.fingerprint,
            serialNumber: c.serialNumber,
            subjectalt: rawSubjectAlt ? String(rawSubjectAlt).replace(/DNS:/g, '').split(/,\s*/).filter(Boolean) : [],
            bits: c.bits,
            signatureAlgorithm: (c as any).sigalg || (c as any).signatureAlgorithm || '',
          });
        });
        socket.on('error', reject);
        setTimeout(() => { socket.destroy(); reject(new Error('Timeout')); }, 10000);
      });
      return { domain, ...cert };
    } catch (err: any) {
      return { domain, error: err.message };
    }
  });

  ipcMain.handle('run-http-headers', async (_event, domain: string) => {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      const headers = await new Promise<any>((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { timeout: 10000, rejectUnauthorized: false }, (res) => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            httpVersion: res.httpVersion,
          });
          res.resume();
        }).on('error', reject);
      });
      return headers;
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('run-waf-detect', async (_event, domain: string) => {
    try {
      const url = `https://${domain}`;
      const probes = [
        { name: 'XSS probe', path: '/?q=<script>alert(1)</script>' },
        { name: 'SQLi probe', path: "/?id=1' OR '1'='1" },
        { name: 'Path traversal', path: '/../../../etc/passwd' },
      ];
      const results: any[] = [];
      for (const probe of probes) {
        const resp = await new Promise<any>((resolve) => {
          https.get(url + probe.path, { timeout: 8000, rejectUnauthorized: false }, (res) => {
            resolve({
              statusCode: res.statusCode,
              blocked: res.statusCode === 403 || res.statusCode === 406 || res.statusCode === 429,
              headers: {
                server: res.headers['server'],
                x_powered_by: res.headers['x-powered-by'],
                cf_ray: res.headers['cf-ray'],
                x_sucuri_id: res.headers['x-sucuri-id'],
                x_akamai: res.headers['x-akamai'] || res.headers['x-akamai-transformed'],
              },
            });
            res.resume();
          }).on('error', () => resolve({ statusCode: 0, blocked: false, headers: {} }));
        });
        results.push({ probe: probe.name, ...resp });
      }
      const wafHeaders = ['cf-ray', 'x-sucuri-id', 'x-akamai', 'x-powered-by', 'server'];
      const detectedWafs = results.map(r => {
        if (r.headers?.cf_ray) return 'Cloudflare';
        if (r.headers?.x_sucuri_id) return 'Sucuri';
        if (r.headers?.x_akamai) return 'Akamai';
        if (r.headers?.server?.includes('cloudflare')) return 'Cloudflare';
        if (r.headers?.server?.includes('Akamai')) return 'Akamai';
        return null;
      }).filter(Boolean);
      const uniqueWafs = [...new Set(detectedWafs)];
      return {
        domain,
        detected: uniqueWafs.length > 0,
        wafs: uniqueWafs.length > 0 ? uniqueWafs : ['None detected'],
        probes: results,
        possiblyBlocked: results.some(r => r.blocked),
      };
    } catch (err: any) {
      return { domain, error: err.message, detected: false, wafs: ['Unknown'] };
    }
  });

  ipcMain.handle('run-tech-detect', async (_event, domain: string) => {
    try {
      const url = `https://${domain}`;
      const resp = await new Promise<any>((resolve) => {
        https.get(url, { timeout: 10000, rejectUnauthorized: false }, (res) => {
          let body = '';
          res.on('data', (chunk: string) => body += chunk);
          res.on('end', () => resolve({ headers: res.headers, body: body.slice(0, 50000), status: res.statusCode }));
        }).on('error', () => resolve({ headers: {}, body: '', status: 0 }));
      });
      const techs: string[] = [];
      const h = resp.headers;
      const b = resp.body;

      // Server header
      if (h['server']) techs.push(`Server: ${h['server']}`);
      if (h['x-powered-by']) techs.push(`Powered by: ${h['x-powered-by']}`);
      if (h['x-generator']) techs.push(`Generator: ${h['x-generator']}`);
      if (h['x-aspnet-version']) techs.push(`ASP.NET v${h['x-aspnet-version']}`);
      if (h['x-aspnetmvc-version']) techs.push(`ASP.NET MVC v${h['x-aspnetmvc-version']}`);

      // Frameworks / CMS
      if (b.includes('wp-content') || b.includes('wp-json')) techs.push('WordPress');
      if (b.includes('Drupal.settings')) techs.push('Drupal');
      if (b.includes('Shopify')) techs.push('Shopify');
      if (b.includes('Joomla')) techs.push('Joomla');
      if (b.includes('nginx')) techs.push('Nginx');
      if (b.includes('cloudflare')) techs.push('Cloudflare');

      // JavaScript frameworks
      if (b.includes('react') || b.includes('React')) techs.push('React');
      if (b.includes('vue')) techs.push('Vue.js');
      if (b.includes('angular')) techs.push('Angular');
      if (b.includes('jQuery') || b.includes('jquery')) techs.push('jQuery');
      if (b.includes('next-') || b.includes('__NEXT_DATA__')) techs.push('Next.js');

      // Analytics
      if (b.includes('gtag') || b.includes('google-analytics')) techs.push('Google Analytics');
      if (b.includes('fbq') || b.includes('facebook-pixel')) techs.push('Facebook Pixel');

      return { domain, technologies: [...new Set(techs)], headers: h };
    } catch (err: any) {
      return { domain, error: err.message, technologies: [] };
    }
  });

  ipcMain.handle('run-dir-brute', async (_event, domain: string, wordlist?: string[]) => {
    const commonDirs = wordlist || [
      'admin', 'login', 'wp-admin', 'wp-content', 'wp-includes', 'backup', 'backups',
      'config', 'db', 'database', 'sql', 'dump', 'uploads', 'files', 'assets',
      'api', 'v1', 'v2', 'graphql', 'rest', 'server-status', '.git', '.env',
      'phpinfo.php', 'info.php', 'test.php', 'shell.php', 'xmlrpc.php',
      'robots.txt', 'sitemap.xml', 'crossdomain.xml', '.well-known/',
      'wp-json', 'wp-login.php', 'administrator', 'panel', 'cpanel',
      'install', 'setup', 'debug', 'logs', 'error_log', 'tmp', 'temp',
    ];
    const found: { path: string; status: number; size: number }[] = [];
    let remaining = commonDirs.length;
    for (const dir of commonDirs) {
      try {
        const url = `https://${domain}/${dir}`;
        const result = await new Promise<any>((resolve) => {
          const req = https.get(url, { timeout: 5000, rejectUnauthorized: false }, (res) => {
            let body = '';
            res.on('data', (d: string) => body += d);
            res.on('end', () => resolve({ status: res.statusCode, size: body.length }));
          });
          req.on('error', () => resolve({ status: 0, size: 0 }));
          setTimeout(() => { req.destroy(); resolve({ status: 0, size: 0 }); }, 5000);
        });
        if (result.status && result.status !== 404 && result.status !== 0) {
          found.push({ path: `/${dir}`, status: result.status, size: result.size });
        }
      } catch { /* skip */ }
      mainWindow?.webContents.send('scan-status', { target: domain, message: `Dir brute: ${--remaining} remaining` });
    }
    return { domain, found: found.sort((a, b) => a.path.localeCompare(b.path)), total: commonDirs.length };
  });

  ipcMain.handle('run-service-scan', async (_event, ip: string) => {
    try {
      const rawXml = await toolRunner.runNmap(ip, '-sV -T4 --top-ports 1000 --version-intensity 5');
      return nmapParser.parse(rawXml);
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('run-vuln-scan', async (_event, ip: string) => {
    try {
      const rawXml = await toolRunner.runNmap(ip, '-sV -T4 --script vuln --script-timeout 120s');
      return nmapParser.parse(rawXml);
    } catch (err: any) {
      return { error: err.message };
    }
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
    // Associate this target with the current operation
    const currentOp = await operationsManager.getCurrentOperation();
    if (currentOp) {
      await operationsManager.addTargetToOperation(currentOp.id, target);
    }
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

  ipcMain.handle('clear-scan-history', async () => {
    await targetStore.clearHistory();
    return { success: true };
  });

  // ── Activity Log (cross-tab history) ──
  ipcMain.handle('add-activity', async (_event, entry: any) => {
    await targetStore.addActivity(entry);
    return { success: true };
  });

  ipcMain.handle('get-activity', async (_event, tab?: string) => {
    return targetStore.getActivity(tab);
  });

  ipcMain.handle('clear-activity', async (_event, tab?: string) => {
    await targetStore.clearActivity(tab);
    return { success: true };
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

  ipcMain.handle('exfil-create-job', async (_event, name: string, targetDir: string,
    compression?: string, encryptionAlgo?: string, destination?: string, destinationUrl?: string) => {
    return exfilManager.createFileCollectionJob(
      name, targetDir, ['*'], true,
      (compression as any) || 'max',
      (encryptionAlgo as any) || 'aes-256-gcm',
      (destination as any) || 'local',
      destinationUrl || '',
    );
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

  ipcMain.handle('exfil-exfiltrate', async (_event, jobId: string) => {
    return exfilManager.exfiltrateData(jobId);
  });

  ipcMain.handle('exfil-update-destination', async (_event, jobId: string, destination: string, url: string) => {
    return exfilManager.updateJobDestination(jobId, destination as any, url);
  });

  ipcMain.handle('exfil-update-encryption', async (_event, jobId: string, algo: string) => {
    return exfilManager.updateJobEncryption(jobId, algo as any);
  });

  ipcMain.handle('exfil-update-compression', async (_event, jobId: string, level: string) => {
    return exfilManager.updateJobCompression(jobId, level as any);
  });

  ipcMain.handle('exfil-set-key', async (_event, keyHex: string) => {
    exfilManager.setEncryptionKey(keyHex);
    return { success: true };
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

  // ── Operation Report ──
  ipcMain.handle('op-report', async (_event, operationId: string) => {
    if (!mainWindow) return { success: false, error: 'No window' };

    const op = await operationsManager.getOperation(operationId);
    if (!op) return { success: false, error: 'Operation not found' };

    // Collect all data associated with this operation
    const targets = op.targets || [];
    const history = await targetStore.getHistory();
    const opHistory = history.filter((h) => targets.includes(h.target));

    // Build HTML report
    const targetRows = targets.map((t) =>
      `<tr><td style="font-family:monospace">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td></tr>`
    ).join('');

    const scanRows = opHistory.map((entry) => {
      const results = entry.results || {};
      const hasWhois = results.whois && !('error' in results.whois);
      const hasDns = results.dns && !('error' in results.dns);
      const hasNmap = results.nmap;
      const portCount = results.nmap?.openPortCount || 0;
      const subCount = results.subdomains?.count || 0;
      return `<tr>
        <td style="font-family:monospace">${entry.target}</td>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
        <td>${hasWhois ? '✅' : '❌'}</td>
        <td>${hasDns ? '✅' : '❌'}</td>
        <td>${hasNmap ? `${portCount} open` : '❌'}</td>
        <td>${subCount > 0 ? `${subCount} found` : '❌'}</td>
      </tr>`;
    }).join('');

    const activityEntries = opHistory.map((entry) =>
      `<div class="entry">
        <span class="time">${new Date(entry.timestamp).toLocaleString()}</span>
        <span class="tag">scan</span>
        <span>Scanned <strong>${entry.target}</strong></span>
      </div>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Operation Report — ${op.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e1a; color: #c8d0e0; padding: 40px; line-height: 1.6;
    }
    .header {
      text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1040, #0d1b2a);
      border-radius: 12px; border: 1px solid #1e2a45; margin-bottom: 30px;
    }
    .header h1 { font-size: 24px; color: #ff4455; margin-bottom: 8px; }
    .header .meta { color: #6b7a8f; font-size: 13px; }
    .section {
      background: #0f1525; border: 1px solid #1a2440; border-radius: 10px;
      padding: 20px 24px; margin-bottom: 16px;
    }
    .section h2 { font-size: 16px; color: #ff6677; border-bottom: 1px solid #1a2440; padding-bottom: 8px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 10px; background: #141c30; color: #8899bb; border-bottom: 1px solid #1a2440; }
    td { padding: 6px 10px; border-bottom: 1px solid #141c30; }
    .label { color: #6b7a8f; font-weight: 500; }
    .entry { padding: 6px 0; border-bottom: 1px solid #141c30; font-size: 12px; display: flex; gap: 8px; }
    .time { color: #6b7a8f; white-space: nowrap; }
    .tag { font-size: 9px; padding: 1px 6px; border-radius: 4px; background: #1a2440; color: #8899bb; }
    .notes { white-space: pre-wrap; font-size: 12px; color: #a0b0c8; }
    .footer { text-align: center; color: #3a4a5a; font-size: 11px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🗂️ Operation Report</h1>
    <div class="meta" style="font-size:18px;color:#e0e8f0;margin:8px 0">${op.name}</div>
    <div class="meta">${op.description || ''}</div>
    <div class="meta">Created: ${new Date(op.createdAt).toLocaleString()} · Status: ${op.status}</div>
  </div>

  <div class="section">
    <h2>🎯 Targets (${targets.length})</h2>
    <table>${targetRows || '<tr><td class="empty">No targets</td></tr>'}</table>
  </div>

  <div class="section">
    <h2>🔍 Scan Results (${opHistory.length})</h2>
    <table>
      <tr><th>Target</th><th>Date</th><th>WHOIS</th><th>DNS</th><th>Ports</th><th>Subs</th></tr>
      ${scanRows || '<tr><td colspan="6" class="empty" style="color:#4a5568">No scan data</td></tr>'}
    </table>
  </div>

  <div class="section">
    <h2>📋 Activity Log</h2>
    ${activityEntries || '<div class="empty" style="color:#4a5568">No activity recorded</div>'}
  </div>

  <div class="section">
    <h2>📝 Notes</h2>
    <div class="notes">${op.notes || 'No notes added yet.'}</div>
  </div>

  <div class="footer">
    Generated by RedHawk v0.1.1 — Red Teaming Suite
  </div>
</body>
</html>`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Operation Report',
      defaultPath: `RedHawk_Operation_${op.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`,
      filters: [
        { name: 'HTML Report', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }

    try {
      fs.writeFileSync(result.filePath, html, 'utf-8');
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
    operationsManager = new OperationsManager(userDataPath);
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
