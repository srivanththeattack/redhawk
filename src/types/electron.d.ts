export interface RedHawkApi {
  // Target
  setTarget: (target: string) => Promise<{ success: boolean; target: string }>;
  getTarget: () => Promise<string | null>;

  // Dependencies
  checkDeps: () => Promise<{
    nmap: boolean;
    python: boolean;
    pip: boolean;
    all: boolean;
  }>;
  installDeps: (confirm: boolean) => Promise<{
    success: boolean;
    results: Record<string, any>;
  }>;

  // Recon
  runWhois: (domain: string) => Promise<any>;
  runDnsEnum: (domain: string) => Promise<any>;
  runSubdomainEnum: (domain: string) => Promise<any>;
  runEmailOsint: (domain: string) => Promise<any>;
  runNmapScan: (ip: string, flags: string) => Promise<any>;
  runQuickScan: (target: string) => Promise<any>;

  // Results
  getScanResults: (target: string) => Promise<any>;
  getScanHistory: () => Promise<any[]>;

  // Event listeners (returns cleanup function)
  onScanOutput: (callback: (data: string) => void) => () => void;
  onScanStatus: (callback: (data: { target: string; message: string }) => void) => () => void;
  onScanComplete: (callback: (data: any) => void) => () => void;
}
