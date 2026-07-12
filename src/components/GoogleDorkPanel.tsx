import React, { useState, useCallback } from 'react';

interface DorkResult {
  url: string;
  title: string;
  snippet: string;
}

interface DorkResponse {
  query: string;
  results: DorkResult[] | { error: string };
  total: number;
}

const DORK_EXAMPLES = [
  { label: 'Login pages', query: 'inurl:login page' },
  { label: 'Config files', query: 'filetype:env DB_PASSWORD' },
  { label: 'Directory listing', query: 'intitle:"index of" admin' },
  { label: 'Exposed DB', query: 'filetype:sql "INSERT INTO" password' },
  { label: 'PHPinfo', query: 'intitle:"phpinfo()" "PHP Version"' },
  { label: 'Cloud buckets', query: 'site:s3.amazonaws.com keyword' },
  { label: 'Exposed panels', query: 'intitle:"webcam" "live" "index.of"' },
  { label: 'Git repos', query: 'intitle:"Index of" .git' },
];

export function GoogleDorkPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DorkResult[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const runDork = useCallback(async (dorkQuery: string) => {
    if (!dorkQuery.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response: DorkResponse = await window.api.runGoogleDork(dorkQuery.trim());

      if (response.results && Array.isArray(response.results)) {
        setResults(response.results);
        setTotal(response.results.length);
      } else if (response.results && 'error' in (response.results as any)) {
        setError((response.results as any).error);
      } else {
        setError('No results found');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyAllUrls = () => {
    if (!results) return;
    const urls = results.map((r) => r.url).join('\n');
    navigator.clipboard.writeText(urls);
    setCopiedIndex(-1); // -1 means "copy all"
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyUrl = (url: string, idx: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔍</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Google Dorking</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Search Google with advanced operators to find exposed information, misconfigurations, and vulnerabilities.
        </p>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDork(query)}
              placeholder='Enter dork query... e.g., filetype:env "DB_PASSWORD"'
              className="input-field h-11 text-sm font-mono"
              disabled={loading}
            />
          </div>
          <button
            onClick={() => runDork(query)}
            disabled={!query.trim() || loading}
            className="btn-primary h-11 px-5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching
              </span>
            ) : (
              'Dork It'
            )}
          </button>
        </div>
      </div>

      {/* Quick examples */}
      <div className="card">
        <div className="card-header">Quick Dorks</div>
        <div className="flex flex-wrap gap-2">
          {DORK_EXAMPLES.map((dork, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(dork.query);
                runDork(dork.query);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-midnight-800 border border-midnight-700 
                         text-gray-400 hover:text-gray-200 hover:border-redhawk-600/50 
                         hover:bg-midnight-700 transition-all"
            >
              {dork.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-redhawk-700 bg-redhawk-900/20">
          <p className="text-redhawk-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Results ({total})</span>
            <div className="flex gap-2">
              <button onClick={copyAllUrls} className="btn-ghost text-xs">
                {copiedIndex === -1 ? '✓ Copied' : 'Copy All URLs'}
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <p className="text-gray-500 text-sm">No results found for this query.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-midnight-800/30 border border-midnight-700/30 
                             hover:bg-midnight-700/40 hover:border-midnight-600/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Title (clickable) */}
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline 
                                   truncate block transition-colors"
                      >
                        {result.title || result.url}
                      </a>
                      {/* URL */}
                      <p className="text-xs text-green-500/70 font-mono truncate mt-0.5">{result.url}</p>
                      {/* Snippet */}
                      {result.snippet && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.snippet}</p>
                      )}
                    </div>
                    <button
                      onClick={() => copyUrl(result.url, idx)}
                      className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Copy URL"
                    >
                      {copiedIndex === idx ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      <div className="card bg-midnight-950/50 border-midnight-800/30">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          <strong className="text-gray-500">Tip:</strong> Google may rate-limit automated searches.
          If you get blocked, wait a few minutes or use a VPN. For large-scale dorking,
          consider using a dedicated search API.
        </p>
      </div>
    </div>
  );
}
