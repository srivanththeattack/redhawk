import React from 'react';
import type { ScanPhase } from '../types/target';

const PHASES = [
  { id: 'recon', label: 'Recon', icon: '🔍', desc: 'Information gathering', color: 'bg-blue-600' },
  { id: 'dorking', label: 'Dorking', icon: '🔎', desc: 'Google dorking & OSINT', color: 'bg-purple-600' },
  { id: 'exploit', label: 'Exploit', icon: '💀', desc: 'Vulnerability exploitation', color: 'bg-red-600' },
  { id: 'phish', label: 'Phish', icon: '🎣', desc: 'Phishing campaigns', color: 'bg-orange-600' },
  { id: 'c2', label: 'C2', icon: '📡', desc: 'Command & control', color: 'bg-yellow-600' },
  { id: 'exfil', label: 'Exfil', icon: '📤', desc: 'Data exfiltration', color: 'bg-pink-600' },
];

const PHASE_PROGRESS: Record<string, number> = {
  recon: 15,
  dorking: 30,
  exploit: 50,
  phish: 65,
  c2: 80,
  exfil: 100,
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
          const progress = PHASE_PROGRESS[phase.id] || 0;
          const isActive = false; // Will light up based on context later

          return (
            <div
              key={phase.id}
              className={`
                flex flex-col items-center flex-shrink-0 px-2.5 py-2 rounded-lg transition-all duration-200
                ${isScanning && idx === 0 ? 'bg-redhawk-600/20 border border-redhawk-600/50 animate-pulse' : ''}
                ${idx === 0 ? 'bg-midnight-800/50 border border-midnight-700/30' : 'bg-midnight-800/20 border border-midnight-700/20'}
                ${idx > 0 ? 'opacity-40' : ''}
                relative group
              `}
              title={phase.desc}
            >
              <span className="text-base mb-0.5">{phase.icon}</span>
              <span className="text-[10px] font-medium whitespace-nowrap text-gray-400">
                {phase.label}
              </span>
              {/* Phase indicator dot */}
              <div className={`w-1 h-1 rounded-full mt-1 ${idx === 0 ? 'bg-redhawk-500' : 'bg-midnight-700'}`} />

              {/* Tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-midnight-800 text-[10px] text-gray-300 
                            px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity 
                            whitespace-nowrap pointer-events-none z-10 border border-midnight-700">
                {phase.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-midnight-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isScanning
              ? 'bg-gradient-to-r from-redhawk-600 to-redhawk-400 animate-pulse'
              : 'bg-gradient-to-r from-redhawk-600 to-redhawk-500'
          }`}
          style={{ width: isScanning ? '15%' : '0%' }}
        />
      </div>

      {/* Phase labels */}
      <div className="flex justify-between mt-1.5 text-[9px] text-gray-600 px-0.5">
        <span className="text-redhawk-500 font-medium">● In scope</span>
        <span>○ Phase 2+</span>
      </div>
    </div>
  );
}
