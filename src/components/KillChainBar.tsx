import React from 'react';
import type { ScanPhase } from '../types/target';

const PHASES = [
  { id: 'recon', label: 'Recon', icon: '🔍', description: 'Information gathering' },
  { id: 'weaponize', label: 'Weaponize', icon: '⚙️', description: 'Payload creation' },
  { id: 'deliver', label: 'Deliver', icon: '📤', description: 'Delivery mechanism' },
  { id: 'exploit', label: 'Exploit', icon: '💥', description: 'Vulnerability exploitation' },
  { id: 'install', label: 'Install', icon: '📦', description: 'Backdoor installation' },
  { id: 'c2', label: 'C2', icon: '📡', description: 'Command & control' },
  { id: 'actions', label: 'Actions', icon: '🎯', description: 'Objectives' },
];

interface KillChainBarProps {
  currentPhase: ScanPhase;
  activePhase?: number;
}

export function KillChainBar({ currentPhase, activePhase = 0 }: KillChainBarProps) {
  const isScanning = currentPhase === 'scanning';

  return (
    <div className="card">
      <div className="card-header">Cyber Kill Chain</div>
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {PHASES.map((phase, idx) => {
          const isActive = idx === activePhase;
          const isComplete = idx < activePhase;
          const isAvailable = idx === 0; // Only recon is unlocked in Phase 1

          return (
            <div
              key={phase.id}
              className={`
                flex flex-col items-center flex-shrink-0 px-3 py-2 rounded-lg transition-all duration-200
                ${isActive && isScanning ? 'bg-redhawk-600/20 border border-redhawk-600/50 animate-pulse' : ''}
                ${isComplete ? 'bg-green-900/20 border border-green-700/30' : ''}
                ${!isActive && !isComplete ? 'bg-midnight-800/50 border border-midnight-700/30' : ''}
                ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-midnight-700/50'}
              `}
              title={isAvailable ? phase.description : 'Coming soon'}
            >
              <span className="text-lg mb-1">{phase.icon}</span>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-redhawk-400' : 'text-gray-400'}`}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress line */}
      <div className="mt-2 h-1 bg-midnight-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isScanning ? 'bg-redhawk-600 animate-pulse' : 'bg-green-600'
          }`}
          style={{ width: isScanning ? '15%' : '0%' }}
        />
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        {isScanning ? 'Recon in progress...' : 'Phase 1: Recon (other phases coming soon)'}
      </p>
    </div>
  );
}
