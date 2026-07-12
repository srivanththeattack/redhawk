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
  { id: 'whois', icon: '📋', label: 'WHOIS Lookup', description: 'Get domain registration details' },
  { id: 'dns-enum', icon: '🌐', label: 'DNS Enumeration', description: 'Find A, MX, NS, TXT records' },
  { id: 'deep-scan', icon: '🔍', label: 'Deep Port Scan', description: 'Scan all 65535 ports with version detection' },
  { id: 'vuln-scan', icon: '🛡', label: 'Vulnerability Scan', description: 'Check for known vulnerabilities' },
  { id: 'subdomain-enum', icon: '🌍', label: 'Subdomain Enumeration', description: 'Discover subdomains via DNS bruteforce' },
  { id: 'email-osint', icon: '📧', label: 'Email OSINT', description: 'Find employee email addresses' },
  { id: 'export-report', icon: '📄', label: 'Export Report', description: 'Save results as PDF or HTML report (Phase 2)' },
];

function StatusIndicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${ok ? 'Available' : 'Not found'}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-redhawk-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]'} transition-all duration-300`} />
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

export default function App() {
  const scan = useScan();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedHistoryTarget, setSelectedHistoryTarget] = useState<string | null>(null);

  useEffect(() => {
    scan.loadHistory();
  }, []);

  const handleAction = async (actionId: string) => {
    const target = scan.results?.target || scan.target;
    switch (actionId) {
      case 'whois': await scan.runWhois(target); break;
      case 'dns-enum': await scan.runDnsEnum(target); break;
      case 'deep-scan': await scan.runNmapScan(target, '-sV -sS -T4 -p-'); break;
      case 'vuln-scan': await scan.runNmapScan(target, '-sV --script vuln'); break;
      case 'subdomain-enum': await scan.runSubdomainEnum(target); break;
      case 'email-osint': await scan.runEmailOsint(target); break;
      case 'export-report': alert('Report export coming in Phase 2.'); break;
    }
  };

  if (!scan.disclaimerAccepted) {
    return <Disclaimer onAccept={scan.acceptDisclaimer} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-midnight-950 via-midnight-950 to-midnight-900">
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-midnight-900/80 backdrop-blur-md border-b border-midnight-800/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-redhawk-600 to-redhawk-800 flex items-center justify-center shadow-lg shadow-redhawk-600/20">
              <span className="text-white font-bold text-sm tracking-tight">RH</span>
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-bold text-gray-100 leading-tight tracking-tight">RedHawk</h1>
              <span className="text-[10px] font-medium text-gray-600 bg-midnight-800 px-1.5 py-0.5 rounded uppercase tracking-wider">v0.1</span>
            </div>
            <p className="text-[11px] text-gray-600">Reconnaissance Suite</p>
          </div>

          {/* Quick status dots */}
          <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-midnight-800">
            {scan.depsStatus && (
              <>
                <StatusIndicator label="Nmap" ok={scan.depsStatus.nmap} />
                <StatusIndicator label="Python" ok={scan.depsStatus.python} />
              </>
            )}
            {scan.depsChecking && (
              <span className="text-xs text-gray-500 animate-pulse flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking deps...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!scan.depsStatus?.all && !scan.depsChecking && (
            <button onClick={scan.installDeps} className="btn-secondary text-xs py-1.5 px-3">
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install Deps
              </span>
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`btn-ghost text-xs transition-all ${sidebarOpen ? 'bg-midnight-700/50 text-gray-200' : ''}`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </span>
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 space-y-4">
            {/* Target input */}
            <TargetInput
              target={scan.target}
              onTargetChange={scan.setTarget}
              onScan={scan.startScan}
              isScanning={scan.phase === 'scanning'}
            />

            {/* Kill chain - only show after first scan */}
            {scan.phase !== 'idle' && <KillChainBar currentPhase={scan.phase} />}

            {/* Scan progress */}
            <ScanProgress
              phase={scan.phase}
              messages={scan.statusMessages}
              output={scan.scanOutput}
            />

            {/* Action prompt */}
            {scan.phase === 'complete' && (
              <ActionPrompt results={scan.results} actions={ACTIONS} onAction={handleAction} />
            )}

            {/* Results */}
            <ResultsPanel results={scan.results} phase={scan.phase} />
          </div>
        </div>

        {/* ── HISTORY SIDEBAR ── */}
        <div className={`
          transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 border-l border-midnight-800/50
          ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'}
        `}>
          {sidebarOpen && (
            <aside className="w-80 h-full bg-midnight-900/50 backdrop-blur-sm overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Scan History
                  </h3>
                  <span className="text-[10px] text-gray-600 bg-midnight-800 px-2 py-0.5 rounded-full">
                    {scan.history.length}
                  </span>
                </div>

                {scan.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                    <svg className="w-10 h-10 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs">No scans yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scan.history.map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="group p-3 rounded-lg bg-midnight-800/30 border border-midnight-700/30 cursor-pointer
                                   hover:bg-midnight-700/40 hover:border-midnight-600/50 transition-all duration-150"
                        onClick={() => scan.setTarget(entry.target)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-mono text-gray-200 truncate group-hover:text-redhawk-400 transition-colors">
                            {entry.target}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1.5 font-medium">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.results?.nmap?.openPortCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/40">
                              {entry.results.nmap.openPortCount} open ports
                            </span>
                          )}
                          {entry.results?.whois && !('error' in entry.results.whois) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/40">
                              WHOIS
                            </span>
                          )}
                          {entry.results?.dns && !('error' in entry.results.dns) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-700/40">
                              DNS
                            </span>
                          )}
                          {entry.results?.subdomains?.count > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/40">
                              {entry.results.subdomains.count} subs
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
      </div>

      {/* ── STATUS BAR ── */}
      <footer className="flex items-center justify-between px-6 py-2 bg-midnight-900/80 backdrop-blur-md border-t border-midnight-800/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Phase status with icon */}
          <div className="flex items-center gap-1.5">
            <span className={`
              w-2 h-2 rounded-full transition-all duration-500
              ${scan.phase === 'idle' ? 'bg-gray-600' : ''}
              ${scan.phase === 'scanning' ? 'bg-redhawk-500 animate-pulse' : ''}
              ${scan.phase === 'complete' ? 'bg-green-500' : ''}
              ${scan.phase === 'error' ? 'bg-redhawk-500' : ''}
            `} />
            <span className="text-xs text-gray-500 font-medium">
              {scan.phase === 'idle' && 'Ready'}
              {scan.phase === 'scanning' && 'Scan in progress...'}
              {scan.phase === 'complete' && `Scan complete — ${scan.results?.nmap?.openPortCount || 0} open ports found`}
              {scan.phase === 'error' && 'Error occurred'}
            </span>
          </div>

          {/* Quick target display */}
          {scan.target && (
            <span className="text-xs text-gray-600 font-mono hidden sm:block">
              Target: {scan.target}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span className="hidden sm:inline">Ctrl+Enter to scan</span>
          <span className="text-midnight-700">|</span>
          <span className="text-gray-700">For authorized testing only</span>
        </div>
      </footer>
    </div>
  );
}
