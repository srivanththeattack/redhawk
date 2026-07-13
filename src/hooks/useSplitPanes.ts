import { useState, useCallback, useEffect } from 'react';

export type TabId = 'recon' | 'exploit' | 'phish' | 'c2' | 'exfil' | 'payload' | 'evade' | 'ops' | 'privesc';

export interface PaneConfig {
  id: string;
  tabId: TabId;
  flex: number;
}

// Load/save layout from localStorage
function loadLayout(): PaneConfig[] {
  try {
    const saved = localStorage.getItem('redhawk_split_layout');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [{ id: 'main', tabId: 'recon', flex: 1 }];
}

function saveLayout(panes: PaneConfig[]) {
  try {
    localStorage.setItem('redhawk_split_layout', JSON.stringify(panes));
  } catch {}
}

export function useSplitPanes() {
  const [panes, setPanes] = useState<PaneConfig[]>(() => loadLayout());
  const [activePaneId, setActivePaneId] = useState<string>(panes[0]?.id || 'main');
  const [dragging, setDragging] = useState<{ index: number; startX: number; startFlex: number[] } | null>(null);

  // Persist layout changes
  useEffect(() => {
    saveLayout(panes);
  }, [panes]);

  const addPane = useCallback((tabId: TabId) => {
    // Don't add if this tab is already in a pane
    if (panes.some((p) => p.tabId === tabId)) return;
    const id = `pane_${Date.now()}`;
    setPanes((prev) => {
      // Split the flex evenly among all panes including new one
      const count = prev.length + 1;
      return [...prev, { id, tabId, flex: 1 }].map((p) => ({ ...p, flex: 1 }));
    });
    setActivePaneId(id);
  }, [panes]);

  const removePane = useCallback((id: string) => {
    setPanes((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one pane
      const filtered = prev.filter((p) => p.id !== id);
      // Redistribute flex evenly
      return filtered.map((p) => ({ ...p, flex: 1 }));
    });
    setActivePaneId((prev) => (prev === id ? panes[0]?.id || 'main' : prev));
  }, [panes]);

  const setPaneTab = useCallback((id: string, tabId: TabId) => {
    setPanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, tabId } : p))
    );
  }, []);

  // Replace a pane's content with a different tab
  const cyclePaneTab = useCallback((id: string) => {
    setPanes((prev) => {
      const allTabs: TabId[] = ['recon', 'exploit', 'phish', 'c2', 'exfil', 'payload', 'evade', 'ops', 'privesc'];
      const pane = prev.find((p) => p.id === id);
      if (!pane) return prev;
      const currentIdx = allTabs.indexOf(pane.tabId);
      // Find next tab that's not already in another pane
      const otherTabs = prev.filter((p) => p.id !== id).map((p) => p.tabId);
      for (let i = 1; i <= allTabs.length; i++) {
        const nextTab = allTabs[(currentIdx + i) % allTabs.length];
        if (!otherTabs.includes(nextTab)) {
          return prev.map((p) => (p.id === id ? { ...p, tabId: nextTab } : p));
        }
      }
      return prev;
    });
  }, []);

  // Collapse to single pane (keep only the first one)
  const collapseToSingle = useCallback(() => {
    setPanes((prev) => {
      if (prev.length <= 1) return prev;
      const first = prev[0];
      return [{ id: first.id, tabId: first.tabId, flex: 1 }];
    });
    setActivePaneId((prev) => panes[0]?.id || 'main');
  }, [panes]);

  // Drag handle for resizing
  const startResize = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startFlex = panes.map((p) => p.flex);
    setDragging({ index, startX, startFlex });

    const handleMouseMove = (ev: MouseEvent) => {
      setDragging((current) => {
        if (!current) return null;
        const dx = ev.clientX - current.startX;
        const totalFlex = current.startFlex.reduce((a, b) => a + b, 0);
        const delta = dx / 800; // Normalize to reasonable flex change
        const newFlex = [...current.startFlex];
        const leftIdx = current.index;
        const rightIdx = current.index + 1;
        if (rightIdx >= newFlex.length) return current;
        // Clamp min sizes
        const minFlex = 0.2;
        newFlex[leftIdx] = Math.max(minFlex, newFlex[leftIdx] + delta);
        newFlex[rightIdx] = Math.max(minFlex, newFlex[rightIdx] - delta);
        // Normalize to maintain total
        const newTotal = newFlex.reduce((a, b) => a + b, 0);
        if (newTotal > 0) {
          return {
            ...current,
            startFlex: newFlex.map((f) => (f / newTotal) * totalFlex),
          };
        }
        return current;
      });
    };

    const handleMouseUp = () => {
      setDragging((current) => {
        if (!current) return null;
        setPanes((prev) => {
          const newTotal = current.startFlex.reduce((a, b) => a + b, 0);
          return prev.map((p, i) => ({
            ...p,
            flex: newTotal > 0 ? current.startFlex[i] / newTotal : 1 / prev.length,
          }));
        });
        return null;
      });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panes]);

  const activeTab = panes.find((p) => p.id === activePaneId)?.tabId || 'recon';
  const isSplit = panes.length > 1;

  return {
    panes,
    activePaneId,
    activeTab,
    isSplit,
    dragging,
    setActivePaneId,
    addPane,
    removePane,
    setPaneTab,
    cyclePaneTab,
    collapseToSingle,
    startResize,
  };
}
