import React, { useCallback, useState } from 'react';
import type { ScanResults, WhoisInfo, DnsRecord, NmapPort, OsintEmail, NmapResult } from '../types/target';

interface ReportExporterProps {
  results: ScanResults | null;
  phase: string;
}

function generateReportHtml(results: ScanResults): string {
  const { target, timestamp, whois, dns, subdomains, emails, nmap } = results;
  const date = new Date(timestamp).toLocaleString();

  const section = (title: string, content: string, icon = '📋') => `
    <div class="section">
      <h2>${icon} ${title}</h2>
      ${content}
    </div>
  `;

  const whoisHtml = whois
    ? ('error' in whois
        ? `<div class="error">${whois.error}</div>`
        : `
          <table>
            ${whois.domain ? `<tr><td class="label">Domain</td><td>${esc(whois.domain)}</td></tr>` : ''}
            ${whois.registrar ? `<tr><td class="label">Registrar</td><td>${esc(whois.registrar)}</td></tr>` : ''}
            ${whois.orgName ? `<tr><td class="label">Organization</td><td>${esc(whois.orgName)}</td></tr>` : ''}
            ${whois.country ? `<tr><td class="label">Country</td><td>${esc(whois.country)}</td></tr>` : ''}
            ${whois.creationDate ? `<tr><td class="label">Created</td><td>${esc(whois.creationDate)}</td></tr>` : ''}
            ${whois.expirationDate ? `<tr><td class="label">Expires</td><td>${esc(whois.expirationDate)}</td></tr>` : ''}
            ${whois.nameServers?.length ? `<tr><td class="label">Name Servers</td><td>${whois.nameServers.map(esc).join('<br>')}</td></tr>` : ''}
            ${whois.emails?.length ? `<tr><td class="label">Emails</td><td>${whois.emails.map(esc).join('<br>')}</td></tr>` : ''}
          </table>
          ${whois.raw ? `<details><summary>Raw WHOIS</summary><pre>${esc(whois.raw)}</pre></details>` : ''}
        `)
    : '<div class="empty">Not scanned</div>';

  const dnsHtml = dns
    ? ('error' in dns
        ? `<div class="error">${dns.error}</div>`
        : dns.records?.length
          ? `<table>
              <tr><th>Type</th><th>Name</th><th>Value</th><th>TTL</th></tr>
              ${dns.records.map(r => `<tr><td>${esc(r.type)}</td><td>${esc(r.name)}</td><td>${esc(r.value)}</td><td>${r.ttl ? esc(r.ttl) : '-'}</td></tr>`).join('')}
            </table>`
          : '<div class="empty">No DNS records found</div>')
    : '<div class="empty">Not scanned</div>';

  const subdomainHtml = subdomains
    ? ('error' in subdomains
        ? `<div class="error">${subdomains.error}</div>`
        : subdomains.subdomains?.length
          ? `<ul>${subdomains.subdomains.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`
          : '<div class="empty">No subdomains found</div>')
    : '<div class="empty">Not scanned</div>';

  const emailHtml = emails
    ? ('error' in emails
        ? `<div class="error">${emails.error}</div>`
        : emails.emails?.length
          ? `<table>
              <tr><th>Email</th><th>Source</th><th>Confidence</th></tr>
              ${emails.emails.map(e => `<tr><td>${esc(e.email)}</td><td>${e.source ? esc(e.source) : '-'}</td><td>${e.confidence ? esc(e.confidence) : '-'}</td></tr>`).join('')}
            </table>`
          : '<div class="empty">No emails found</div>')
    : '<div class="empty">Not scanned</div>';

  const nmapHtml = nmap
    ? (() => {
        const n = nmap as NmapResult;
        return `
          <div class="summary">${esc(n.summary)}</div>
          ${n.host ? `<table><tr><td class="label">IP</td><td>${esc(n.host.ip)}</td></tr><tr><td class="label">Hostname</td><td>${n.host.hostname ? esc(n.host.hostname) : '-'}</td></tr><tr><td class="label">OS</td><td>${n.host.os ? esc(n.host.os) : 'Unknown'}</td></tr></table>` : ''}
          ${n.ports?.length
            ? `<table>
                <tr><th>Port</th><th>Protocol</th><th>State</th><th>Service</th><th>Version</th></tr>
                ${n.ports.map(p => `<tr><td>${esc(p.portid)}</td><td>${esc(p.protocol)}</td><td><span class="status-${p.state}">${esc(p.state)}</span></td><td>${esc(p.service)}</td><td>${p.product ? esc(p.product) + (p.version ? ' ' + esc(p.version) : '') : '-'}</td></tr>`).join('')}
              </table>`
            : '<div class="empty">No open ports found</div>'}
        `;
      })()
    : '<div class="empty">Not scanned</div>';

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RedHawk Report — ${esc(target)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e1a;
      color: #c8d0e0;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, #1a1040, #0d1b2a);
      border-radius: 12px;
      border: 1px solid #1e2a45;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 24px; color: #ff4455; margin-bottom: 8px; }
    .header .meta { color: #6b7a8f; font-size: 13px; }
    .header .target { font-size: 18px; color: #e0e8f0; font-family: monospace; margin: 8px 0; }
    .section {
      background: #0f1525;
      border: 1px solid #1a2440;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 16px;
    }
    .section h2 { font-size: 16px; color: #ff6677; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1a2440; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 10px; background: #141c30; color: #8899bb; font-weight: 600; border-bottom: 1px solid #1a2440; }
    td { padding: 6px 10px; border-bottom: 1px solid #141c30; vertical-align: top; }
    .label { color: #6b7a8f; font-weight: 500; width: 160px; white-space: nowrap; }
    .empty { color: #4a5568; font-style: italic; padding: 8px 0; }
    .error { color: #ff4455; padding: 8px 0; }
    .summary { color: #8899bb; font-size: 13px; margin-bottom: 12px; }
    ul { columns: 3; list-style: none; padding: 0; }
    li { padding: 3px 8px; font-family: monospace; font-size: 12px; color: #a0b0c8; }
    details { margin-top: 12px; }
    summary { cursor: pointer; color: #6b7a8f; font-size: 12px; }
    pre { margin-top: 8px; padding: 12px; background: #080c18; border-radius: 6px; font-size: 11px; color: #6b7a8f; overflow-x: auto; max-height: 300px; }
    .status-open { color: #22c55e; font-weight: 600; }
    .status-filtered { color: #f59e0b; }
    .status-closed { color: #6b7280; }
    .footer { text-align: center; color: #3a4a5a; font-size: 11px; margin-top: 30px; }
    @media print { body { padding: 20px; } .section { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦅 RedHawk — Recon Report</h1>
    <div class="target">${esc(target)}</div>
    <div class="meta">Generated: ${esc(date)}</div>
  </div>

  ${section('WHOIS', whoisHtml, '📋')}
  ${section('DNS Records', dnsHtml, '🌐')}
  ${section('Subdomains', subdomainHtml, '🌍')}
  ${section('Emails / OSINT', emailHtml, '📧')}
  ${section('Port Scan', nmapHtml, '🔍')}

  <div class="footer">
    Generated by RedHawk v0.1.1 — Red Teaming Suite
  </div>
</body>
</html>`;
}

export function ReportExporter({ results, phase }: ReportExporterProps) {
  const [saving, setSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasData = results && (results.whois || results.dns || results.subdomains || results.emails || results.nmap);

  const handleSave = useCallback(async () => {
    if (!results) return;
    setSaving(true);
    setError(null);
    setSavedPath(null);

    try {
      const html = generateReportHtml(results);
      const result = await window.api.saveReport(html);
      if (result.success) {
        setSavedPath(result.filePath);
      } else if (result.error !== 'Cancelled') {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [results]);

  if (!hasData && phase !== 'complete') return null;

  return (
    <div className="border-t border-midnight-800/50 pt-6 mt-8">
      <div className="card p-5 border-dashed border-midnight-700/40 bg-midnight-950/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-redhawk-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Report
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Save scan results as a formatted HTML report
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedPath && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            {error && (
              <span className="text-xs text-redhawk-400">{error}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasData}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Save as Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
