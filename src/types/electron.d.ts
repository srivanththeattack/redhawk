export interface RedHawkApi {
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
  exfilCreateJob: (name: string, targetDir: string) => Promise<any>;
  exfilCollectFiles: (jobId: string) => Promise<any>;
  exfilScreenshot: () => Promise<any>;
  exfilBrowserData: () => Promise<any>;
  exfilPackage: (jobId: string) => Promise<any>;
  exfilSendToC2: (packagePath: string, c2Url: string) => Promise<any>;
  exfilTotalSize: () => Promise<any>;
  exfilKey: () => Promise<any>;
  exfilClear: () => Promise<any>;

  // Results
  getScanResults: (target: string) => Promise<any>;
  getScanHistory: () => Promise<any[]>;

  // Event listeners (returns cleanup function)
  onScanOutput: (callback: (data: string) => void) => () => void;
  onScanStatus: (callback: (data: { target: string; message: string }) => void) => () => void;
  onScanComplete: (callback: (data: any) => void) => () => void;
}
