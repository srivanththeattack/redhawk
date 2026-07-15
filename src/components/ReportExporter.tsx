import React, { useCallback, useState } from 'react';
import type { ScanResults, NmapResult } from '../types/target';

interface ReportExporterProps {
  results: ScanResults | null;
  phase: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hasData(value: any): boolean {
  return value != null && !('error' in value);
}

function renderNmapHtml(n: NmapResult): string {
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
}

function generateReportHtml(results: ScanResults): string {
  const { target, timestamp, whois, dns, subdomains, emails, nmap, ssl, httpHeaders, waf, tech, dirBrute, serviceScan, vulnScan } = results;
  const date = new Date(timestamp).toLocaleString();

  const section = (title: string, content: string) => {
    if (!content) return '';
    return `
    <div class="section">
      <h2>${title}</h2>
      ${content}
    </div>`;
  };

  // Only render sections that actually have data
  const sections: { title: string; content: string }[] = [];

  if (hasData(whois)) {
    const w = whois as any;
    sections.push({
      title: '📋 WHOIS Lookup',
      content: `
        <table>
          ${w.domain ? `<tr><td class="label">Domain</td><td>${esc(w.domain)}</td></tr>` : ''}
          ${w.registrar ? `<tr><td class="label">Registrar</td><td>${esc(w.registrar)}</td></tr>` : ''}
          ${w.orgName ? `<tr><td class="label">Organization</td><td>${esc(w.orgName)}</td></tr>` : ''}
          ${w.country ? `<tr><td class="label">Country</td><td>${esc(w.country)}</td></tr>` : ''}
          ${w.creationDate ? `<tr><td class="label">Created</td><td>${esc(w.creationDate)}</td></tr>` : ''}
          ${w.expirationDate ? `<tr><td class="label">Expires</td><td>${esc(w.expirationDate)}</td></tr>` : ''}
          ${w.nameServers?.length ? `<tr><td class="label">Name Servers</td><td>${w.nameServers.map(esc).join('<br>')}</td></tr>` : ''}
          ${w.emails?.length ? `<tr><td class="label">Emails</td><td>${w.emails.map(esc).join('<br>')}</td></tr>` : ''}
        </table>
        ${w.raw ? `<details><summary>Raw WHOIS</summary><pre>${esc(w.raw)}</pre></details>` : ''}
      `,
    });
  }

  if (hasData(dns)) {
    const d = dns as any;
    sections.push({
      title: '🌐 DNS Records',
      content: d.records?.length
        ? `<table>
            <tr><th>Type</th><th>Name</th><th>Value</th><th>TTL</th></tr>
            ${d.records.map((r: any) => `<tr><td>${esc(r.type)}</td><td>${esc(r.name)}</td><td>${esc(r.value)}</td><td>${r.ttl ? esc(r.ttl) : '-'}</td></tr>`).join('')}
          </table>`
        : '<div class="empty">No DNS records found</div>',
    });
  }

  if (hasData(subdomains)) {
    const s = subdomains as any;
    sections.push({
      title: '🌍 Subdomains',
      content: s.subdomains?.length
        ? `<ul>${s.subdomains.map((sub: string) => `<li>${esc(sub)}</li>`).join('')}</ul>`
        : '<div class="empty">No subdomains found</div>',
    });
  }

  if (hasData(emails)) {
    const e = emails as any;
    sections.push({
      title: '📧 Email OSINT',
      content: e.emails?.length
        ? `<table>
            <tr><th>Email</th><th>Source</th><th>Confidence</th></tr>
            ${e.emails.map((em: any) => `<tr><td>${esc(em.email)}</td><td>${em.source ? esc(em.source) : '-'}</td><td>${em.confidence ? esc(em.confidence) : '-'}</td></tr>`).join('')}
          </table>`
        : '<div class="empty">No emails found</div>',
    });
  }

  if (hasData(nmap)) {
    sections.push({ title: '🔍 Port Scan', content: renderNmapHtml(nmap as NmapResult) });
  }

  if (hasData(ssl)) {
    const s = ssl as any;
    sections.push({
      title: '🔒 SSL Certificate',
      content: `
        <div class="grid-2">
          <div><span class="label">Domain</span><span>${esc(s.domain)}</span></div>
          <div><span class="label">Issuer</span><span>${s.issuer?.O || s.issuer?.CN || 'N/A'}</span></div>
          <div><span class="label">Valid From</span><span>${s.validFrom || 'N/A'}</span></div>
          <div><span class="label">Valid To</span><span>${s.validTo || 'N/A'}</span></div>
          <div><span class="label">Fingerprint</span><span style="font-size:10px">${s.fingerprint || 'N/A'}</span></div>
          <div><span class="label">Key Bits</span><span>${s.bits || 'N/A'}</span></div>
          <div><span class="label">Signature</span><span>${s.signatureAlgorithm || 'N/A'}</span></div>
        </div>
        ${s.subjectalt?.length ? `<details><summary>Subject Alternative Names (${s.subjectalt.length})</summary><ul>${s.subjectalt.map((n: string) => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
      `,
    });
  }

  if (hasData(httpHeaders)) {
    const h = httpHeaders as any;
    sections.push({
      title: '📡 HTTP Headers',
      content: `
        <div class="grid-2" style="margin-bottom:8px">
          <div><span class="label">Status</span><span>${h.statusCode} ${h.statusMessage || ''}</span></div>
          <div><span class="label">HTTP Version</span><span>${h.httpVersion || 'N/A'}</span></div>
        </div>
        <table>
          <tr><th>Header</th><th>Value</th></tr>
          ${Object.entries(h.headers || {}).map(([key, val]: [string, any]) =>
            `<tr><td style="color:#60a5fa">${esc(key)}</td><td style="font-size:11px">${esc(Array.isArray(val) ? val.join(', ') : String(val))}</td></tr>`
          ).join('')}
        </table>
      `,
    });
  }

  if (hasData(waf)) {
    const w = waf as any;
    sections.push({
      title: '🛡️ WAF Detection',
      content: `
        <div class="grid-2">
          <div><span class="label">Status</span><span>${w.detected ? '⚠️ WAF Detected' : '✅ No WAF detected'}</span></div>
        </div>
        ${w.wafs?.length ? `<div style="margin-top:8px">${w.wafs.map((wf: string) => `<span class="tag">${esc(wf)}</span>`).join(' ')}</div>` : ''}
        ${w.possiblyBlocked ? '<p style="color:#f59e0b;font-size:12px;margin-top:8px">Some probes were blocked — WAF may be active</p>' : ''}
      `,
    });
  }

  if (hasData(tech)) {
    const t = tech as any;
    sections.push({
      title: '⚙️ Technology Fingerprint',
      content: t.technologies?.length
        ? `<div class="tag-list">${t.technologies.map((techName: string) => `<span class="tag">${esc(techName)}</span>`).join('')}</div>`
        : '<div class="empty">No technologies detected</div>',
    });
  }

  if (hasData(dirBrute)) {
    const d = dirBrute as any;
    sections.push({
      title: '📁 Directory Bruteforce',
      content: `
        <p style="font-size:12px;color:#6b7a8f;margin-bottom:8px">Found ${d.found?.length || 0}/${d.total} paths</p>
        ${d.found?.length ? `<table><tr><th>Status</th><th>Path</th><th>Size</th></tr>${d.found.map((item: any) => `
          <tr>
            <td><span class="status-${item.status === 200 ? 'open' : item.status < 400 ? 'filtered' : 'closed'}">${item.status}</span></td>
            <td style="font-family:monospace">${esc(item.path)}</td>
            <td>${item.size} bytes</td>
          </tr>`).join('')}</table>` : '<div class="empty">No interesting paths found</div>'
        }
      `,
    });
  }

  if (hasData(serviceScan)) {
    sections.push({ title: '🔬 Service Version Scan', content: renderNmapHtml(serviceScan as NmapResult) });
  }

  if (hasData(vulnScan)) {
    const v = vulnScan as any;
    sections.push({
      title: '💀 Vulnerability Scan',
      content: `
        ${v.ports?.filter((p: any) => p.portid !== '0').length ? `
          <table><tr><th>Port</th><th>Service</th><th>Product</th></tr>
          ${v.ports.filter((p: any) => p.portid !== '0').map((p: any) => `
            <tr><td style="font-family:monospace">${esc(p.portid)}/${esc(p.protocol)}</td><td>${esc(p.service)}</td><td>${p.product ? esc(p.product) + (p.version ? ' ' + esc(p.version) : '') : '-'}</td></tr>
          `).join('')}</table>
        ` : '<div class="empty">No specific vulnerabilities detected</div>'}
        <p style="font-size:10px;color:#4a5568;margin-top:8px">Ran nmap --script vuln — results depend on NSE script coverage</p>
      `,
    });
  }

  if (sections.length === 0) return '';

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
    .label { color: #6b7a8f; font-weight: 500; white-space: nowrap; margin-right: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13px; }
    .grid-2 .label { display: inline-block; width: 100px; }
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
    .tag { display: inline-block; padding: 2px 8px; margin: 2px; background: #141c30; border: 1px solid #1a2440; border-radius: 4px; font-size: 11px; color: #a0b0c8; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
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

  ${sections.map(s => section(s.title, s.content)).join('\n')}

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
  const [savingOpReport, setSavingOpReport] = useState(false);

  const hasData = results && (results.whois || results.dns || results.subdomains || results.emails || results.nmap || results.ssl || results.httpHeaders || results.waf || results.tech || results.dirBrute || results.serviceScan || results.vulnScan);

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

  const handleOpReport = useCallback(async () => {
    setSavingOpReport(true);
    try {
      const currentOp = await window.api.opGetCurrent();
      if (!currentOp) {
        setError('No active operation. Create one first.');
        return;
      }
      const result = await window.api.opReport(currentOp.id);
      if (result.success) {
        setSavedPath(result.filePath);
      } else if (result.error !== 'Cancelled') {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingOpReport(false);
    }
  }, []);

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
              Export Reports
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Save scan results or full operation report as HTML
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
                  Save Scan Report
                </>
              )}
            </button>
            <button
              onClick={handleOpReport}
              disabled={savingOpReport}
              className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs border-midnight-600"
              title="Export full operation report with all targets and activity"
            >
              {savingOpReport ? (
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Save Operation Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
