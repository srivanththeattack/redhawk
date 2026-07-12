import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Target
  setTarget: (target: string) => ipcRenderer.invoke('set-target', target),
  getTarget: () => ipcRenderer.invoke('get-target'),

  // Dependencies
  checkDeps: () => ipcRenderer.invoke('check-deps'),
  installDeps: (confirm: boolean) => ipcRenderer.invoke('install-deps', confirm),

  // Recon
  runWhois: (domain: string) => ipcRenderer.invoke('run-whois', domain),
  runDnsEnum: (domain: string) => ipcRenderer.invoke('run-dns-enum', domain),
  runSubdomainEnum: (domain: string) => ipcRenderer.invoke('run-subdomain-enum', domain),
  runEmailOsint: (domain: string) => ipcRenderer.invoke('run-email-osint', domain),
  runNmapScan: (ip: string, flags: string) => ipcRenderer.invoke('run-nmap-scan', ip, flags),
  runQuickScan: (target: string) => ipcRenderer.invoke('run-quick-scan', target),

  // Metasploit
  msfConnect: (host: string, port: number, password: string) =>
    ipcRenderer.invoke('msf-connect', host, port, password),
  msfDisconnect: () => ipcRenderer.invoke('msf-disconnect'),
  msfSearch: (query: string) => ipcRenderer.invoke('msf-search', query),
  msfGeneratePayload: (payload: string, lhost: string, lport: number) =>
    ipcRenderer.invoke('msf-generate-payload', payload, lhost, lport),
  msfListSessions: () => ipcRenderer.invoke('msf-list-sessions'),

  // Phishing / Evilginx
  phishCheck: () => ipcRenderer.invoke('phish-check'),
  phishGetPhishlets: () => ipcRenderer.invoke('phish-get-phishlets'),
  phishCreateCampaign: (name: string, targetDomain: string, phishlet: string) =>
    ipcRenderer.invoke('phish-create-campaign', name, targetDomain, phishlet),
  phishGetCampaigns: () => ipcRenderer.invoke('phish-get-campaigns'),
  phishStartCampaign: (campaignId: string, domain: string, ip: string) =>
    ipcRenderer.invoke('phish-start-campaign', campaignId, domain, ip),
  phishStopCampaign: (campaignId: string) => ipcRenderer.invoke('phish-stop-campaign', campaignId),
  phishGetCredentials: (campaignId: string) => ipcRenderer.invoke('phish-get-credentials', campaignId),
  phishDeleteCampaign: (campaignId: string) => ipcRenderer.invoke('phish-delete-campaign', campaignId),

  // C2 Server
  c2Start: (config: any) => ipcRenderer.invoke('c2-start', config),
  c2Stop: () => ipcRenderer.invoke('c2-stop'),
  c2Status: () => ipcRenderer.invoke('c2-status'),
  c2Agents: () => ipcRenderer.invoke('c2-agents'),
  c2Tasks: (agentId: string) => ipcRenderer.invoke('c2-tasks', agentId),
  c2SendCommand: (agentId: string, command: string) => ipcRenderer.invoke('c2-send-command', agentId, command),
  c2Broadcast: (command: string) => ipcRenderer.invoke('c2-broadcast', command),
  c2GeneratePayload: (type: string) => ipcRenderer.invoke('c2-generate-payload', type),

  // Exfiltration
  exfilJobs: () => ipcRenderer.invoke('exfil-jobs'),
  exfilCreateJob: (name: string, targetDir: string) => ipcRenderer.invoke('exfil-create-job', name, targetDir),
  exfilCollectFiles: (jobId: string) => ipcRenderer.invoke('exfil-collect-files', jobId),
  exfilScreenshot: () => ipcRenderer.invoke('exfil-screenshot'),
  exfilBrowserData: () => ipcRenderer.invoke('exfil-browser-data'),
  exfilPackage: (jobId: string) => ipcRenderer.invoke('exfil-package', jobId),
  exfilSendToC2: (packagePath: string, c2Url: string) => ipcRenderer.invoke('exfil-send-to-c2', packagePath, c2Url),
  exfilTotalSize: () => ipcRenderer.invoke('exfil-total-size'),
  exfilKey: () => ipcRenderer.invoke('exfil-key'),
  exfilClear: () => ipcRenderer.invoke('exfil-clear'),

  // Results
  getScanResults: (target: string) => ipcRenderer.invoke('get-scan-results', target),
  getScanHistory: () => ipcRenderer.invoke('get-scan-history'),

  // Report
  saveReport: (reportHtml: string) => ipcRenderer.invoke('save-report', reportHtml),

  // Event listeners
  onScanOutput: (callback: (data: string) => void) => {
    const handler = (_event: any, data: string) => callback(data);
    ipcRenderer.on('scan-output', handler);
    return () => ipcRenderer.removeListener('scan-output', handler);
  },
  onScanStatus: (callback: (data: { target: string; message: string }) => void) => {
    const handler = (_event: any, data: { target: string; message: string }) => callback(data);
    ipcRenderer.on('scan-status', handler);
    return () => ipcRenderer.removeListener('scan-status', handler);
  },
  onScanComplete: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scan-complete', handler);
    return () => ipcRenderer.removeListener('scan-complete', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type RedHawkApi = typeof api;
