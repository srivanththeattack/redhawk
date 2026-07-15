import { create } from 'zustand';
import type { ScanResults, DepsStatus, ScanPhase } from '../types/target';

export type ScanTaskStatus = 'idle' | 'running' | 'complete' | 'error';

export interface ScanTaskState {
  whois: ScanTaskStatus;
  dns: ScanTaskStatus;
  subdomains: ScanTaskStatus;
  emails: ScanTaskStatus;
  nmap: ScanTaskStatus;
  ssl: ScanTaskStatus;
  httpHeaders: ScanTaskStatus;
  waf: ScanTaskStatus;
  tech: ScanTaskStatus;
  dirBrute: ScanTaskStatus;
  serviceScan: ScanTaskStatus;
  vulnScan: ScanTaskStatus;
  maigret: ScanTaskStatus;
}

const DEFAULT_TASK_STATE: ScanTaskState = {
  whois: 'idle',
  dns: 'idle',
  subdomains: 'idle',
  emails: 'idle',
  nmap: 'idle',
  ssl: 'idle',
  httpHeaders: 'idle',
  waf: 'idle',
  tech: 'idle',
  dirBrute: 'idle',
  serviceScan: 'idle',
  vulnScan: 'idle',
  maigret: 'idle',
};

// Kill chain phase tracking
export type KillChainPhaseId = 'recon' | 'exploit' | 'phish' | 'c2' | 'exfil';
export type KillChainStatus = 'pending' | 'active' | 'complete';

export type KillChainState = Record<KillChainPhaseId, KillChainStatus>;

const DEFAULT_KILL_CHAIN: KillChainState = {
  recon: 'pending',
  exploit: 'pending',
  phish: 'pending',
  c2: 'pending',
  exfil: 'pending',
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

  // Kill chain tracking
  killChain: KillChainState;

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

  // Kill chain actions
  setKillChainPhase: (phase: KillChainPhaseId, status: KillChainStatus) => void;
  resetKillChain: () => void;
}

// Persist disclaimer acceptance so it doesn't reappear after accepting
function loadDisclaimerAccepted(): boolean {
  try {
    return localStorage.getItem('redhawk_disclaimer_accepted') === 'true';
  } catch {
    return false;
  }
}

export const useScanStore = create<ScanState>((set) => ({
  target: '',
  phase: 'idle',
  statusMessages: [],
  scanOutput: '',
  results: null,
  history: [],
  scanTasks: { ...DEFAULT_TASK_STATE },
  killChain: { ...DEFAULT_KILL_CHAIN },
  depsStatus: null,
  depsChecking: false,
  disclaimerAccepted: loadDisclaimerAccepted(),

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

  acceptDisclaimer: () => {
    try { localStorage.setItem('redhawk_disclaimer_accepted', 'true'); } catch {}
    set({ disclaimerAccepted: true });
  },

  setTaskStatus: (task, status) =>
    set((state) => ({
      scanTasks: { ...state.scanTasks, [task]: status },
    })),

  setKillChainPhase: (phase, status) =>
    set((state) => ({
      killChain: { ...state.killChain, [phase]: status },
    })),

  resetKillChain: () => set({ killChain: { ...DEFAULT_KILL_CHAIN } }),

  reset: () =>
    set({
      phase: 'idle',
      statusMessages: [],
      scanOutput: '',
      results: null,
      scanTasks: { ...DEFAULT_TASK_STATE },
    }),
}));
