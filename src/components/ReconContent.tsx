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

export function ReconContent({ scan }: ReconContentProps) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lastRunSection, setLastRunSection] = useState<string | null>(null);
  const lastRunRef = useRef<string | null>(null);

  const handleSectionRender = useCallback((id: string, el: HTMLDivElement) => {
    sectionRefs.current.set(id, el);
  }, []);

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
        onScan={scan.startScan}
        isScanning={scan.phase === 'scanning'}
      />

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
