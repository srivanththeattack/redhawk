import React, { useRef, useEffect } from 'react';
import type { ScanResults } from '../types/target';
import type { ScanTaskState, ScanTaskStatus } from '../store/scan-store';
import { DnsCard } from './DnsCard';
import { WhoisCard } from './WhoisCard';
import { PortsCard } from './PortsCard';

interface ResultsPanelProps {
  results: ScanResults | null;
  phase: string;
  scanTasks: ScanTaskState;
  /** Called when a scan section scrolls into view */
  onSectionRender?: (id: string, el: HTMLDivElement) => void;
  /** Section to prioritize at the top and scroll to */
  lastRunSection?: string | null;
}

const STATUS_LABELS: Record<ScanTaskStatus, { label: string; color: string }> = {
  idle: { label: 'Not run', color: 'text-gray-600' },
  running: { label: 'Running…', color: 'text-yellow-400 animate-pulse' },
  complete: { label: 'Complete', color: 'text-green-400' },
  error: { label: 'Error', color: 'text-redhawk-400' },
};

function StatusBadge({ status }: { status: ScanTaskStatus }) {
  const s = STATUS_LABELS[status];
  return <span className={`text-[10px] font-medium ${s.color}`}>{s.label}</span>;
}

function ScanSection({
  id,
  title,
  icon,
  status,
  children,
  onSectionRender,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  icon: string;
  status: ScanTaskStatus;
  children: React.ReactNode;
  onSectionRender?: (id: string, el: HTMLDivElement) => void;
  defaultOpen?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(defaultOpen);

  useEffect(() => {
    if (sectionRef.current && onSectionRender) {
      onSectionRender(id, sectionRef.current);
    }
  }, []);

  return (
    <div
      ref={sectionRef}
      data-scan-section={id}
      className={`card border-l-4 transition-all ${
        status === 'running' ? 'border-l-yellow-500 border-yellow-900/30 bg-yellow-950/10' :
        status === 'complete' ? 'border-l-green-600' :
        status === 'error' ? 'border-l-redhawk-600' :
        'border-l-midnight-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          <StatusBadge status={status} />
        </div>
        {status !== 'idle' && (
          <button
            onClick={() => setOpen(!open)}
            className="btn-ghost text-xs text-gray-500"
          >
            {open ? '▲ Collapse' : '▼ Expand'}
          </button>
        )}
      </div>

      {status !== 'idle' && open && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Collapsible raw output ──
function RawOutput({ data }: { data: any }) {
  const [open, setOpen] = React.useState(false);
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
      >
        {open ? '▼' : '▶'} Raw Output {open ? 'hide' : 'show'}
      </button>
      {open && (
        <pre className="terminal text-[10px] max-h-60 overflow-auto mt-1 whitespace-pre-wrap">
          {json}
        </pre>
      )}
    </div>
  );
}

export function ResultsPanel({ results, phase, scanTasks, onSectionRender, lastRunSection }: ResultsPanelProps) {
  if (!results) {
    if (phase === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-lg font-medium">Enter a target to begin</p>
          <p className="text-sm mt-1">Results will appear here after a scan</p>
        </div>
      );
    }
    return null;
  }

  const hasError = results.error;

  // Define all scan sections as data
  const allSections: Array<{
    id: string;
    title: string;
    icon: string;
    status: ScanTaskStatus;
    render: () => React.ReactNode;
  }> = [
    { id: 'whois', title: 'WHOIS Lookup', icon: '📋', status: scanTasks.whois, render: () => (
      results.whois ? <WhoisCard data={results.whois} /> : <p className="text-xs text-gray-500">No WHOIS data available.</p>
    )},
    { id: 'dns', title: 'DNS Enumeration', icon: '🌐', status: scanTasks.dns, render: () => (
      results.dns ? <DnsCard data={results.dns} /> : <p className="text-xs text-gray-500">No DNS data available.</p>
    )},
    { id: 'subdomains', title: 'Subdomain Enumeration', icon: '🌍', status: scanTasks.subdomains, render: () => {
      const d = results.subdomains as any;
      return d && !('error' in d) && d?.subdomains?.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {d.subdomains.map((sub: string, i: number) => (
            <span key={i} className="badge bg-midnight-800 text-gray-300 border border-midnight-600 text-xs font-mono">{sub}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{d && 'error' in d ? d.error || 'Lookup failed.' : 'No subdomains found.'}</p>
      );
    }},
    { id: 'emails', title: 'Email OSINT', icon: '📧', status: scanTasks.emails, render: () => {
      const d = results.emails as any;
      return d && !('error' in d) && d?.emails?.length > 0 ? (
        <div className="space-y-1">
          {d.emails.map((e: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-300 font-mono">
              <span className="text-gray-600">📧</span>{e.email}{e.source && <span className="text-xs text-gray-600">({e.source})</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{d && 'error' in d ? d.error || 'Lookup failed.' : 'No email addresses found.'}</p>
      );
    }},
    { id: 'nmap', title: 'Port Scan', icon: '🔍', status: scanTasks.nmap, render: () => (
      results.nmap ? <PortsCard ports={results.nmap.ports} host={results.nmap.host} summary={results.nmap.summary} /> : <p className="text-xs text-gray-500">No port scan data available.</p>
    )},
    { id: 'ssl', title: 'SSL Certificate', icon: '🔒', status: scanTasks.ssl, render: () => {
      const d = results.ssl as any;
      return d && !('error' in d) ? (
        <div className="space-y-1.5 text-xs font-mono">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">Domain:</span><span className="text-gray-300">{d.domain}</span>
            <span className="text-gray-500">Issuer:</span><span className="text-gray-300">{d.issuer?.O || d.issuer?.CN || 'N/A'}</span>
            <span className="text-gray-500">Valid From:</span><span className="text-gray-300">{d.validFrom}</span>
            <span className="text-gray-500">Valid To:</span><span className="text-gray-300">{d.validTo}</span>
            <span className="text-gray-500">Fingerprint:</span><span className="text-gray-300 text-[10px]">{d.fingerprint}</span>
            <span className="text-gray-500">Key Bits:</span><span className="text-gray-300">{d.bits}</span>
            <span className="text-gray-500">Signature:</span><span className="text-gray-300">{d.signatureAlgorithm}</span>
          </div>
          {d.subjectalt?.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-500 mb-1">Subject Alternative Names:</p>
              <div className="flex flex-wrap gap-1">
                {d.subjectalt.map((name: string, i: number) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-midnight-800 rounded text-gray-400">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No SSL data available.'}</p>;
    }},
    { id: 'httpHeaders', title: 'HTTP Headers', icon: '📡', status: scanTasks.httpHeaders, render: () => {
      const d = results.httpHeaders as any;
      return d && !('error' in d) ? (
        <div className="space-y-1">
          <div className="flex gap-2 text-xs text-gray-500 mb-2">
            <span>Status: <span className="text-gray-300">{d.statusCode} {d.statusMessage}</span></span>
            <span>HTTP/{d.httpVersion}</span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {Object.entries(d.headers || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="flex gap-2 text-[10px] font-mono">
                <span className="text-blue-400 min-w-[120px]">{key}:</span>
                <span className="text-gray-400 break-all">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No HTTP headers data.'}</p>;
    }},
    { id: 'waf', title: 'WAF Detection', icon: '🛡️', status: scanTasks.waf, render: () => {
      const d = results.waf as any;
      return d && !('error' in d) ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            {d.detected ? <span className="text-xs text-yellow-400 font-medium">⚠️ WAF Detected</span> : <span className="text-xs text-green-400">✅ No WAF detected</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {d.wafs?.map((waf: string, i: number) => (
              <span key={i} className="text-[10px] px-2 py-1 bg-midnight-800 border border-midnight-700 rounded text-gray-300">{waf}</span>
            ))}
          </div>
          {d.possiblyBlocked && <p className="text-[10px] text-yellow-600">Some probes were blocked (403/406/429) — WAF may be active</p>}
          <div className="text-[10px] text-gray-500 mt-1">
            {d.probes?.map((p: any, i: number) => (
              <span key={i} className="block">Probe {i + 1}: {p.probe} → {p.statusCode} {p.blocked ? '(blocked)' : '(passed)'}</span>
            ))}
          </div>
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No WAF data.'}</p>;
    }},
    { id: 'tech', title: 'Technology Fingerprint', icon: '⚙️', status: scanTasks.tech, render: () => {
      const d = results.tech as any;
      return d && !('error' in d) ? (
        <div className="flex flex-wrap gap-1.5">
          {d.technologies?.length > 0 ? d.technologies.map((t: string, i: number) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-midnight-800 border border-midnight-700 rounded text-gray-300">{t}</span>
          )) : <p className="text-xs text-gray-500">No technologies detected.</p>}
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No tech data.'}</p>;
    }},
    { id: 'dirBrute', title: 'Directory Bruteforce', icon: '📁', status: scanTasks.dirBrute, render: () => {
      const d = results.dirBrute as any;
      return d && !('error' in d) ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500">Found {d.found?.length || 0}/{d.total} paths</p>
          {d.found?.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {d.found.map((item: any, i: number) => (
                <div key={i} className="flex gap-3 text-[10px] font-mono">
                  <span className={item.status === 200 ? 'text-green-400' : item.status === 301 || item.status === 302 ? 'text-yellow-400' : 'text-gray-500'}>[{item.status}]</span>
                  <span className="text-gray-300">{item.path}</span>
                  <span className="text-gray-600">{item.size} bytes</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No interesting paths found.</p>}
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No directory brute data.'}</p>;
    }},
    { id: 'serviceScan', title: 'Service Version Scan', icon: '🔬', status: scanTasks.serviceScan, render: () => {
      const d = results.serviceScan as any;
      return d && !('error' in d) ? <PortsCard ports={d.ports} host={d.host} summary={d.summary} /> : <p className="text-xs text-gray-500">{d?.error || 'No service scan data.'}</p>;
    }},
    { id: 'vulnScan', title: 'Vulnerability Scan', icon: '💀', status: scanTasks.vulnScan, render: () => {
      const d = results.vulnScan as any;
      return d && !('error' in d) ? (
        <div className="space-y-2">
          {d.ports?.filter((p: any) => p.service?.toLowerCase().includes('vuln') || p.portid === '0')?.length > 0 ? (
            <div className="space-y-1.5">
              {d.ports.filter((p: any) => p.portid !== '0').map((port: any, i: number) => (
                <div key={i} className="p-2 rounded bg-midnight-800/30 border border-midnight-700/30">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-300">{port.portid}/{port.protocol}</span>
                    <span className="text-gray-500">{port.service}</span>
                    {port.product && <span className="text-gray-500">{port.product} {port.version || ''}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No specific vulnerabilities detected by NSE scripts.</p>}
          <p className="text-[10px] text-gray-600">This runs nmap --script vuln — results depend on NSE script coverage.</p>
        </div>
      ) : <p className="text-xs text-gray-500">{d?.error || 'No vuln scan data.'}</p>;
    }},
  ];

  // Sort: last-run section first, then rest in fixed order
  const sortedSections = [...allSections].sort((a, b) => {
    if (a.id === lastRunSection) return -1;
    if (b.id === lastRunSection) return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Target header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Results for <span className="font-mono text-redhawk-400">{results.target}</span>
          </h2>
          <p className="text-xs text-gray-500">
            Scanned at {new Date(results.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {hasError && (
        <div className="card border-redhawk-700 bg-redhawk-900/20">
          <p className="text-redhawk-400 text-sm">{results.error}</p>
        </div>
      )}

      {/* Render sorted sections, only showing non-idle ones */}
      {sortedSections.map((section) => (
        section.status !== 'idle' && (
          <ScanSection key={section.id} id={section.id} title={section.title} icon={section.icon}
            status={section.status} onSectionRender={onSectionRender}>
            {section.render()}
            <RawOutput data={(results as any)[section.id]} />
          </ScanSection>
        )
      ))}
    </div>
  );
}
