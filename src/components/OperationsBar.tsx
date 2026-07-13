import React, { useState, useCallback, useEffect } from 'react';

interface Operation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  targets: string[];
  notes: string;
  status: 'active' | 'archived';
}

export function OperationsBar() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [currentOp, setCurrentOp] = useState<Operation | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadOps = useCallback(async () => {
    try {
      const [ops, current] = await Promise.all([
        window.api.opList(),
        window.api.opGetCurrent(),
      ]);
      setOperations(ops || []);
      setCurrentOp(current);
    } catch (err) {
      console.error('Failed to load operations:', err);
    }
  }, []);

  useEffect(() => {
    loadOps();
  }, [loadOps]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const op = await window.api.opCreate(newName.trim(), newDesc.trim());
      if (op) {
        setNewName('');
        setNewDesc('');
        setCreateOpen(false);
        setMenuOpen(false);
        loadOps();
      }
    } catch (err) {
      console.error('Failed to create operation:', err);
    }
  }, [newName, newDesc, loadOps]);

  const handleSwitch = useCallback(async (id: string) => {
    await window.api.opSetCurrent(id);
    setMenuOpen(false);
    loadOps();
  }, [loadOps]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this operation? This cannot be undone.')) return;
    await window.api.opDelete(id);
    loadOps();
  }, [loadOps]);

  const handleArchive = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.api.opArchive(id);
    loadOps();
  }, [loadOps]);

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
          text-gray-400 hover:text-white hover:bg-midnight-700/50
          transition-all duration-150"
        title={currentOp ? `Operation: ${currentOp.name}` : 'No operation selected'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {currentOp?.name || 'No Operation'}
        </span>
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-midnight-700/50">
            <span className="text-sm font-medium text-white">Operations</span>
            <button
              onClick={() => { setCreateOpen(true); }}
              className="text-xs text-redhawk-400 hover:text-redhawk-300 transition-colors"
            >
              + New
            </button>
          </div>

          {createOpen ? (
            <div className="px-4 py-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Operation name"
                autoFocus
                className="w-full px-3 py-1.5 text-xs bg-midnight-900 border border-midnight-600/50 rounded-lg
                  text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-1.5 text-xs bg-midnight-900 border border-midnight-600/50 rounded-lg
                  text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={!newName.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-redhawk-600 hover:bg-redhawk-500 text-white disabled:opacity-50">
                  Create
                </button>
                <button onClick={() => { setCreateOpen(false); setNewName(''); setNewDesc(''); }}
                  className="py-1.5 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-300 bg-midnight-700/50 hover:bg-midnight-700">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {operations.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p className="text-xs">No operations yet</p>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="text-xs text-redhawk-400 hover:text-redhawk-300 mt-2"
                  >
                    Create your first operation
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  {operations.map((op) => (
                    <div
                      key={op.id}
                      onClick={() => handleSwitch(op.id)}
                      className={`px-4 py-2.5 cursor-pointer transition-all flex items-center gap-3 ${
                        currentOp?.id === op.id
                          ? 'bg-redhawk-600/10 border-l-2 border-redhawk-500'
                          : 'hover:bg-midnight-700/30 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200 truncate">{op.name}</span>
                          {op.status === 'archived' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">archived</span>
                          )}
                        </div>
                        {op.description && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{op.description}</p>
                        )}
                        <p className="text-[9px] text-gray-600 mt-0.5">
                          {op.targets.length} targets · Created {new Date(op.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {op.status === 'active' && (
                          <button onClick={(e) => handleArchive(op.id, e)}
                            className="text-[10px] text-gray-600 hover:text-yellow-400 p-1"
                            title="Archive">
                            📦
                          </button>
                        )}
                        <button onClick={(e) => handleDelete(op.id, e)}
                          className="text-[10px] text-gray-600 hover:text-redhawk-400 p-1"
                          title="Delete">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-2 bg-midnight-900/50 border-t border-midnight-700/50">
            <p className="text-[10px] text-gray-600 text-center">
              Operations group all activity under a single engagement
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
