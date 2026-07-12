import React from 'react';
import type { ScanPhase } from '../types/target';

const PHASES = [
  { id: 'recon', label: 'Recon', icon: '🔍', desc: 'Information gathering', color: 'bg-blue-500' },
  { id: 'dorking', label: 'Dorking', icon: '🔎', desc: 'Google dorking & OSINT', color: 'bg-purple-500' },
  { id: 'exploit', label: 'Exploit', icon: '💀', desc: 'Metasploit exploitation', color: 'bg-red-500' },
  { id: 'phish', label: 'Phish', icon: '🎣', desc: 'Evilginx2 phishing', color: 'bg-orange-500' },
  { id: 'c2', label: 'C2', icon: '📡', desc: 'Command & control server', color: 'bg-yellow-500' },
  { id: 'exfil', label: 'Exfil', icon: '📤', desc: 'Data exfiltration', color: 'bg-pink-500' },
];

const PHASE_COLORS: Record<string, string> = {
  recon: 'bg-blue-500 shadow-blue-500/30',
  dorking: 'bg-purple-500 shadow-purple-500/30',
  exploit: 'bg-red-500 shadow-red-500/30',
  phish: 'bg-orange-500 shadow-orange-500/30',
  c2: 'bg-yellow-500 shadow-yellow-500/30',
  exfil: 'bg-pink-500 shadow-pink-500/30',
  default: 'bg-midnight-700',
};

interface KillChainBarProps {
  currentPhase: ScanPhase;
}

export function KillChainBar({ currentPhase }: KillChainBarProps) {
  const isScanning = currentPhase === 'scanning';

  return (
    <div className="card">
      <div className="card-header">Cyber Kill Chain</div>
      <div className="flex items-center gap-0.5 overflow-x-auto py-1">
        {PHASES.map((phase, idx) => {
          const color = PHASE_COLORS[phase.id] || PHASE_COLORS.default;

          return (
            <div
              key={phase.id}
              className={`
                flex flex-col items-center flex-shrink-0 px-2.5 py-2 rounded-lg transition-all duration-200
                bg-midnight-800/40 border border-midnight-700/40
                hover:bg-midnight-700/50 hover:border-midnight-600/50
                group relative cursor-default
              `}
              title={phase.desc}
            >
              <span className="text-base mb-0.5">{phase.icon}</span>
              <span className="text-[10px] font-medium whitespace-nowrap text-gray-400">
                {phase.label}
              </span>
              {/* Colored dot */}
              <div className={`w-1.5 h-1.5 rounded-full mt-1 ${color} shadow-[0_0_4px_var(--tw-shadow-color)]`}
                style={{ boxShadow: `0 0 6px ${idx === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(168,85,247,0.3)'}` }} />

              {/* Hover tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-midnight-800 text-[10px] text-gray-300 
                            px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity 
                            whitespace-nowrap pointer-events-none z-10 border border-midnight-700">
                {phase.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar — shows all phases as active */}
      <div className="mt-2 h-1.5 bg-midnight-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-red-600 to-pink-600 w-full" />
      </div>

      <div className="flex justify-between mt-1.5 text-[9px] text-gray-600 px-0.5">
        <span className="text-green-500 font-medium">● All phases active</span>
        <span>v0.1</span>
      </div>
    </div>
  );
}
