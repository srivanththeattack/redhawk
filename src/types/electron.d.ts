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
  checkDeps: () => Promise<{
    nmap: { installed: boolean; version?: string; path?: string; detail?: string };
    python: { installed: boolean; version?: string; path?: string; detail?: string };
    pip: { installed: boolean; version?: string; path?: string; detail?: string };
    nodejs: { installed: boolean; version?: string; path?: string; detail?: string };
    metasploit: { installed: boolean; version?: string; path?: string; detail?: string };
    msfRunning: { installed: boolean; version?: string; path?: string; detail?: string };
    evilginx: { installed: boolean; version?: string; path?: string; detail?: string };
    wsl: { installed: boolean; version?: string; path?: string; detail?: string };
    all: boolean;
  }>;
  installDeps: (confirm: boolean) => Promise<{ success: boolean; results: Record<string, any> }>;

  // Dialogs
  dialogOpenFile: (options: { filters: { name: string; extensions: string[] }[] }) => Promise<string | null>;

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

  // Additional Recon
  runGeoIp: (target: string) => Promise<any>;
  runReverseDns: (target: string) => Promise<any>;
  runPortHealth: (target: string, port: number) => Promise<any>;
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
  phishImportPhishlet: () => Promise<{ success: boolean; message: string }>;

  // Team / Collaboration
  teamHeartbeat: (memberId: string, name: string, target?: string, tab?: string) => Promise<any>;
  teamGetMembers: () => Promise<any[]>;
  teamAddActivity: (entry: any) => Promise<any>;
  teamGetActivity: (limit?: number) => Promise<any[]>;
  teamAddFinding: (finding: any) => Promise<any>;
  teamUpdateFinding: (id: string, updates: any) => Promise<any>;
  teamGetFindings: (target?: string) => Promise<any[]>;
  teamDeleteFinding: (id: string) => Promise<boolean>;
  teamAddNote: (note: any) => Promise<any>;
  teamGetNotes: (target?: string) => Promise<any[]>;
  teamDeleteNote: (id: string) => Promise<boolean>;
  teamAddTodo: (todo: any) => Promise<any>;
  teamUpdateTodo: (id: string, updates: any) => Promise<any>;
  teamGetTodos: () => Promise<any[]>;
  teamDeleteTodo: (id: string) => Promise<boolean>;
  teamGetTargets: () => Promise<any[]>;
  teamCheckinTarget: (target: string, memberId: string, memberName: string) => Promise<any>;
  teamCheckoutTarget: (target: string, memberId: string, memberName: string) => Promise<any>;
  teamUpdateTarget: (target: string, updates: any) => Promise<any>;

  // C2 Server
  c2Start: (config: any) => Promise<any>;
  c2Stop: () => Promise<any>;
  c2Status: () => Promise<any>;
  c2Agents: () => Promise<any>;
  c2Tasks: (agentId: string) => Promise<any>;
  c2SendCommand: (agentId: string, command: string) => Promise<any>;
  c2Broadcast: (command: string) => Promise<any>;
  c2GeneratePayload: (type: string, sleepSeconds?: number, jitterPercent?: number, killDate?: string) => Promise<any>;

  // C2 Profiles
  profileList: () => Promise<any>;
  profileGet: (name: string) => Promise<any>;
  profileSave: (profile: any) => Promise<any>;
  profileDelete: (name: string) => Promise<any>;

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

  // Payload Factory
  payloadGenerate: (type: string, lhost: string, lport: number, kind?: string) => Promise<string>;
  payloadObfuscate: (payload: string, method: string) => Promise<string>;
  payloadSave: (payload: string, filename: string) => Promise<{ success: boolean; filePath?: string }>;
  payloadImport: () => Promise<{ filePath: string; content: string } | null>;

  // Evasion
  evasionGetBypasses: () => Promise<{ name: string; code: string; description: string }[]>;
  evasionGetEtpPatches: () => Promise<{ name: string; code: string; description: string }[]>;
  evasionRunBypass: (name: string) => Promise<{ success: boolean; output: string }>;
  evasionPatchEtw: () => Promise<{ success: boolean; output: string }>;
  evasionGetTechniques: () => Promise<{ id: string; name: string; description: string }[]>;
  evasionInject: (pid: number, shellcodeB64: string, technique: string) => Promise<{ success: boolean; output: string }>;
  evasionCheckFile: (filePath: string) => Promise<{ detected: boolean; engines: number; result: string }>;

  // Ops Dashboard
  opsGetTimeline: () => Promise<any[]>;
  opsSaveNote: (target: string, note: string) => Promise<boolean>;
  opsGetNotes: (target: string) => Promise<string[]>;
  opsSaveFinding: (finding: { target: string; title: string; severity: string; description: string }) => Promise<boolean>;
  opsGetFindings: () => Promise<any[]>;
  opsSaveTodo: (todo: { text: string; done: boolean }) => Promise<boolean>;
  opsGetTodos: () => Promise<any[]>;
  opsToggleTodo: (index: number) => Promise<boolean>;
  opsDeleteTodo: (index: number) => Promise<boolean>;
  opsSaveScreenshot: (name: string, dataUrl: string) => Promise<{ success: boolean; filePath?: string }>;
  opsGetScreenshots: () => Promise<{ name: string; path: string; timestamp: string }[]>;

  // Privilege Escalation
  privescSystemInfo: () => Promise<{ os: string; arch: string; user: string; integrity: string; domain: string }>;
  privescRunChecks: () => Promise<{ category: string; checks: { name: string; status: string; detail: string }[] }[]>;
  privescPowerUp: () => Promise<any[]>;
  privescSuggestExploit: () => Promise<{ name: string; cve: string; edbId: string; description: string; reliability: string }[]>;
  privescEnumServices: () => Promise<{ name: string; displayName: string; startType: string; user: string; path: string; vulnerable: boolean }[]>;
  privescUnquotedPaths: () => Promise<{ path: string; name: string }[]>;
  privescAlwaysInstallElevated: () => Promise<boolean>;

  // Integrated Terminal
  terminalCreate: (cols: number, rows: number) => Promise<boolean>;
  terminalWrite: (data: string) => Promise<void>;
  terminalResize: (cols: number, rows: number) => Promise<void>;
  terminalKill: () => Promise<void>;

  // Event listeners (returns cleanup function)
  onTerminalData: (callback: (data: string) => void) => () => void;
  onTerminalExit: (callback: () => void) => () => void;
  onScanOutput: (callback: (data: string) => void) => () => void;
  onScanStatus: (callback: (data: { target: string; message: string }) => void) => () => void;
  onScanComplete: (callback: (data: any) => void) => () => void;
}
