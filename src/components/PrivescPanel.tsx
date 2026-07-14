import { useState, useCallback } from 'react';

interface CheckResult {
  category: string;
  checks: { name: string; status: string; detail: string }[];
}

interface ExploitSuggestion {
  name: string;
  cve: string;
  edbId: string;
  description: string;
  reliability: string;
}

interface ServiceInfo {
  name: string;
  displayName: string;
  startType: string;
  user: string;
  path: string;
  vulnerable: boolean;
}

interface UnquotedPath {
  path: string;
  name: string;
}

interface SystemInfo {
  os: string;
  arch: string;
  user: string;
  integrity: string;
  domain: string;
}

export function PrivescPanel() {
  const [tab, setTab] = useState<'checks' | 'services' | 'exploits'>('checks');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [runningChecks, setRunningChecks] = useState(false);
  const [powerUpResults, setPowerUpResults] = useState<any[]>([]);
  const [runningPowerUp, setRunningPowerUp] = useState(false);

  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [enumServices, setEnumServices] = useState(false);
  const [unquotedPaths, setUnquotedPaths] = useState<UnquotedPath[]>([]);
  const [checkingUnquoted, setCheckingUnquoted] = useState(false);
  const [alwaysInstallElevated, setAlwaysInstallElevated] = useState<boolean | null>(null);
  const [checkingElevated, setCheckingElevated] = useState(false);

  const [exploitSuggestions, setExploitSuggestions] = useState<ExploitSuggestion[]>([]);
  const [loadingExploits, setLoadingExploits] = useState(false);

  const handleRunChecks = useCallback(async () => {
    setRunningChecks(true);
    setCheckResults([]);
    try {
      const [info, results] = await Promise.all([
        window.api.privescSystemInfo(),
        window.api.privescRunChecks(),
      ]);
      setSystemInfo(info);
      setCheckResults(results || []);
      await window.api.addActivity({ tab: 'privesc', type: 'scan', label: 'Privesc check complete', detail: `${results?.length || 0} categories scanned` });
    } catch (err: any) {
      console.error('Privesc check failed:', err);
    } finally {
      setRunningChecks(false);
    }
  }, []);

  const handleRunPowerUp = useCallback(async () => {
    setRunningPowerUp(true);
    try {
      const results = await window.api.privescPowerUp();
      setPowerUpResults(results || []);
    } catch (err: any) {
      console.error('PowerUp failed:', err);
    } finally {
      setRunningPowerUp(false);
    }
  }, []);

  const handleEnumServices = useCallback(async () => {
    setEnumServices(true);
    try {
      const results = await window.api.privescEnumServices();
      setServices(results || []);
    } catch (err: any) {
      console.error('Service enum failed:', err);
    } finally {
      setEnumServices(false);
    }
  }, []);

  const handleCheckUnquoted = useCallback(async () => {
    setCheckingUnquoted(true);
    try {
      const results = await window.api.privescUnquotedPaths();
      setUnquotedPaths(results || []);
    } catch (err: any) {
      console.error('Unquoted path check failed:', err);
    } finally {
      setCheckingUnquoted(false);
    }
  }, []);

  const handleCheckElevated = useCallback(async () => {
    setCheckingElevated(true);
    try {
      const result = await window.api.privescAlwaysInstallElevated();
      setAlwaysInstallElevated(result);
    } catch {
      setAlwaysInstallElevated(null);
    } finally {
      setCheckingElevated(false);
    }
  }, []);

  const handleSuggestExploits = useCallback(async () => {
    setLoadingExploits(true);
    try {
      const results = await window.api.privescSuggestExploit();
      setExploitSuggestions(results || []);
    } catch (err: any) {
      console.error('Exploit suggester failed:', err);
    } finally {
      setLoadingExploits(false);
    }
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'vulnerable': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
      case 'safe': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="card border-redhawk-700/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⬆️</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Privilege Escalation</h2>
        </div>
        <p className="text-xs text-gray-500">Enumerate privilege escalation vectors, vulnerable services, and kernel exploits.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800">
        {[
          { id: 'checks' as const, label: 'Checks', icon: '🔍' },
          { id: 'services' as const, label: 'Services', icon: '⚙️' },
          { id: 'exploits' as const, label: 'Exploit Suggester', icon: '💥' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t.id ? 'bg-redhawk-600/20 text-white border border-redhawk-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── CHECKS ── */}
      {tab === 'checks' && (
        <div className="space-y-3">
          {/* System Info */}
          {systemInfo && (
            <div className="card">
              <div className="card-header">System Info</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div><span className="text-gray-500">OS</span><p className="text-gray-300 font-mono">{systemInfo.os}</p></div>
                <div><span className="text-gray-500">Arch</span><p className="text-gray-300 font-mono">{systemInfo.arch}</p></div>
                <div><span className="text-gray-500">User</span><p className="text-gray-300 font-mono">{systemInfo.user}</p></div>
                <div><span className="text-gray-500">Integrity</span><p className={`font-mono ${systemInfo.integrity === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>{systemInfo.integrity}</p></div>
                <div><span className="text-gray-500">Domain</span><p className="text-gray-300 font-mono">{systemInfo.domain || '—'}</p></div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleRunChecks} disabled={runningChecks}
              className="btn-primary flex-1 text-xs">{runningChecks ? 'Running checks...' : 'Run All Checks'}</button>
            <button onClick={handleRunPowerUp} disabled={runningPowerUp}
              className="btn-secondary text-xs">{runningPowerUp ? 'Running...' : 'Run PowerUp'}</button>
          </div>

          {/* Check results */}
          {checkResults.map((cat, ci) => (
            <div key={ci} className="card">
              <div className="card-header">{cat.category}</div>
              <div className="space-y-1">
                {cat.checks.map((check, chi) => (
                  <div key={chi} className="flex items-start gap-2 p-1.5 rounded hover:bg-midnight-800/30">
                    <span className={`text-[10px] font-mono flex-shrink-0 w-16 ${statusColor(check.status)}`}>{check.status}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300">{check.name}</p>
                      {check.detail && <p className="text-[10px] text-gray-600 truncate">{check.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* PowerUp results */}
          {powerUpResults.length > 0 && (
            <div className="card">
              <div className="card-header">PowerUp Results ({powerUpResults.length})</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {powerUpResults.map((r: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-midnight-800/30 border border-midnight-700/30">
                    <p className="text-xs text-gray-300">{r.Module || r.Title || 'Result'}</p>
                    <pre className="text-[10px] text-gray-500 mt-0.5 whitespace-pre-wrap">{JSON.stringify(r, null, 1)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES ── */}
      {tab === 'services' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={handleEnumServices} disabled={enumServices}
              className="btn-primary text-xs">{enumServices ? 'Enumerating...' : 'Enumerate Services'}</button>
            <button onClick={handleCheckUnquoted} disabled={checkingUnquoted}
              className="btn-secondary text-xs">{checkingUnquoted ? 'Checking...' : 'Unquoted Paths'}</button>
            <button onClick={handleCheckElevated} disabled={checkingElevated}
              className="btn-secondary text-xs">{checkingElevated ? 'Checking...' : 'AlwaysInstallElevated'}</button>
          </div>

          {alwaysInstallElevated !== null && (
            <div className={`p-3 rounded-lg text-xs ${
              alwaysInstallElevated ? 'bg-red-900/20 border border-red-700/30 text-red-400' : 'bg-green-900/20 border border-green-700/30 text-green-400'
            }`}>
              AlwaysInstallElevated: {alwaysInstallElevated ? '⚠️ Enabled (vulnerable)' : '✅ Disabled (safe)'}
            </div>
          )}

          {unquotedPaths.length > 0 && (
            <div className="card">
              <div className="card-header text-redhawk-400">Unquoted Service Paths ({unquotedPaths.length})</div>
              <div className="space-y-1">
                {unquotedPaths.map((u, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-red-900/10 border border-red-700/20">
                    <p className="text-xs font-mono text-red-300">{u.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{u.path}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div className="card">
              <div className="card-header">Services ({services.length})</div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {services.map((s, idx) => (
                  <div key={idx} className={`p-2 rounded-lg border text-xs ${
                    s.vulnerable ? 'bg-red-900/10 border-red-700/30' : 'bg-midnight-800/30 border-midnight-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-300">{s.name}</span>
                      {s.vulnerable && <span className="text-red-400 text-[10px]">⚠️ Vulnerable</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.displayName}</p>
                    <div className="flex gap-3 text-[10px] text-gray-600 mt-0.5">
                      <span>User: {s.user}</span>
                      <span>Start: {s.startType}</span>
                    </div>
                    <p className="text-[9px] text-gray-700 font-mono mt-0.5 truncate">{s.path}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPLOIT SUGGESTER ── */}
      {tab === 'exploits' && (
        <div className="card">
          <div className="card-header">Kernel Exploit Suggester</div>
          <p className="text-xs text-gray-500 mb-3">Suggests known privilege escalation exploits based on the target OS version.</p>
          <button onClick={handleSuggestExploits} disabled={loadingExploits}
            className="btn-primary w-full text-xs mb-3">{loadingExploits ? 'Checking...' : 'Check for Exploits'}</button>

          {exploitSuggestions.length === 0 && !loadingExploits && (
            <p className="text-xs text-gray-600 text-center py-4">Click "Check for Exploits" to get suggestions</p>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {exploitSuggestions.map((e, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-midnight-700/30 hover:border-redhawk-700/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-200">{e.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    e.reliability === 'High' ? 'bg-green-900/30 text-green-400 border border-green-700/40' :
                    e.reliability === 'Medium' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40' :
                    'bg-gray-900/30 text-gray-400 border border-gray-700/40'
                  }`}>{e.reliability}</span>
                </div>
                <div className="flex gap-2 text-[10px] text-gray-500 mb-1">
                  {e.cve && <span>{e.cve}</span>}
                  {e.edbId && <span>EDB-ID: {e.edbId}</span>}
                </div>
                <p className="text-[10px] text-gray-600">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
