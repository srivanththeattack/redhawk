import { useState, useCallback, useEffect, useRef } from 'react';

// ── Helpers ──

function getMemberId(): string {
  try {
    let id = localStorage.getItem('redhawk_member_id');
    if (!id) {
      id = `mem_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem('redhawk_member_id', id);
    }
    return id;
  } catch { return `mem_${Date.now()}`; }
}

function getMemberName(): string {
  try {
    let name = localStorage.getItem('redhawk_member_name');
    if (!name) {
      name = `Agent_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      localStorage.setItem('redhawk_member_name', name);
    }
    return name;
  } catch { return 'Unknown'; }
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-900/30 text-blue-400 border-blue-700/40',
  medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  high: 'bg-orange-900/30 text-orange-400 border-orange-700/40',
  critical: 'bg-red-900/30 text-red-400 border-red-700/40',
};

const TAB_ICONS: Record<string, string> = {
  feed: '◇',
  findings: '◆',
  notes: '📋',
  targets: '◎',
};

export function TeamPanel() {
  const [tab, setTab] = useState<'feed' | 'findings' | 'notes' | 'targets'>('feed');
  const [members, setMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [memberName, setMemberName] = useState(getMemberName);
  const [newNoteTarget, setNewNoteTarget] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFindingTarget, setNewFindingTarget] = useState('');
  const [newFindingTitle, setNewFindingTitle] = useState('');
  const [newFindingSeverity, setNewFindingSeverity] = useState('medium');
  const [newFindingDesc, setNewFindingDesc] = useState('');
  const [findingsFilter, setFindingsFilter] = useState('');
  const [notesFilter, setNotesFilter] = useState('');
  const [c2Url, setC2Url] = useState(() => {
    try { return localStorage.getItem('redhawk_team_url') || ''; } catch { return ''; }
  });
  const [localC2Url, setLocalC2Url] = useState('');
  const [connected, setConnected] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const memberId = useRef(getMemberId());

  // Detect local C2 server URL
  useEffect(() => {
    const check = async () => {
      try {
        const status = await window.api.c2Status();
        if (status?.running && status?.config) {
          const cfg = status.config;
          const proto = cfg.useHttps ? 'https' : 'http';
          const host = cfg.listenHost === '0.0.0.0' ? '127.0.0.1' : cfg.listenHost;
          setLocalC2Url(`${proto}://${host}:${cfg.listenPort}`);
        } else {
          setLocalC2Url('');
        }
      } catch { setLocalC2Url(''); }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  // ── API abstraction: IPC (local) vs HTTP (remote) ──

  const api = useCallback(async (method: string, path: string, body?: any): Promise<any> => {
    // ── Local mode: IPC ──
    if (!c2Url) {
      const ipcMethods: Record<string, (args?: any) => Promise<any>> = {
        'GET /api/collab/members': () => window.api.teamGetMembers(),
        'GET /api/collab/activity': () => window.api.teamGetActivity(50),
        'GET /api/collab/findings': () => window.api.teamGetFindings(body?.target),
        'GET /api/collab/notes': () => window.api.teamGetNotes(body?.target),
        'GET /api/collab/targets': () => window.api.teamGetTargets(),
        'GET /api/collab/todos': () => window.api.teamGetTodos(),
        'POST /api/collab/heartbeat': (b) => window.api.teamHeartbeat(b.memberId, b.name, b.currentTarget, b.currentTab),
        'POST /api/collab/activity': (b) => window.api.teamAddActivity(b),
        'POST /api/collab/findings': (b) => window.api.teamAddFinding(b),
        'POST /api/collab/notes': (b) => window.api.teamAddNote(b),
        'POST /api/collab/todos': (b) => window.api.teamAddTodo(b),
        'POST /api/collab/targets/checkin': (b) => window.api.teamCheckinTarget(b.target, b.memberId, b.memberName),
        'POST /api/collab/targets/checkout': (b) => window.api.teamCheckoutTarget(b.target, b.memberId, b.memberName),
        'PATCH /api/collab/findings': (b) => window.api.teamUpdateFinding(b.id, b.updates),
        'PATCH /api/collab/targets': (b) => window.api.teamUpdateTarget(b.target, b.updates || {}),
        'PATCH /api/collab/todos': (b) => window.api.teamUpdateTodo(b.id, b.updates),
        'DELETE /api/collab/findings': (b) => window.api.teamDeleteFinding(b.id),
        'DELETE /api/collab/notes': (b) => window.api.teamDeleteNote(b.id),
        'DELETE /api/collab/todos': (b) => window.api.teamDeleteTodo(b.id),
      };
      const key = `${method} ${path}`;
      const fn = ipcMethods[key];
      if (fn) return await fn(body || {});
      return null;
    }

    // ── Remote mode: HTTP fetch ──
    // Build path — REST uses /<id> in URL, not in body
    let effectivePath = path;
    let sendBody = body;
    if (path === '/api/collab/findings' && (method === 'PATCH' || method === 'DELETE')) {
      const id = body?.id;
      if (!id) throw new Error('id required');
      effectivePath = `/api/collab/findings/${encodeURIComponent(id)}`;
      sendBody = method === 'PATCH' ? (body?.updates || {}) : undefined;
    } else if (path === '/api/collab/notes' && method === 'DELETE') {
      const id = body?.id;
      if (!id) throw new Error('id required');
      effectivePath = `/api/collab/notes/${encodeURIComponent(id)}`;
      sendBody = undefined;
    } else if (path === '/api/collab/targets' && method === 'PATCH') {
      const target = body?.target;
      if (!target) throw new Error('target required');
      effectivePath = `/api/collab/targets/${encodeURIComponent(target)}`;
      sendBody = body?.updates || {};
    } else if (path === '/api/collab/todos' && (method === 'PATCH' || method === 'DELETE')) {
      const id = body?.id;
      if (!id) throw new Error('id required');
      effectivePath = `/api/collab/todos/${encodeURIComponent(id)}`;
      sendBody = method === 'PATCH' ? (body?.updates || {}) : undefined;
    }

    const url = `${c2Url.replace(/\/+$/, '')}${effectivePath}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (sendBody && method !== 'GET') {
      options.body = JSON.stringify(sendBody);
    }
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }, [c2Url]);

  // ── Data loading ──

  const loadMembers = useCallback(async () => {
    try { setMembers(await api('GET', '/api/collab/members')); } catch {}
  }, [api]);

  const loadActivities = useCallback(async () => {
    try { setActivities(await api('GET', '/api/collab/activity')); } catch {}
  }, [api]);

  const loadFindings = useCallback(async () => {
    try { setFindings(await api('GET', '/api/collab/findings', { target: findingsFilter || undefined })); } catch {}
  }, [api, findingsFilter]);

  const loadNotes = useCallback(async () => {
    try { setNotes(await api('GET', '/api/collab/notes', { target: notesFilter || undefined })); } catch {}
  }, [api, notesFilter]);

  const loadTargets = useCallback(async () => {
    try { setTargets(await api('GET', '/api/collab/targets')); } catch {}
  }, [api]);

  const loadAll = useCallback(() => {
    loadMembers();
    loadActivities();
    loadFindings();
    loadNotes();
    loadTargets();
  }, [loadMembers, loadActivities, loadFindings, loadNotes, loadTargets]);

  // ── Heartbeat + connection health ──

  useEffect(() => {
    try { localStorage.setItem('redhawk_member_name', memberName); } catch {}
  }, [memberName]);

  useEffect(() => {
    try { localStorage.setItem('redhawk_team_url', c2Url); } catch {}
  }, [c2Url]);

  useEffect(() => {
    const doHeartbeat = async () => {
      try {
        await api('POST', '/api/collab/heartbeat', { memberId: memberId.current, name: memberName });
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    doHeartbeat();
    loadAll();
    const interval = setInterval(() => {
      doHeartbeat();
      loadAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [api, memberName]);

  // Auto-scroll feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  // ── Activity ──

  const postActivity = useCallback(async (type: string, label: string, detail?: string, target?: string) => {
    try {
      await api('POST', '/api/collab/activity', { memberId: memberId.current, memberName, type, label, detail, target });
      loadActivities();
    } catch {}
  }, [api, memberName]);

  // ── Findings ──

  const handleAddFinding = useCallback(async () => {
    if (!newFindingTarget.trim() || !newFindingTitle.trim()) return;
    await api('POST', '/api/collab/findings', {
      target: newFindingTarget.trim(),
      title: newFindingTitle.trim(),
      severity: newFindingSeverity,
      description: newFindingDesc.trim(),
      createdBy: memberName,
      status: 'open',
    });
    setNewFindingTarget(''); setNewFindingTitle(''); setNewFindingDesc('');
    postActivity('finding', `Finding: ${newFindingTitle.trim()}`, newFindingTarget.trim(), newFindingTarget.trim());
    loadFindings();
  }, [api, newFindingTarget, newFindingTitle, newFindingSeverity, newFindingDesc, memberName, loadFindings, postActivity]);

  const handleUpdateFinding = useCallback(async (id: string, updates: any) => {
    await api('PATCH', '/api/collab/findings', { id, updates });
    loadFindings();
  }, [api, loadFindings]);

  const handleDeleteFinding = useCallback(async (id: string) => {
    await api('DELETE', '/api/collab/findings', { id });
    loadFindings();
  }, [api, loadFindings]);

  // ── Notes ──

  const handleAddNote = useCallback(async () => {
    if (!newNoteTarget.trim() || !newNoteContent.trim()) return;
    await api('POST', '/api/collab/notes', {
      target: newNoteTarget.trim(),
      content: newNoteContent.trim(),
      createdBy: memberName,
    });
    setNewNoteTarget(''); setNewNoteContent('');
    postActivity('note', `Note on ${newNoteTarget.trim()}`, newNoteContent.trim().slice(0, 80), newNoteTarget.trim());
    loadNotes();
  }, [api, newNoteTarget, newNoteContent, memberName, loadNotes, postActivity]);

  const handleDeleteNote = useCallback(async (id: string) => {
    await api('DELETE', '/api/collab/notes', { id });
    loadNotes();
  }, [api, loadNotes]);

  // ── Targets ──

  const handleCheckin = useCallback(async (target: string) => {
    const result = await api('POST', '/api/collab/targets/checkin', { target, memberId: memberId.current, memberName });
    if (!result.success) alert(result.message);
    loadTargets();
    postActivity('target', `Checked out ${target}`, '', target);
  }, [api, memberName, loadTargets, postActivity]);

  const handleCheckout = useCallback(async (target: string) => {
    await api('POST', '/api/collab/targets/checkout', { target, memberId: memberId.current, memberName });
    loadTargets();
  }, [api, memberName, loadTargets]);

  const handleAddTarget = useCallback(async () => {
    const t = prompt('Enter target domain/IP:');
    if (!t?.trim()) return;
    await handleCheckin(t.trim());
  }, [handleCheckin]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Team Coordination</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Name:</span>
            <input type="text" value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="input-field h-7 text-xs font-mono w-28" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">C2 URL:</span>
            <input type="text" value={c2Url} placeholder="http://192.168.1.100:8080"
              onChange={(e) => setC2Url(e.target.value)}
              className="input-field h-7 text-xs font-mono w-44" />
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-600'}`} title={connected ? 'Connected' : 'Disconnected'} />
          </div>
        </div>
        {!c2Url && localC2Url && (
          <div className="text-[10px] text-green-400/70 mt-1.5 flex items-center gap-2">
            <span>Local C2 running at:</span>
            <code className="bg-midnight-950 px-1.5 py-0.5 rounded font-mono text-green-400 cursor-pointer select-all"
              onClick={() => { navigator.clipboard?.writeText(localC2Url); setC2Url(localC2Url); }}>
              {localC2Url}
            </code>
            <span className="text-gray-600">(click to use)</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
          <span>Online:</span>
          {members.length === 0 ? (
            <span className="text-yellow-400">You're the only one — share the C2 server URL for others to join</span>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <span key="self" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700/40">
                {memberName}
              </span>
              {members.filter((m) => m.id !== memberId.current).map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-midnight-800 text-gray-400 border border-midnight-700"
                  style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}>
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800">
        {['feed', 'findings', 'notes', 'targets'].map((t) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t
                ? 'bg-redhawk-600/20 text-white border border-redhawk-600/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            {TAB_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── TAB: Live Feed ── */}
      {tab === 'feed' && (
        <div className="card">
          <div className="card-header">Live Activity Feed</div>
          <div className="space-y-1 max-h-[32rem] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-gray-500 text-xs mb-3">No activity yet.</p>
                <ul className="text-[10px] text-gray-600 space-y-1 text-left max-w-xs mx-auto">
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Scans, exploits, payload generation &amp; C2 actions are broadcast here</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Findings and notes also appear when created by anyone</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Members see updates in real-time — no refresh needed</li>
                </ul>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-2 p-2 rounded hover:bg-midnight-800/30 text-xs">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5
                    ${act.type === 'scan' ? 'bg-blue-900/30 text-blue-400' :
                      act.type === 'exploit' ? 'bg-red-900/30 text-red-400' :
                      act.type === 'phish' ? 'bg-purple-900/30 text-purple-400' :
                      act.type === 'payload' ? 'bg-yellow-900/30 text-yellow-400' :
                      act.type === 'c2' ? 'bg-green-900/30 text-green-400' :
                      act.type === 'exfil' ? 'bg-pink-900/30 text-pink-400' :
                      act.type === 'finding' ? 'bg-orange-900/30 text-orange-400' :
                      'bg-gray-800 text-gray-500'}`}>
                    {act.type === 'scan' ? 'R' : act.type === 'exploit' ? 'E' : act.type === 'phish' ? 'P' :
                     act.type === 'payload' ? 'L' : act.type === 'c2' ? 'C' : act.type === 'exfil' ? 'X' :
                     act.type === 'finding' ? 'F' : act.type === 'note' ? 'N' : act.type === 'target' ? 'T' : '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-gray-200 font-medium">{act.memberName}</span>
                      <span className="text-gray-500">{act.label}</span>
                    </div>
                    {(act.detail || act.target) && (
                      <p className="text-gray-600 truncate mt-0.5">{act.detail || act.target}</p>
                    )}
                    <p className="text-[9px] text-gray-700 mt-0.5">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={feedEndRef} />
          </div>
        </div>
      )}

      {/* ── TAB: Findings ── */}
      {tab === 'findings' && (
        <div className="space-y-3">
          {/* New finding form */}
          <div className="card border-redhawk-700/30">
            <div className="card-header text-redhawk-400">New Finding</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Target</label>
                <input type="text" value={newFindingTarget}
                  onChange={(e) => setNewFindingTarget(e.target.value)}
                  className="input-field py-1.5 text-xs" placeholder="domain.com or 10.0.0.5" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Severity</label>
                <select value={newFindingSeverity} onChange={(e) => setNewFindingSeverity(e.target.value)}
                  className="input-field py-1.5 text-xs">
                  <option value="low" className="bg-midnight-900 text-gray-100">Low</option>
                  <option value="medium" className="bg-midnight-900 text-gray-100">Medium</option>
                  <option value="high" className="bg-midnight-900 text-gray-100">High</option>
                  <option value="critical" className="bg-midnight-900 text-gray-100">Critical</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-gray-500 block mb-1">Title</label>
              <input type="text" value={newFindingTitle}
                onChange={(e) => setNewFindingTitle(e.target.value)}
                className="input-field py-1.5 text-xs w-full" placeholder="Open SMB share, exposed RDP, etc." />
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-gray-500 block mb-1">Description</label>
              <textarea value={newFindingDesc} rows={2}
                onChange={(e) => setNewFindingDesc(e.target.value)}
                className="input-field py-1.5 text-xs w-full" placeholder="Optional details..." />
            </div>
            <button onClick={handleAddFinding} disabled={!newFindingTarget.trim() || !newFindingTitle.trim()}
              className="btn-primary w-full mt-2 text-xs">Add Finding</button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <input type="text" value={findingsFilter} placeholder="Filter by target..."
              onChange={(e) => setFindingsFilter(e.target.value)}
              className="input-field py-1.5 text-xs flex-1" />
            <button onClick={loadFindings} className="btn-ghost text-xs">Filter</button>
          </div>

          {/* List */}
          {findings.length === 0 ? (
            <div className="card flex flex-col items-center py-6 px-4 text-gray-600">
              <span className="text-lg mb-1 opacity-50">◆</span>
              <p className="text-xs text-gray-500 mb-2">No findings yet</p>
              <ul className="text-[10px] text-gray-600 space-y-1 text-left max-w-xs">
                <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">▸</span> Log vulnerabilities or interesting observations per target</li>
                <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">▸</span> Set severity (Low → Critical) and status (Open → Confirmed)</li>
                <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">▸</span> Click <span className="text-yellow-400">Take</span> to claim a finding, then <span className="text-green-400">Confirm</span> when verified</li>
                <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">▸</span> Use the filter to show findings for a specific target</li>
              </ul>
            </div>
          ) : (
            findings.map((f) => (
              <div key={f.id} className="card border-midnight-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{f.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${SEVERITY_COLORS[f.severity] || 'bg-gray-800 text-gray-400'}`}>
                        {f.severity}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        f.status === 'open' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40' :
                        f.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                        f.status === 'confirmed' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                        'bg-gray-900/30 text-gray-400 border-gray-700/40'
                      }`}>{f.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{f.target}</p>
                    {f.description && <p className="text-xs text-gray-400 mt-1">{f.description}</p>}
                    <div className="flex items-center gap-2 text-[9px] text-gray-600 mt-1">
                      <span>By: {f.createdBy}</span>
                      <span>{new Date(f.createdAt).toLocaleString()}</span>
                      {f.assignedTo && <span>Assigned: {f.assignedTo}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {f.status === 'open' && (
                      <button onClick={() => handleUpdateFinding(f.id, { status: 'in_progress', assignedTo: memberName })}
                        className="text-[9px] btn-ghost px-1.5">Take</button>
                    )}
                    {f.status === 'in_progress' && (
                      <button onClick={() => handleUpdateFinding(f.id, { status: 'confirmed' })}
                        className="text-[9px] btn-ghost px-1.5 text-green-400">Confirm</button>
                    )}
                    <button onClick={() => handleDeleteFinding(f.id)}
                      className="text-[9px] btn-ghost px-1.5 text-gray-600 hover:text-redhawk-400">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: Notes ── */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {/* New note form */}
          <div className="card border-redhawk-700/30">
            <div className="card-header text-redhawk-400">New Note</div>
            <div className="grid grid-cols-1 gap-2">
              <input type="text" value={newNoteTarget} placeholder="Target domain/IP"
                onChange={(e) => setNewNoteTarget(e.target.value)}
                className="input-field py-1.5 text-xs" />
              <textarea value={newNoteContent} rows={2} placeholder="Note content..."
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="input-field py-1.5 text-xs" />
            </div>
            <button onClick={handleAddNote} disabled={!newNoteTarget.trim() || !newNoteContent.trim()}
              className="btn-primary w-full mt-2 text-xs">Add Note</button>
          </div>

          {/* Filter */}
          <input type="text" value={notesFilter} placeholder="Filter by target..."
            onChange={(e) => setNotesFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-full" />

          {/* List */}
          {notes.length === 0 ? (
            <div className="card flex flex-col items-center py-6 px-4 text-gray-600">
              <svg className="w-6 h-6 mb-1 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p className="text-xs text-gray-500 mb-2">No notes yet</p>
              <ul className="text-[10px] text-gray-600 space-y-1 text-left max-w-xs">
                <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Free-form notes associated with a target domain or IP</li>
                <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Document recon findings, exploitation steps, or to-do items</li>
                <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Filter by target to find notes quickly</li>
                <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">▸</span> Notes are visible to all connected team members</li>
              </ul>
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="card border-midnight-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-500 font-mono">{n.target}</p>
                    <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{n.content}</p>
                    <div className="flex items-center gap-2 text-[9px] text-gray-600 mt-1">
                      <span>By: {n.createdBy}</span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)}
                    className="text-[9px] btn-ghost text-gray-600 hover:text-redhawk-400 shrink-0">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: Targets ── */}
      {tab === 'targets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="card-header mb-0">Coordination ({targets.length} targets)</span>
            <button onClick={handleAddTarget} className="btn-secondary text-xs">Add Target</button>
          </div>
          {targets.length === 0 ? (
            <div className="card flex flex-col items-center py-6 px-4 text-gray-600">
              <svg className="w-6 h-6 mb-1 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><circle cx="12" cy="12" r="3"/></svg>
              <p className="text-xs text-gray-500 mb-2">No targets in the pool</p>
              <ul className="text-[10px] text-gray-600 space-y-1 text-left max-w-xs">
                <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">▸</span> Click <span className="text-yellow-400">Add Target</span> to add a domain or IP to the shared pool</li>
                <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">▸</span> <span className="text-yellow-400">Check Out</span> a target to claim it — others see it's locked</li>
                <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">▸</span> <span className="text-yellow-400">Release</span> when done, or set status to <span className="text-green-400">complete</span></li>
                <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">▸</span> Never duplicate work — always check the pool first</li>
              </ul>
            </div>
          ) : (
            targets.map((t) => (
              <div key={t.target} className="card border-midnight-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-200">{t.target}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        t.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                        t.status === 'complete' ? 'bg-green-900/30 text-green-400 border-green-700/40' :
                        'bg-gray-900/30 text-gray-400 border-gray-700/40'
                      }`}>{t.status}</span>
                    </div>
                    {t.checkedOutBy && (
                      <p className="text-[10px] text-yellow-400 mt-1">
                        Checked out by {t.checkedOutBy} at {new Date(t.checkedOutAt).toLocaleString()}
                      </p>
                    )}
                    {t.notes && <p className="text-[10px] text-gray-500 mt-1">{t.notes}</p>}
                    <p className="text-[9px] text-gray-700 mt-1">Updated: {new Date(t.lastUpdated).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!t.checkedOutBy ? (
                      <button onClick={() => handleCheckin(t.target)}
                        className="btn-ghost text-[10px]">Check Out</button>
                    ) : t.checkedOutBy === memberName ? (
                      <>
                        <button onClick={() => handleCheckout(t.target)}
                          className="btn-ghost text-[10px] text-yellow-400">Release</button>
                        <button onClick={async () => {
                          const status = prompt('Set status (pending/in_progress/complete):', t.status);
                          if (status) { await api('PATCH', '/api/collab/targets', { target: t.target, updates: { status } }); loadTargets(); }
                        }} className="btn-ghost text-[10px]">Set Status</button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-600">Locked</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
