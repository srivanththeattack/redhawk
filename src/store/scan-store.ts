import { create } from 'zustand';
import type { ScanResults, DepsStatus, ScanPhase } from '../types/target';

export type ScanTaskStatus = 'idle' | 'running' | 'complete' | 'error';

export interface ScanTaskState {
  whois: ScanTaskStatus;
  dns: ScanTaskStatus;
  subdomains: ScanTaskStatus;
  emails: ScanTaskStatus;
  nmap: ScanTaskStatus;
}

const DEFAULT_TASK_STATE: ScanTaskState = {
  whois: 'idle',
  dns: 'idle',
  subdomains: 'idle',
  emails: 'idle',
  nmap: 'idle',
};

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

  // Per-scan task status
  scanTasks: ScanTaskState;

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

  // Per-scan task actions
  setTaskStatus: (task: keyof ScanTaskState, status: ScanTaskStatus) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  target: '',
  phase: 'idle',
  statusMessages: [],
  scanOutput: '',
  results: null,
  history: [],
  scanTasks: { ...DEFAULT_TASK_STATE },
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

  setTaskStatus: (task, status) =>
    set((state) => ({
      scanTasks: { ...state.scanTasks, [task]: status },
    })),

  reset: () =>
    set({
      phase: 'idle',
      statusMessages: [],
      scanOutput: '',
      results: null,
      scanTasks: { ...DEFAULT_TASK_STATE },
    }),
}));
