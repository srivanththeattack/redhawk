import React from 'react';
import type { ScanResults } from '../types/target';
import { DnsCard } from './DnsCard';
import { WhoisCard } from './WhoisCard';
import { PortsCard } from './PortsCard';

interface ResultsPanelProps {
  results: ScanResults | null;
  phase: string;
}

export function ResultsPanel({ results, phase }: ResultsPanelProps) {
  if (!results) {
    if (phase === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-lg font-medium">Enter a target to begin reconnaissance</p>
          <p className="text-sm mt-1">Results will appear here after scanning</p>
        </div>
      );
    }
    return null;
  }

  const hasError = results.error;

  return (
    <div className="space-y-4">
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
        <button
          onClick={() => window.api.runQuickScan(results.target)}
          className="btn-secondary text-sm"
        >
          ↻ Rescan
        </button>
      </div>

      {hasError && (
        <div className="card border-redhawk-700 bg-redhawk-900/20">
          <p className="text-redhawk-400 text-sm">{results.error}</p>
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WhoisCard data={results.whois} />
        <DnsCard data={results.dns} />
      </div>

      {/* Subdomains */}
      {results.subdomains && !('error' in results.subdomains) && results.subdomains.subdomains?.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Subdomains</span>
            <span className="text-xs text-gray-500 font-normal">
              {results.subdomains.subdomains.length} found
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {results.subdomains.subdomains.map((sub, i) => (
              <span
                key={i}
                className="badge bg-midnight-800 text-gray-300 border border-midnight-600 text-xs font-mono"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emails */}
      {results.emails && !('error' in results.emails) && results.emails.emails?.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Email Addresses</span>
            <span className="text-xs text-gray-500 font-normal">
              {results.emails.emails.length} found
            </span>
          </div>
          <div className="space-y-1">
            {results.emails.emails.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                <span className="text-gray-600">📧</span>
                {e.email}
                {e.source && (
                  <span className="text-xs text-gray-600">({e.source})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Port scan results */}
      {results.nmap && (
        <PortsCard
          ports={results.nmap.ports}
          host={results.nmap.host}
          summary={results.nmap.summary}
        />
      )}
    </div>
  );
}
