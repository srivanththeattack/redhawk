import { useState, useCallback, useEffect } from 'react';
import type { useScan } from '../hooks/useScan';

interface Props {
  scan: ReturnType<typeof useScan>;
}

interface Todo {
  text: string;
  done: boolean;
}

interface Finding {
  target: string;
  title: string;
  severity: string;
  description: string;
}

interface Screenshot {
  name: string;
  path: string;
  timestamp: string;
}

type OpsTab = 'timeline' | 'notes' | 'findings' | 'todos' | 'screenshots';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

export function OpsDashboard({ scan }: Props) {
  const [tab, setTab] = useState<OpsTab>('todos');

  // Notes
  const [noteTarget, setNoteTarget] = useState('');
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [noteSaved, setNoteSaved] = useState(false);

  // Findings
  const [findTarget, setFindTarget] = useState('');
  const [findTitle, setFindTitle] = useState('');
  const [findSeverity, setFindSeverity] = useState('Medium');
  const [findDesc, setFindDesc] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);

  // Todos
  const [todoText, setTodoText] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);

  // Screenshots
  const [screenshotName, setScreenshotName] = useState('');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  // Load data on mount
  useEffect(() => {
    window.api.opsGetTodos().then(setTodos).catch(() => {});
    window.api.opsGetFindings().then(setFindings).catch(() => {});
    window.api.opsGetScreenshots().then(setScreenshots).catch(() => {});
    window.api.opsGetTimeline().then(setActivity).catch(() => {});
  }, []);

  // ── Notes ──
  const handleLoadNotes = useCallback(async () => {
    if (!noteTarget.trim()) return;
    try {
      const result = await window.api.opsGetNotes(noteTarget.trim());
      setNotes(result || []);
    } catch { setNotes([]); }
  }, [noteTarget]);

  const handleSaveNote = useCallback(async () => {
    if (!noteTarget.trim() || !noteText.trim()) return;
    try {
      await window.api.opsSaveNote(noteTarget.trim(), noteText.trim());
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
      setNoteText('');
      handleLoadNotes();
    } catch {}
  }, [noteTarget, noteText, handleLoadNotes]);

  // ── Findings ──
  const handleAddFinding = useCallback(async () => {
    if (!findTarget.trim() || !findTitle.trim()) return;
    try {
      await window.api.opsSaveFinding({ target: findTarget.trim(), title: findTitle.trim(), severity: findSeverity, description: findDesc.trim() });
      setFindTitle('');
      setFindDesc('');
      const updated = await window.api.opsGetFindings();
      setFindings(updated || []);
    } catch {}
  }, [findTarget, findTitle, findSeverity, findDesc]);

  // ── Todos ──
  const handleAddTodo = useCallback(async () => {
    if (!todoText.trim()) return;
    try {
      await window.api.opsSaveTodo({ text: todoText.trim(), done: false });
      setTodoText('');
      const updated = await window.api.opsGetTodos();
      setTodos(updated || []);
    } catch {}
  }, [todoText]);

  const handleToggleTodo = useCallback(async (index: number) => {
    try {
      await window.api.opsToggleTodo(index);
      const updated = await window.api.opsGetTodos();
      setTodos(updated || []);
    } catch {}
  }, []);

  const handleDeleteTodo = useCallback(async (index: number) => {
    try {
      await window.api.opsDeleteTodo(index);
      const updated = await window.api.opsGetTodos();
      setTodos(updated || []);
    } catch {}
  }, []);

  const severityColor = (s: string) => {
    switch (s) {
      case 'Critical': return 'text-red-400 bg-red-900/20 border-red-700/30';
      case 'High': return 'text-orange-400 bg-orange-900/20 border-orange-700/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30';
      case 'Low': return 'text-blue-400 bg-blue-900/20 border-blue-700/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="card border-redhawk-700/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Operation Dashboard</h2>
        </div>
        <p className="text-xs text-gray-500">Track findings, notes, todos, screenshots, and timeline across your operation.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800 overflow-x-auto">
        {[
          { id: 'todos' as const, label: 'Todos', icon: '✅' },
          { id: 'findings' as const, label: 'Findings', icon: '🔍' },
          { id: 'notes' as const, label: 'Notes', icon: '📝' },
          { id: 'screenshots' as const, label: 'Screenshots', icon: '📸' },
          { id: 'timeline' as const, label: 'Timeline', icon: '📊' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-redhawk-600/20 text-redhawk-400 border border-redhawk-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── TODOS ── */}
      {tab === 'todos' && (
        <div className="card">
          <div className="card-header">To-Do List</div>
          <div className="flex gap-2 mb-3">
            <input type="text" value={todoText} onChange={(e) => setTodoText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              className="input-field h-9 text-sm flex-1" placeholder="Add a task..." />
            <button onClick={handleAddTodo} disabled={!todoText.trim()}
              className="btn-primary text-xs">Add</button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {todos.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No tasks yet</p>}
            {todos.map((todo, idx) => (
              <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                todo.done ? 'bg-midnight-900/30 border-midnight-800/30 opacity-60' : 'bg-midnight-800/30 border-midnight-700/30'
              }`}>
                <button onClick={() => handleToggleTodo(idx)}
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    todo.done ? 'bg-green-600 border-green-500' : 'border-midnight-600 hover:border-midnight-500'
                  }`}>
                  {todo.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>}
                </button>
                <span className={`text-xs flex-1 ${todo.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>{todo.text}</span>
                <button onClick={() => handleDeleteTodo(idx)} className="text-gray-600 hover:text-redhawk-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FINDINGS ── */}
      {tab === 'findings' && (
        <div className="space-y-3">
          <div className="card">
            <div className="card-header">Add Finding</div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Target</label>
                <input type="text" value={findTarget} onChange={(e) => setFindTarget(e.target.value)}
                  className="input-field h-9 text-sm font-mono" placeholder="example.com" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Severity</label>
                <select value={findSeverity} onChange={(e) => setFindSeverity(e.target.value)}
                  className="input-field h-9 text-sm">
                  {SEVERITIES.map((s) => <option key={s} value={s} className="bg-midnight-900">{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="text-[10px] text-gray-500 block mb-1">Title</label>
              <input type="text" value={findTitle} onChange={(e) => setFindTitle(e.target.value)}
                className="input-field h-9 text-sm w-full" placeholder="Vulnerability title" />
            </div>
            <div className="mb-2">
              <label className="text-[10px] text-gray-500 block mb-1">Description</label>
              <textarea value={findDesc} onChange={(e) => setFindDesc(e.target.value)}
                className="input-field h-20 text-xs w-full" placeholder="Describe the finding..." />
            </div>
            <button onClick={handleAddFinding} disabled={!findTarget.trim() || !findTitle.trim()}
              className="btn-primary w-full text-xs">Add Finding</button>
          </div>

          {findings.length > 0 && (
            <div className="card">
              <div className="card-header">Saved Findings ({findings.length})</div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {findings.map((f, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-midnight-700/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-gray-400 truncate">{f.target}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${severityColor(f.severity)}`}>{f.severity}</span>
                    </div>
                    <p className="text-xs text-gray-200 mt-1 font-medium">{f.title}</p>
                    {f.description && <p className="text-[10px] text-gray-500 mt-0.5">{f.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <div className="card">
          <div className="card-header">Operation Notes</div>
          <div className="flex gap-2 mb-3">
            <input type="text" value={noteTarget} onChange={(e) => setNoteTarget(e.target.value)}
              className="input-field h-9 text-sm font-mono flex-1" placeholder="Target (e.g. example.com)" />
            <button onClick={handleLoadNotes} className="btn-secondary text-xs">Load</button>
          </div>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
            className="input-field h-24 text-xs w-full mb-2" placeholder="Write a note about this target..." />
          <button onClick={handleSaveNote} disabled={!noteTarget.trim() || !noteText.trim()}
            className="btn-primary w-full text-xs">{noteSaved ? 'Saved!' : 'Save Note'}</button>
          {notes.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Saved Notes</p>
              {notes.map((note, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-midnight-800/30 border border-midnight-700/30">
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap">{note}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCREENSHOTS ── */}
      {tab === 'screenshots' && (
        <div className="card">
          <div className="card-header">Screenshot Gallery</div>
          <p className="text-xs text-gray-500 mb-3">Capture screenshots or evidence during your operation.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {screenshots.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-600">
                <p className="text-sm">No screenshots yet</p>
                <p className="text-xs">Take screenshots from the Exfil tab to see them here</p>
              </div>
            )}
            {screenshots.map((s, idx) => (
              <div key={idx} className="rounded-lg border border-midnight-700/30 overflow-hidden group relative">
                <img src={`file://${s.path}`} alt={s.name}
                  className="w-full h-24 object-cover bg-midnight-900"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="p-1.5">
                  <p className="text-[10px] text-gray-400 truncate">{s.name}</p>
                  <p className="text-[9px] text-gray-600">{new Date(s.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === 'timeline' && (
        <div className="card">
          <div className="card-header">Activity Timeline</div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {activity.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-8">No activity recorded yet. Start scanning or using tools.</p>
            )}
            {activity.map((entry: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-midnight-800/30 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                  entry.type === 'start' || entry.type === 'complete' ? 'bg-green-500' :
                  entry.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-600">{entry.tab}</span>
                    <span className="text-xs text-gray-300 truncate">{entry.label}</span>
                  </div>
                  {entry.detail && <p className="text-[10px] text-gray-600 truncate">{entry.detail}</p>}
                  <p className="text-[9px] text-gray-700">{new Date(entry.timestamp || Date.now()).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
