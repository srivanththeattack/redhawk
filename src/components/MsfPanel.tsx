import React, { useState, useCallback } from 'react';

interface MsfConnection {
  connected: boolean;
  version?: string;
  error?: string;
}

interface ExploitResult {
  name: string;
  fullname: string;
  rank: string;
  description: string;
  disclosure?: string;
}

interface SessionInfo {
  id: number;
  type: string;
  target_host: string;
  info: string;
  via_exploit: string;
  via_payload: string;
  tunnel_peer: string;
}

const COMMON_EXPLOITS = [
  { label: 'EternalBlue (MS17-010)', query: 'ms17_010_eternalblue' },
  { label: 'SMBGhost (CVE-2020-0796)', query: 'smbghost' },
  { label: 'Apache Struts2', query: 'struts2' },
  { label: 'Tomcat Manager', query: 'tomcat_mgr_upload' },
  { label: 'PHP CGI Argument', query: 'php_cgi_arg_injection' },
  { label: 'WebDAV Upload', query: 'webdav_upload' },
  { label: 'JBoss JMX', query: 'jboss_jmx' },
  { label: 'MySQL Credential Dump', query: 'mysql_hashdump' },
];

const PAYLOAD_TYPES = [
  { label: 'Windows Reverse TCP', value: 'windows/meterpreter/reverse_tcp' },
  { label: 'Windows x64 Reverse TCP', value: 'windows/x64/meterpreter/reverse_tcp' },
  { label: 'Linux Reverse TCP', value: 'linux/x64/meterpreter/reverse_tcp' },
  { label: 'PHP Reverse', value: 'php/meterpreter_reverse_tcp' },
  { label: 'Python Reverse', value: 'python/meterpreter/reverse_tcp' },
  { label: 'Mac Reverse', value: 'osx/x64/meterpreter/reverse_tcp' },
];

