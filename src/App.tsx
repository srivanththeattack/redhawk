import React, { useEffect, useState } from 'react';
import { useScan } from './hooks/useScan';
import { Disclaimer } from './components/Disclaimer';
import { TargetInput } from './components/TargetInput';
import { KillChainBar } from './components/KillChainBar';
import { ResultsPanel } from './components/ResultsPanel';
import { ScanProgress } from './components/ScanProgress';
import { ActionPrompt } from './components/ActionPrompt';

interface ActionDef {
  id: string;
  icon: string;
  label: string;
  description: string;
}

const ACTIONS: ActionDef[] = [
  {
    id: 'whois',
    icon: '📋',
    label: 'WHOIS Lookup',
    description: 'Get domain registration details',
  },
  {
    id: 'dns-enum',
    icon: '🌐',
    label: 'DNS Enumeration',
    description: 'Find A, MX, NS, TXT records',
  },
  {
    id: 'deep-scan',
    icon: '🔍',
    label: 'Deep Port Scan',
    description: 'Scan all 65535 ports with version detection',
  },
  {
    id: 'vuln-scan',
    icon: '🛡',
    label: 'Vulnerability Scan',
    description: 'Check for known vulnerabilities on services',
  },
  {
    id: 'subdomain-enum',
    icon: '🌍',
    label: 'Subdomain Enumeration',
    description: 'Discover subdomains via DNS bruteforce',
  },
  {
    id: 'email-osint',
    icon: '📧',
    label: 'Email OSINT',
    description: 'Find employee email addresses',
  },
  {
    id: 'export-report',
    icon: '📄',
    label: 'Export Report',
    description: 'Save results as PDF or HTML report',
  },
];

export default function App() {
  const scan = useScan();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load history on mount
  useEffect(() => {
    scan.loadHistory();
  }, []);

  const handleAction = async (actionId: string) => {
    const target = scan.results?.target || scan.target;

    switch (actionId) {
      case 'whois':
        await scan.runWhois(target);
        break;
      case 'dns-enum':
        await scan.runDnsEnum(target);
        break;
      case 'deep-scan':
        await scan.runNmapScan(target, '-sV -sS -T4 -p-');
        break;
      case 'vuln-scan':
        await scan.runNmapScan(target, '-sV --script vuln');
        break;
      case 'subdomain-enum':
        await scan.runSubdomainEnum(target);
        break;
      case 'email-osint':
        await scan.runEmailOsint(target);
        break;
      case 'export-report':
        alert('Report export coming in Phase 2.');
        break;
    }
  };

  // Show disclaimer if not accepted
  if (!scan.disclaimerAccepted) {
    return <Disclaimer onAccept={scan.acceptDisclaimer} />;
  }

  return (
    <div className="h-screen flex flex-col bg-midnight-950">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-midnight-900 border-b border-midnight-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-redhawk-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">RH</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-tight">RedHawk</h1>
            <p className="text-xs text-gray-500">Reconnaissance Suite v0.1</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dependency status */}
          {scan.depsStatus && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${scan.depsStatus.nmap ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-400">Nmap</span>
              <span className={`w-2 h-2 rounded-full ${scan.depsStatus.python ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-400">Python</span>
            </div>
          )}
          {!scan.depsStatus?.all && !scan.depsChecking && (
            <button onClick={scan.installDeps} className="btn-secondary text-xs py-1.5 px-3">
              Install Dependencies
            </button>
          )}
          {scan.depsChecking && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </span>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost text-xs"
          >
            {sidebarOpen ? '◀ History' : '▶ History'}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Target input */}
          <TargetInput
            target={scan.target}
            onTargetChange={scan.setTarget}
            onScan={scan.startScan}
            isScanning={scan.phase === 'scanning'}
          />

          {/* Kill chain */}
          <KillChainBar currentPhase={scan.phase} />

          {/* Scan progress (visible during/after scan) */}
          <ScanProgress
            phase={scan.phase}
            messages={scan.statusMessages}
            output={scan.scanOutput}
          />

          {/* Action prompt */}
          {scan.phase === 'complete' && (
            <ActionPrompt
              results={scan.results}
              actions={ACTIONS}
              onAction={handleAction}
            />
          )}

          {/* Results */}
          <ResultsPanel results={scan.results} phase={scan.phase} />
        </div>

        {/* ── History Sidebar ── */}
        {sidebarOpen && (
          <aside className="w-72 bg-midnight-900 border-l border-midnight-800 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Scan History
              </h3>
              {scan.history.length === 0 ? (
                <p className="text-xs text-gray-600">No previous scans</p>
              ) : (
                <div className="space-y-2">
                  {scan.history.map((entry: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-midnight-800/50 border border-midnight-700 cursor-pointer
                                 hover:bg-midnight-700/50 transition-colors"
                      onClick={() => {
                        scan.setTarget(entry.target);
                        // We'd need to set results too
                      }}
                    >
                      <p className="text-sm font-mono text-gray-200 truncate">{entry.target}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        {entry.results?.nmap?.openPortCount > 0 && (
                          <span className="badge-open text-xs">
                            {entry.results.nmap.openPortCount} ports
                          </span>
                        )}
                        {entry.results?.whois && !('error' in entry.results.whois) && (
                          <span className="badge bg-blue-900/50 text-blue-400 border-blue-700 text-xs">
                            WHOIS
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Status Bar ── */}
      <footer className="flex items-center justify-between px-6 py-1.5 bg-midnight-900 border-t border-midnight-800 text-xs text-gray-600 flex-shrink-0">
        <span>
          {scan.phase === 'idle' && 'Ready'}
          {scan.phase === 'scanning' && 'Scanning...'}
          {scan.phase === 'complete' && 'Scan complete'}
          {scan.phase === 'error' && 'Error occurred'}
        </span>
        <span>
          RedHawk v0.1 — For authorized testing only
        </span>
      </footer>
    </div>
  );
}
