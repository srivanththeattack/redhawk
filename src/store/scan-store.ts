import { create } from 'zustand';
import type { ScanResults, DepsStatus, ScanPhase } from '../types/target';

interface ScanState {
  // Target
  target: string;

  // Scan state
  phase: ScanPhase;
  statusMessages: string[];
  scanOutput: string;

  // Results
  results: ScanResults | null;
  history: ScanResults[];

  // Dependencies
  depsStatus: DepsStatus | null;
  depsChecking: boolean;

  // Disclaimer
  disclaimerAccepted: boolean;

  // Actions
  setTarget: (target: string) => void;
  setPhase: (phase: ScanPhase) => void;
  addStatusMessage: (msg: string) => void;
  appendOutput: (text: string) => void;
  setResults: (results: ScanResults) => void;
  setHistory: (history: ScanResults[]) => void;
  setDepsStatus: (status: DepsStatus | null) => void;
  setDepsChecking: (checking: boolean) => void;
  acceptDisclaimer: () => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  target: '',
  phase: 'idle',
  statusMessages: [],
  scanOutput: '',
  results: null,
  history: [],
  depsStatus: null,
  depsChecking: false,
  disclaimerAccepted: false,

  setTarget: (target) => set({ target }),

  setPhase: (phase) => set({ phase }),

  addStatusMessage: (msg) =>
    set((state) => ({
      statusMessages: [...state.statusMessages, `[${new Date().toLocaleTimeString()}] ${msg}`],
    })),

  appendOutput: (text) =>
    set((state) => ({
      scanOutput: state.scanOutput + text,
    })),

  setResults: (results) => set({ results, phase: 'complete' }),

  setHistory: (history) => set({ history }),

  setDepsStatus: (status) => set({ depsStatus: status }),

  setDepsChecking: (checking) => set({ depsChecking: checking }),

  acceptDisclaimer: () => set({ disclaimerAccepted: true }),

  reset: () =>
    set({
      phase: 'idle',
      statusMessages: [],
      scanOutput: '',
      results: null,
    }),
}));
