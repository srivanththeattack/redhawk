import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Operations
  opList: () => ipcRenderer.invoke('op-list'),
  opGetCurrent: () => ipcRenderer.invoke('op-get-current'),
  opGet: (id: string) => ipcRenderer.invoke('op-get', id),
  opCreate: (name: string, description: string) => ipcRenderer.invoke('op-create', name, description),
  opSetCurrent: (id: string) => ipcRenderer.invoke('op-set-current', id),
  opUpdate: (id: string, updates: any) => ipcRenderer.invoke('op-update', id, updates),
  opAddTarget: (id: string, target: string) => ipcRenderer.invoke('op-add-target', id, target),
  opDelete: (id: string) => ipcRenderer.invoke('op-delete', id),
  opArchive: (id: string) => ipcRenderer.invoke('op-archive', id),

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
  runSslScan: (domain: string) => ipcRenderer.invoke('run-ssl-scan', domain),
  runHttpHeaders: (domain: string) => ipcRenderer.invoke('run-http-headers', domain),
  runWafDetect: (domain: string) => ipcRenderer.invoke('run-waf-detect', domain),
  runTechDetect: (domain: string) => ipcRenderer.invoke('run-tech-detect', domain),
  runDirBrute: (domain: string, wordlist?: string[]) => ipcRenderer.invoke('run-dir-brute', domain, wordlist),
  runServiceScan: (ip: string) => ipcRenderer.invoke('run-service-scan', ip),
  runVulnScan: (ip: string) => ipcRenderer.invoke('run-vuln-scan', ip),
  runGeoIp: (target: string) => ipcRenderer.invoke('run-geoip', target),
  runReverseDns: (target: string) => ipcRenderer.invoke('run-reverse-dns', target),
  runPortHealth: (target: string, port: number) => ipcRenderer.invoke('run-port-health', target, port),

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
  phishImportPhishlet: () => ipcRenderer.invoke('phish-import-phishlet'),

  // Team / Collaboration
  teamHeartbeat: (memberId: string, name: string, target?: string, tab?: string) =>
    ipcRenderer.invoke('team-heartbeat', memberId, name, target, tab),
  teamGetMembers: () => ipcRenderer.invoke('team-get-members'),
  teamAddActivity: (entry: any) => ipcRenderer.invoke('team-add-activity', entry),
  teamGetActivity: (limit?: number) => ipcRenderer.invoke('team-get-activity', limit),
  teamAddFinding: (finding: any) => ipcRenderer.invoke('team-add-finding', finding),
  teamUpdateFinding: (id: string, updates: any) => ipcRenderer.invoke('team-update-finding', id, updates),
  teamGetFindings: (target?: string) => ipcRenderer.invoke('team-get-findings', target),
  teamDeleteFinding: (id: string) => ipcRenderer.invoke('team-delete-finding', id),
  teamAddNote: (note: any) => ipcRenderer.invoke('team-add-note', note),
  teamGetNotes: (target?: string) => ipcRenderer.invoke('team-get-notes', target),
  teamDeleteNote: (id: string) => ipcRenderer.invoke('team-delete-note', id),
  teamAddTodo: (todo: any) => ipcRenderer.invoke('team-add-todo', todo),
  teamUpdateTodo: (id: string, updates: any) => ipcRenderer.invoke('team-update-todo', id, updates),
  teamGetTodos: () => ipcRenderer.invoke('team-get-todos'),
  teamDeleteTodo: (id: string) => ipcRenderer.invoke('team-delete-todo', id),
  teamGetTargets: () => ipcRenderer.invoke('team-get-targets'),
  teamCheckinTarget: (target: string, memberId: string, memberName: string) =>
    ipcRenderer.invoke('team-checkin-target', target, memberId, memberName),
  teamCheckoutTarget: (target: string, memberId: string, memberName: string) =>
    ipcRenderer.invoke('team-checkout-target', target, memberId, memberName),
  teamUpdateTarget: (target: string, updates: any) => ipcRenderer.invoke('team-update-target', target, updates),

  // C2 Profiles
  profileList: () => ipcRenderer.invoke('profile-list'),
  profileGet: (name: string) => ipcRenderer.invoke('profile-get', name),
  profileSave: (profile: any) => ipcRenderer.invoke('profile-save', profile),
  profileDelete: (name: string) => ipcRenderer.invoke('profile-delete', name),

  // C2 Server
  c2Start: (config: any) => ipcRenderer.invoke('c2-start', config),
  c2Stop: () => ipcRenderer.invoke('c2-stop'),
  c2Status: () => ipcRenderer.invoke('c2-status'),
  c2Agents: () => ipcRenderer.invoke('c2-agents'),
  c2Tasks: (agentId: string) => ipcRenderer.invoke('c2-tasks', agentId),
  c2SendCommand: (agentId: string, command: string) => ipcRenderer.invoke('c2-send-command', agentId, command),
  c2Broadcast: (command: string) => ipcRenderer.invoke('c2-broadcast', command),
  c2GeneratePayload: (type: string, sleepSeconds?: number, jitterPercent?: number, killDate?: string) =>
    ipcRenderer.invoke('c2-generate-payload', type, sleepSeconds, jitterPercent, killDate),

  // Exfiltration
  exfilJobs: () => ipcRenderer.invoke('exfil-jobs'),
  exfilCreateJob: (name: string, targetDir: string, compression?: string, encryptionAlgo?: string, destination?: string, destinationUrl?: string) =>
    ipcRenderer.invoke('exfil-create-job', name, targetDir, compression, encryptionAlgo, destination, destinationUrl),
  exfilCollectFiles: (jobId: string) => ipcRenderer.invoke('exfil-collect-files', jobId),
  exfilScreenshot: () => ipcRenderer.invoke('exfil-screenshot'),
  exfilBrowserData: () => ipcRenderer.invoke('exfil-browser-data'),
  exfilPackage: (jobId: string) => ipcRenderer.invoke('exfil-package', jobId),
  exfilExfiltrate: (jobId: string) => ipcRenderer.invoke('exfil-exfiltrate', jobId),
  exfilUpdateDestination: (jobId: string, destination: string, url: string) =>
    ipcRenderer.invoke('exfil-update-destination', jobId, destination, url),
  exfilUpdateEncryption: (jobId: string, algo: string) =>
    ipcRenderer.invoke('exfil-update-encryption', jobId, algo),
  exfilUpdateCompression: (jobId: string, level: string) =>
    ipcRenderer.invoke('exfil-update-compression', jobId, level),
  exfilSetKey: (keyHex: string) => ipcRenderer.invoke('exfil-set-key', keyHex),
  exfilTotalSize: () => ipcRenderer.invoke('exfil-total-size'),
  exfilKey: () => ipcRenderer.invoke('exfil-key'),
  exfilClear: () => ipcRenderer.invoke('exfil-clear'),

  // Results
  getScanResults: (target: string) => ipcRenderer.invoke('get-scan-results', target),
  getScanHistory: () => ipcRenderer.invoke('get-scan-history'),
  clearScanHistory: () => ipcRenderer.invoke('clear-scan-history'),

  // Activity log
  addActivity: (entry: any) => ipcRenderer.invoke('add-activity', entry),
  getActivity: (tab?: string) => ipcRenderer.invoke('get-activity', tab),
  clearActivity: (tab?: string) => ipcRenderer.invoke('clear-activity', tab),

  // Report
  saveReport: (reportHtml: string) => ipcRenderer.invoke('save-report', reportHtml),
  opReport: (operationId: string) => ipcRenderer.invoke('op-report', operationId),

  // Payload Factory
  payloadGenerate: (type: string, lhost: string, lport: number, kind?: string) =>
    ipcRenderer.invoke('payload-generate', type, lhost, lport, kind),
  payloadObfuscate: (payload: string, method: string) =>
    ipcRenderer.invoke('payload-obfuscate', payload, method),
  payloadSave: (payload: string, filename: string) =>
    ipcRenderer.invoke('payload-save', payload, filename),
  payloadImport: () => ipcRenderer.invoke('payload-import'),

  // Evasion
  evasionGetBypasses: () => ipcRenderer.invoke('evasion-get-bypasses'),
  evasionGetEtpPatches: () => ipcRenderer.invoke('evasion-get-etp-patches'),
  evasionRunBypass: (name: string) => ipcRenderer.invoke('evasion-run-bypass', name),
  evasionPatchEtw: () => ipcRenderer.invoke('evasion-patch-etw'),
  evasionGetTechniques: () => ipcRenderer.invoke('evasion-get-techniques'),
  evasionInject: (pid: number, shellcodeB64: string, technique: string) =>
    ipcRenderer.invoke('evasion-inject', pid, shellcodeB64, technique),
  evasionCheckFile: (filePath: string) => ipcRenderer.invoke('evasion-check-file', filePath),

  // Ops Dashboard
  opsSaveNote: (target: string, note: string) => ipcRenderer.invoke('ops-save-note', target, note),
  opsGetNotes: (target: string) => ipcRenderer.invoke('ops-get-notes', target),
  opsGetFindings: () => ipcRenderer.invoke('ops-get-findings'),
  opsSaveFinding: (finding: any) => ipcRenderer.invoke('ops-save-finding', finding),
  opsGetTodos: () => ipcRenderer.invoke('ops-get-todos'),
  opsSaveTodo: (todo: any) => ipcRenderer.invoke('ops-save-todo', todo),
  opsToggleTodo: (index: number) => ipcRenderer.invoke('ops-toggle-todo', index),
  opsDeleteTodo: (index: number) => ipcRenderer.invoke('ops-delete-todo', index),
  opsSaveScreenshot: (name: string, dataUrl: string) => ipcRenderer.invoke('ops-save-screenshot', name, dataUrl),
  opsGetScreenshots: () => ipcRenderer.invoke('ops-get-screenshots'),
  opsGetTimeline: () => ipcRenderer.invoke('ops-get-timeline'),

  // Privilege Escalation
  privescSystemInfo: () => ipcRenderer.invoke('privesc-system-info'),
  privescRunChecks: () => ipcRenderer.invoke('privesc-run-checks'),
  privescPowerUp: () => ipcRenderer.invoke('privesc-powerup'),
  privescSuggestExploit: () => ipcRenderer.invoke('privesc-suggest-exploit'),
  privescEnumServices: () => ipcRenderer.invoke('privesc-enum-services'),
  privescUnquotedPaths: () => ipcRenderer.invoke('privesc-unquoted-paths'),
  privescAlwaysInstallElevated: () => ipcRenderer.invoke('privesc-always-install-elevated'),

  // File dialogs
  dialogOpenFile: (options?: any) => ipcRenderer.invoke('dialog-open-file', options),

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
