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

export function ResultsPanel({ results, phase, scanTasks, onSectionRender }: ResultsPanelProps) {
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

      {/* ── WHOIS section ── */}
      <ScanSection id="whois" title="WHOIS Lookup" icon="📋"
        status={scanTasks.whois} onSectionRender={onSectionRender}>
        {results.whois ? (
          <WhoisCard data={results.whois} />
        ) : (
          <p className="text-xs text-gray-500">No WHOIS data available.</p>
        )}
        <RawOutput data={results.whois} />
      </ScanSection>

      {/* ── DNS section ── */}
      <ScanSection id="dns" title="DNS Enumeration" icon="🌐"
        status={scanTasks.dns} onSectionRender={onSectionRender}>
        {results.dns ? (
          <DnsCard data={results.dns} />
        ) : (
          <p className="text-xs text-gray-500">No DNS data available.</p>
        )}
        <RawOutput data={results.dns} />
      </ScanSection>

      {/* ── Subdomains section ── */}
      <ScanSection id="subdomains" title="Subdomain Enumeration" icon="🌍"
        status={scanTasks.subdomains} onSectionRender={onSectionRender}>
        {results.subdomains && !('error' in results.subdomains) && results.subdomains.subdomains?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {results.subdomains.subdomains.map((sub, i) => (
              <span key={i}
                className="badge bg-midnight-800 text-gray-300 border border-midnight-600 text-xs font-mono"
              >{sub}</span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {results.subdomains && 'error' in results.subdomains
              ? (results.subdomains as any).error || 'Lookup failed.'
              : 'No subdomains found.'}
          </p>
        )}
        <RawOutput data={results.subdomains} />
      </ScanSection>

      {/* ── Emails section ── */}
      <ScanSection id="emails" title="Email OSINT" icon="📧"
        status={scanTasks.emails} onSectionRender={onSectionRender}>
        {results.emails && !('error' in results.emails) && results.emails.emails?.length > 0 ? (
          <div className="space-y-1">
            {results.emails.emails.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                <span className="text-gray-600">📧</span>
                {e.email}
                {e.source && <span className="text-xs text-gray-600">({e.source})</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {results.emails && 'error' in results.emails
              ? (results.emails as any).error || 'Lookup failed.'
              : 'No email addresses found.'}
          </p>
        )}
        <RawOutput data={results.emails} />
      </ScanSection>

      {/* ── Port scan section ── */}
      <ScanSection id="nmap" title="Port Scan" icon="🔍"
        status={scanTasks.nmap} onSectionRender={onSectionRender}>
        {results.nmap ? (
          <PortsCard
            ports={results.nmap.ports}
            host={results.nmap.host}
            summary={results.nmap.summary}
          />
        ) : (
          <p className="text-xs text-gray-500">No port scan data available.</p>
        )}
        <RawOutput data={results.nmap} />
      </ScanSection>
    </div>
  );
}