export function MsfPanel() {
  const [connection, setConnection] = useState<MsfConnection>({ connected: false });
  const [connecting, setConnecting] = useState(false);
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('55553');
  const [password, setPassword] = useState('redhawk');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [exploits, setExploits] = useState<ExploitResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Generate payload state
  const [payloadType, setPayloadType] = useState('windows/meterpreter/reverse_tcp');
  const [lhost, setLhost] = useState('');
  const [lport, setLport] = useState('4444');
  const [generating, setGenerating] = useState(false);
  const [payloadOutput, setPayloadOutput] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await window.api.msfConnect(host, parseInt(port), password);
      setConnection(result);
    } catch (err: any) {
      setConnection({ connected: false, error: err.message });
    } finally {
      setConnecting(false);
    }
  }, [host, port, password]);

  const handleDisconnect = useCallback(async () => {
    await window.api.msfDisconnect();
    setConnection({ connected: false });
    setExploits([]);
    setSessions([]);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const results = await window.api.msfSearch(searchQuery.trim());
      setExploits(results || []);
    } catch (err: any) {
      setSearchError(err.message);
      setExploits([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleGeneratePayload = useCallback(async () => {
    setGenerating(true);
    setPayloadOutput('');
    try {
      const result = await window.api.msfGeneratePayload(payloadType, lhost, parseInt(lport));
      setPayloadOutput(result || 'Payload generated (check metasploit console)');
    } catch (err: any) {
      setPayloadOutput(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [payloadType, lhost, lport]);

  const handleListSessions = useCallback(async () => {
    try {
      const result = await window.api.msfListSessions();
      setSessions(result || []);
    } catch (err: any) {
      console.error('Failed to list sessions:', err);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Connection Panel ── */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💀</span>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Metasploit</h2>
          </div>
          {connection.connected && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
              Connected v{connection.version}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-2">
          Connect to msfrpcd to search exploits, generate payloads, and manage sessions.
        </p>
        <div className="bg-midnight-950/60 border border-midnight-700/40 rounded-lg px-3 py-2.5 mb-4 space-y-1.5">
          <p className="text-[11px] text-yellow-400/80 font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            msfrpcd must run inside WSL
          </p>
          <p className="text-[11px] text-gray-500">
            Start it in WSL: <code className="bg-midnight-900 px-1.5 py-0.5 rounded text-green-400 text-[10px]">msfrpcd -P redhawk -S -f -j</code>
          </p>
          <p className="text-[11px] text-gray-500">
            The <code className="text-yellow-400/80 text-[10px]">-P redhawk</code> sets the password. The <code className="text-yellow-400/80 text-[10px]">-j</code> flag enables JSON mode (required — add it).
          </p>
          <p className="text-[11px] text-gray-500">
            Find your WSL IP: <code className="bg-midnight-900 px-1.5 py-0.5 rounded text-blue-400 text-[10px]">ip addr show eth0 | grep inet</code> — use that in the <strong className="text-gray-400">Host</strong> field.
          </p>
        </div>

        {/* Connection form */}
        {!connection.connected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Host</label>
                <input
                  type="text" value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="input-field h-9 text-sm font-mono"
                  placeholder="e.g. 172.x.x.x (WSL IP)"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Port</label>
                <input
                  type="text" value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="input-field h-9 text-sm font-mono"
                  placeholder="55553"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Password</label>
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field h-9 text-sm font-mono"
                  placeholder="redhawk (from -P flag)"
                />
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary w-full"
            >
              {connecting ? 'Connecting...' : 'Connect to msfrpcd'}
            </button>
            {connection.error && (
              <div className="space-y-2">
                <p className="text-redhawk-400 text-xs flex items-start gap-1.5">
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{connection.error}</span>
                </p>
                <div className="bg-midnight-950/60 border border-midnight-700/40 rounded-lg px-3 py-2 text-[11px] text-gray-500 space-y-1">
                  <p className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Troubleshooting</p>
                  <p>1. Confirm msfrpcd is running in WSL: <code className="text-green-400 text-[10px]">ps aux | grep msfrpcd</code></p>
                  <p>2. Check the WSL IP: <code className="text-blue-400 text-[10px]">ip addr show eth0 | grep inet</code></p>
                  <p>3. Test from Windows: <code className="text-yellow-400/80 text-[10px]">Test-NetConnection {host} -Port {port}</code></p>
                  <p>4. Make sure you used the <code className="text-yellow-400/80 text-[10px]">-j</code> flag: <code className="text-green-400 text-[10px]">msfrpcd -P redhawk -S -f -j</code></p>
                  <p>5. msfrpcd should bind to <code className="text-gray-400 text-[10px]">0.0.0.0</code> (you'll see "MSGRPC starting on 0.0.0.0:{port}")</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={handleDisconnect} className="btn-secondary text-sm w-full">
            Disconnect
          </button>
        )}
      </div>

      {/* ── Connected Features ── */}
      {connection.connected && (
        <>
          {/* Search Exploits */}
          <div className="card">
            <div className="card-header">Search Exploits</div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search term... (e.g., apache, smb, ssh)"
                className="input-field h-10 text-sm flex-1"
              />
              <button onClick={handleSearch} disabled={searching} className="btn-primary h-10">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Quick exploit buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_EXPLOITS.map((exp, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSearchQuery(exp.query); }}
                  className="text-[10px] px-2 py-1 rounded bg-midnight-800 border border-midnight-700 
                             text-gray-500 hover:text-gray-300 hover:border-midnight-600 transition-all"
                >
                  {exp.label}
                </button>
              ))}
            </div>

            {searchError && (
              <p className="text-redhawk-400 text-xs mb-2">{searchError}</p>
            )}

            {/* Results */}
            {exploits.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {exploits.map((exp, idx) => (
                  <div key={idx} className="p-2 rounded bg-midnight-800/30 border border-midnight-700/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-200 truncate">{exp.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        exp.rank === 'excellent' ? 'bg-red-900/50 text-red-400' :
                        exp.rank === 'great' ? 'bg-orange-900/50 text-orange-400' :
                        exp.rank === 'good' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-900/50 text-gray-500'
                      }`}>{exp.rank}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{exp.description}</p>
                    {exp.disclosure && (
                      <p className="text-[10px] text-gray-600 mt-0.5">Disclosed: {exp.disclosure}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Payload */}
          <div className="card">
            <div className="card-header">Generate Payload</div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-1">Payload Type</label>
                  <select
                    value={payloadType}
                    onChange={(e) => setPayloadType(e.target.value)}
                    className="input-field h-9 text-sm"
                  >
                    {PAYLOAD_TYPES.map((p, i) => (
                      <option key={i} value={p.value} className="bg-midnight-900">{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Format</label>
                  <select className="input-field h-9 text-sm" defaultValue="exe">
                    <option value="exe" className="bg-midnight-900">EXE</option>
                    <option value="ps1" className="bg-midnight-900">PowerShell</option>
                    <option value="py" className="bg-midnight-900">Python</option>
                    <option value="raw" className="bg-midnight-900">Raw</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">LHOST (your IP)</label>
                  <input
                    type="text" value={lhost}
                    onChange={(e) => setLhost(e.target.value)}
                    className="input-field h-9 text-sm font-mono"
                    placeholder="10.0.0.1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">LPORT</label>
                  <input
                    type="text" value={lport}
                    onChange={(e) => setLport(e.target.value)}
                    className="input-field h-9 text-sm font-mono"
                    placeholder="4444"
                  />
                </div>
              </div>
              <button onClick={handleGeneratePayload} disabled={generating || !lhost} className="btn-primary w-full">
                {generating ? 'Generating...' : 'Generate Payload'}
              </button>
              {payloadOutput && (
                <div className="terminal text-xs max-h-32 overflow-y-auto">
                  {payloadOutput}
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span>Sessions</span>
              <button onClick={handleListSessions} className="btn-ghost text-xs">↻ Refresh</button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-xs">No active sessions. Run an exploit to get a session.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="p-2 rounded bg-green-900/10 border border-green-800/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-green-400">Session #{session.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
                        {session.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{session.target_host}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{session.info}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
