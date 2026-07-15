import { useState } from 'react';
import type { MaigretResult } from '../types/target';

interface MaigretResultsProps {
  data: MaigretResult | { error: string };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function MaigretResults({ data }: MaigretResultsProps) {
  const [showRaw, setShowRaw] = useState(false);

  // Error state
  if ('error' in data && data.error) {
    const errData = data as Record<string, any>;
    return (
      <div className="card border-redhawk-700/50 bg-redhawk-900/10">
        <div className="card-header text-redhawk-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          Maigret Search Error
        </div>
        <p className="text-sm text-redhawk-300 mt-2 font-mono text-xs">{String(data.error)}</p>
        {errData._stderr && (
          <details className="mt-2">
            <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">Diagnostic output</summary>
            <pre className="text-[10px] text-gray-500 mt-1 max-h-32 overflow-auto whitespace-pre-wrap">{errData._stderr}</pre>
          </details>
        )}
      </div>
    );
  }

  const result = data as MaigretResult;
  const sites = result.sites || {};
  const siteNames = Object.keys(sites);
  const foundCount = siteNames.length;
  const totalChecked = result.total_sites_checked || 0;

  // No results found
  if (foundCount === 0 && result.error) {
    return (
      <div className="card border-yellow-700/30">
        <div className="card-header text-yellow-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4m0-4h.01" />
          </svg>
          No Results
        </div>
        <p className="text-sm text-gray-400 mt-2">{result.error}</p>
      </div>
    );
  }

  if (foundCount === 0) {
    return (
      <div className="card border-yellow-700/30">
        <div className="card-header text-yellow-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4m0-4h.01" />
          </svg>
          Maigret Search Complete
        </div>
        <p className="text-sm text-gray-400 mt-2">
          No profiles found for "<span className="font-mono text-gray-200">{result.username}</span>"
        </p>
        {totalChecked > 0 && (
          <p className="text-xs text-gray-600 mt-1">Checked {totalChecked} sites — no matches.</p>
        )}
      </div>
    );
  }

  // Helper to get a favicon URL for a site
  const getFavicon = (siteName: string, siteUrl: string): string => {
    try {
      const url = new URL(siteUrl);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Summary card ── */}
      <div className="card border-fuchsia-700/30 bg-gradient-to-br from-fuchsia-900/5 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-fuchsia-600/20 border border-fuchsia-600/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M3 11h3" />
                  <path d="M18 11h3" />
                  <path d="M11 3v3" />
                  <path d="M11 18v3" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">
                  Maigret Results: <span className="font-mono text-fuchsia-400">{result.username}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Searched <strong className="text-gray-400">{totalChecked}</strong> sites —
                  found on <strong className="text-fuchsia-400">{foundCount}</strong> {foundCount === 1 ? 'profile' : 'profiles'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {siteNames.map((siteName) => {
          const site = sites[siteName];
          return (
            <a
              key={siteName}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-midnight-800/40 border border-midnight-700/40 hover:border-fuchsia-700/50 hover:bg-fuchsia-900/10 transition-all group"
            >
              {/* Favicon */}
              <div className="w-8 h-8 rounded-full bg-midnight-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {site.url ? (
                  <img
                    src={getFavicon(siteName, site.url)}
                    alt=""
                    className="w-5 h-5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                )}
              </div>

              {/* Site info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 group-hover:text-fuchsia-300 truncate transition-colors">
                  {siteName}
                </p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                  {site.url ? (
                    <>
                      {(() => {
                        try { return new URL(site.url).hostname; }
                        catch { return site.url; }
                      })()}
                    </>
                  ) : 'URL unavailable'}
                </p>
              </div>

              {/* Open link icon */}
              <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-fuchsia-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          );
        })}
      </div>

      {/* ── Raw output toggle ── */}
      <div className="pt-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
        >
          {showRaw ? '▼' : '▶'} Raw JSON Output {showRaw ? 'hide' : 'show'}
        </button>
        {showRaw && (
          <pre className="terminal text-[10px] max-h-60 overflow-auto mt-1 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

/** Generate an HTML string for the maigret result (for export) */
export function generateMaigretHtml(data: MaigretResult | { error: string }): string {
  if ('error' in data && data.error) {
    return `<div class="section"><h2>❌ Maigret Search Error</h2><p class="error">${esc(data.error)}</p></div>`;
  }

  const result = data as MaigretResult;
  const sites = result.sites || {};
  const siteNames = Object.keys(sites);

  if (siteNames.length === 0) {
    return `<div class="section"><h2>🔍 Maigret Search — ${esc(result.username)}</h2><div class="empty">No profiles found across ${result.total_sites_checked || 0} sites.</div></div>`;
  }

  const rows = siteNames.map(siteName => {
    const site = sites[siteName];
    const hostname = (() => {
      try { return new URL(site.url).hostname; }
      catch { return site.url || ''; }
    })();
    return `<tr>
      <td><strong>${esc(siteName)}</strong></td>
      <td><a href="${esc(site.url)}" target="_blank" style="color:#60a5fa">${esc(hostname)}</a></td>
      <td><span class="status-open">${esc(site.status || 'claimed')}</span></td>
    </tr>`;
  }).join('');

  return `<div class="section">
    <h2>🔍 Maigret OSINT — ${esc(result.username)}</h2>
    <p style="margin-bottom: 12px; color: #6b7a8f; font-size: 13px;">
      Searched <strong>${result.total_sites_checked || 0}</strong> sites — 
      found on <strong style="color: #d946ef">${siteNames.length}</strong> profiles
    </p>
    <table>
      <tr><th>Site</th><th>URL</th><th>Status</th></tr>
      ${rows}
    </table>
  </div>`;
}
