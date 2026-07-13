export interface RedHawkApi {
  // Operations
  opList: () => Promise<any[]>;
  opGetCurrent: () => Promise<any | null>;
  opGet: (id: string) => Promise<any | null>;
  opCreate: (name: string, description: string) => Promise<any>;
  opSetCurrent: (id: string) => Promise<{ success: boolean }>;
  opUpdate: (id: string, updates: any) => Promise<any | null>;
  opAddTarget: (id: string, target: string) => Promise<{ success: boolean }>;
  opDelete: (id: string) => Promise<{ success: boolean }>;
  opArchive: (id: string) => Promise<{ success: boolean }>;

  // Target
  setTarget: (target: string) => Promise<{ success: boolean; target: string }>;
  getTarget: () => Promise<string | null>;

  // Dependencies
  checkDeps: () => Promise<{ nmap: boolean; python: boolean; pip: boolean; all: boolean }>;
  installDeps: (confirm: boolean) => Promise<{ success: boolean; results: Record<string, any> }>;

  // Recon
  runWhois: (domain: string) => Promise<any>;
  runDnsEnum: (domain: string) => Promise<any>;
  runSubdomainEnum: (domain: string) => Promise<any>;
  runEmailOsint: (domain: string) => Promise<any>;
  runNmapScan: (ip: string, flags: string) => Promise<any>;
  runQuickScan: (target: string) => Promise<any>;
  runSslScan: (domain: string) => Promise<any>;
  runHttpHeaders: (domain: string) => Promise<any>;
  runWafDetect: (domain: string) => Promise<any>;
  runTechDetect: (domain: string) => Promise<any>;
  runDirBrute: (domain: string, wordlist?: string[]) => Promise<any>;
  runServiceScan: (ip: string) => Promise<any>;
  runVulnScan: (ip: string) => Promise<any>;

  // Google Dorking
  runGoogleDork: (query: string) => Promise<any>;

  // Metasploit
  msfConnect: (host: string, port: number, password: string) => Promise<any>;
  msfDisconnect: () => Promise<any>;
  msfSearch: (query: string) => Promise<any>;
  msfGeneratePayload: (payload: string, lhost: string, lport: number) => Promise<any>;
  msfListSessions: () => Promise<any>;

  // Phishing / Evilginx
  phishCheck: () => Promise<any>;
  phishGetPhishlets: () => Promise<any>;
  phishCreateCampaign: (name: string, targetDomain: string, phishlet: string) => Promise<any>;
  phishGetCampaigns: () => Promise<any>;
  phishStartCampaign: (campaignId: string, domain: string, ip: string) => Promise<any>;
  phishStopCampaign: (campaignId: string) => Promise<any>;
  phishGetCredentials: (campaignId: string) => Promise<any>;
  phishDeleteCampaign: (campaignId: string) => Promise<any>;

  // C2 Server
  c2Start: (config: any) => Promise<any>;
  c2Stop: () => Promise<any>;
  c2Status: () => Promise<any>;
  c2Agents: () => Promise<any>;
  c2Tasks: (agentId: string) => Promise<any>;
  c2SendCommand: (agentId: string, command: string) => Promise<any>;
  c2Broadcast: (command: string) => Promise<any>;
  c2GeneratePayload: (type: string) => Promise<any>;

  // Exfiltration
  exfilJobs: () => Promise<any>;
  exfilCreateJob: (name: string, targetDir: string, compression?: string, encryptionAlgo?: string, destination?: string, destinationUrl?: string) => Promise<any>;
  exfilCollectFiles: (jobId: string) => Promise<any>;
  exfilScreenshot: () => Promise<any>;
  exfilBrowserData: () => Promise<any>;
  exfilPackage: (jobId: string) => Promise<any>;
  exfilExfiltrate: (jobId: string) => Promise<any>;
  exfilUpdateDestination: (jobId: string, destination: string, url: string) => Promise<any>;
  exfilUpdateEncryption: (jobId: string, algo: string) => Promise<any>;
  exfilUpdateCompression: (jobId: string, level: string) => Promise<any>;
  exfilSetKey: (keyHex: string) => Promise<any>;
  exfilTotalSize: () => Promise<any>;
  exfilKey: () => Promise<any>;
  exfilClear: () => Promise<any>;

  // Results
  getScanResults: (target: string) => Promise<any>;
  getScanHistory: () => Promise<any[]>;
  clearScanHistory: () => Promise<{ success: boolean }>;

  // Activity log (cross-tab history)
  addActivity: (entry: { tab: string; type: string; label: string; detail: string; target?: string }) => Promise<{ success: boolean }>;
  getActivity: (tab?: string) => Promise<any[]>;
  clearActivity: (tab?: string) => Promise<{ success: boolean }>;

  // Reports
  saveReport: (reportHtml: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  opReport: (operationId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Event listeners (returns cleanup function)
  onScanOutput: (callback: (data: string) => void) => () => void;
  onScanStatus: (callback: (data: { target: string; message: string }) => void) => () => void;
  onScanComplete: (callback: (data: any) => void) => () => void;
}
