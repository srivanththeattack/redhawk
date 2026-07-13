import { useRef, useCallback, useState, useEffect } from 'react';
import type { useScan } from '../hooks/useScan';
import { TargetInput } from './TargetInput';
import { KillChainBar } from './KillChainBar';
import { ScanProgress } from './ScanProgress';
import { ResultsPanel } from './ResultsPanel';
import { ReportExporter } from './ReportExporter';

interface ReconContentProps {
  scan: ReturnType<typeof useScan>;
}

function getFirstRun(): boolean {
  try {
    return localStorage.getItem('redhawk_first_run') !== 'false';
  } catch {
    return true;
  }
}

function dismissFirstRun() {
  try { localStorage.setItem('redhawk_first_run', 'false'); } catch {}
}

export function ReconContent({ scan }: ReconContentProps) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lastRunSection, setLastRunSection] = useState<string | null>(null);
  const lastRunRef = useRef<string | null>(null);
  const [showGuide, setShowGuide] = useState(getFirstRun);

  // Pre-fill demo target on first launch
  useEffect(() => {
    if (showGuide && !scan.target) {
      scan.setTarget('example.com');
    }
  }, []); // only on mount

  // Scroll to the last-run section when results appear
  useEffect(() => {
    if (!lastRunRef.current) return;
    const id = lastRunRef.current;
    const checkAndScroll = (attempts: number) => {
      const el = sectionRefs.current.get(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempts > 0) {
        setTimeout(() => checkAndScroll(attempts - 1), 500);
      }
    };
    checkAndScroll(20);
  }, [scan.results]);

  const runScan = useCallback((sectionId: string, runner: () => void) => {
    setLastRunSection(sectionId);
    lastRunRef.current = sectionId;
    runner();
  }, []);

  return (
    <div className="space-y-4">
      <TargetInput
        target={scan.target}
        onTargetChange={scan.setTarget}
        onScan={() => { dismissFirstRun(); setShowGuide(false); scan.startScan(); }}
        isScanning={scan.phase === 'scanning'}
      />

      {/* First-run quick start guide */}
      {showGuide && (
        <div className="card border-redhawk-700/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-redhawk-600/5 to-transparent pointer-events-none" />
          <button
            onClick={() => { dismissFirstRun(); setShowGuide(false); }}
            className="absolute top-2.5 right-2.5 text-gray-600 hover:text-gray-300 transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="card-header text-redhawk-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Welcome to RedHawk — here's how to get started
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-redhawk-600/20 border border-redhawk-600/30 flex items-center justify-center">
                <span className="text-xs font-bold text-redhawk-400">1</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">Enter a target</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  We've pre-filled <span className="font-mono text-gray-400">example.com</span>.
                  Type any domain or IP.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-redhawk-600/20 border border-redhawk-600/30 flex items-center justify-center">
                <span className="text-xs font-bold text-redhawk-400">2</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">Hit "Launch Scan"</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Runs WHOIS, DNS, subdomains, email OSINT + Nmap in one click.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-redhawk-600/20 border border-redhawk-600/30 flex items-center justify-center">
                <span className="text-xs font-bold text-redhawk-400">3</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">Explore tabs</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Switch to Exploit, Phish, C2, or Exfil — each tab is a full tool.
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-3 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This guide shows once. Dismiss to start fresh.
            <button
              onClick={() => { dismissFirstRun(); setShowGuide(false); }}
              className="text-redhawk-400 hover:text-redhawk-300 underline ml-1"
            >
              Got it
            </button>
          </p>
        </div>
      )}

      {/* Quick action buttons */}
      {scan.target && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => runScan('whois', () => scan.runWhois(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-blue-700/50">
            📋 WHOIS
          </button>
          <button onClick={() => runScan('dns', () => scan.runDnsEnum(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-purple-700/50">
            🌐 DNS
          </button>
          <button onClick={() => runScan('subdomains', () => scan.runSubdomainEnum(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-yellow-700/50">
            🌍 Subdomains
          </button>
          <button onClick={() => runScan('emails', () => scan.runEmailOsint(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-pink-700/50">
            📧 Emails
          </button>
          <button onClick={() => runScan('nmap', () => scan.runNmapScan(scan.target, '-sS -T4 --top-ports 1000'))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-green-700/50">
            🔍 Port Scan
          </button>
          <button onClick={() => runScan('ssl', () => scan.runSslScan(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-cyan-700/50">
            🔒 SSL Cert
          </button>
          <button onClick={() => runScan('httpHeaders', () => scan.runHttpHeaders(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-indigo-700/50">
            📡 HTTP Headers
          </button>
          <button onClick={() => runScan('waf', () => scan.runWafDetect(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-orange-700/50">
            🛡️ WAF Detect
          </button>
          <button onClick={() => runScan('tech', () => scan.runTechDetect(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-teal-700/50">
            ⚙️ Tech Detect
          </button>
          <button onClick={() => runScan('dirBrute', () => scan.runDirBrute(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-red-700/50">
            📁 Dir Brute
          </button>
          <button onClick={() => runScan('serviceScan', () => scan.runServiceScan(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-emerald-700/50">
            🔬 Service Scan
          </button>
          <button onClick={() => runScan('vulnScan', () => scan.runVulnScan(scan.target))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-rose-700/50">
            💀 Vuln Scan
          </button>
          <button onClick={() => runScan('nmap', () => scan.runNmapScan(scan.target, '-sS -sV -T2 --top-ports 1000'))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-slate-500/50"
            title="Stealth scan - slower, less likely to be detected">
            🥷 Stealth Scan
          </button>
          <button onClick={() => runScan('nmap', () => scan.runNmapScan(scan.target, '-sS -sV -T5 -A --top-ports 1000'))}
            className="btn-ghost text-xs py-1.5 px-2.5 border border-midnight-700/50 hover:border-red-700/50"
            title="Hyper aggressive - fast but noisy, includes OS detection & traceroute">
            🔥 Hyper Scan
          </button>
        </div>
      )}

      {scan.target && <KillChainBar chain={scan.killChain} />}
      <ScanProgress
        phase={scan.phase}
        messages={scan.statusMessages}
        output={scan.scanOutput}
        collapsible={true}
      />
      <ResultsPanel
        results={scan.results}
        phase={scan.phase}
        scanTasks={scan.scanTasks}
        onSectionRender={handleSectionRender}
        lastRunSection={lastRunSection}
      />
      <ReportExporter results={scan.results} phase={scan.phase} />
    </div>
  );
}
