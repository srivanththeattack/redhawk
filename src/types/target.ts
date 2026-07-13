export interface NmapPort {
  portid: string;
  protocol: string;
  state: string;
  service: string;
  product: string | null;
  version: string | null;
  cpe: string | null;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: string;
}

export interface WhoisInfo {
  domain?: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
  orgName?: string;
  country?: string;
  emails?: string[];
  raw?: string;
}

export interface OsintEmail {
  email: string;
  source?: string;
  confidence?: string;
}

export interface NmapResult {
  scanInfo: {
    args: string;
    startTime: string;
    scanner: string;
    version: string;
  };
  host: {
    ip: string;
    hostname: string | null;
    status: string;
    os: string | null;
    osAccuracy: number | null;
  };
  ports: NmapPort[];
  portCount: number;
  openPortCount: number;
  summary: string;
}

export interface SslCertInfo {
  domain: string;
  subject?: any;
  issuer?: any;
  validFrom?: string;
  validTo?: string;
  fingerprint?: string;
  serialNumber?: string;
  subjectalt?: string[];
  bits?: number;
  signatureAlgorithm?: string;
  error?: string;
}

export interface HttpHeaderResult {
  statusCode?: number;
  statusMessage?: string;
  headers?: Record<string, any>;
  httpVersion?: string;
  error?: string;
}

export interface WafResult {
  domain: string;
  detected: boolean;
  wafs: string[];
  probes: any[];
  possiblyBlocked: boolean;
  error?: string;
}

export interface TechResult {
  domain: string;
  technologies: string[];
  headers?: Record<string, any>;
  error?: string;
}

export interface DirBruteResult {
  domain: string;
  found: { path: string; status: number; size: number }[];
  total: number;
}

export interface ScanResults {
  target: string;
  timestamp: string;
  whois?: WhoisInfo | { error: string };
  dns?: { records: DnsRecord[] } | { error: string };
  subdomains?: { subdomains: string[] } | { error: string };
  emails?: { emails: OsintEmail[] } | { error: string };
  nmap?: NmapResult;
  ssl?: SslCertInfo | { error: string };
  httpHeaders?: HttpHeaderResult | { error: string };
  waf?: WafResult | { error: string };
  tech?: TechResult | { error: string };
  dirBrute?: DirBruteResult | { error: string };
  serviceScan?: NmapResult | { error: string };
  vulnScan?: NmapResult | { error: string };
  error?: string;
}

export interface DepsStatus {
  nmap: boolean;
  python: boolean;
  pip: boolean;
  all: boolean;
}

export type ScanPhase = 'idle' | 'scanning' | 'complete' | 'error';
