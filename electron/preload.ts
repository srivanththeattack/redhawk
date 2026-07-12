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

  // Results
  getScanResults: (target: string) => ipcRenderer.invoke('get-scan-results', target),
  getScanHistory: () => ipcRenderer.invoke('get-scan-history'),

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
