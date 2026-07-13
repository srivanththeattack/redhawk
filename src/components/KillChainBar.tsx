import React from 'react';
import type { KillChainState, KillChainPhaseId, KillChainStatus } from '../store/scan-store';

const PHASES: { id: KillChainPhaseId; label: string; icon: string; desc: string }[] = [
  { id: 'recon', label: 'Recon', icon: '🔍', desc: 'Information gathering' },
  { id: 'exploit', label: 'Exploit', icon: '💀', desc: 'Metasploit exploitation' },
  { id: 'phish', label: 'Phish', icon: '🎣', desc: 'Evilginx2 phishing' },
  { id: 'c2', label: 'C2', icon: '📡', desc: 'Command & control server' },
  { id: 'exfil', label: 'Exfil', icon: '📤', desc: 'Data exfiltration' },
];

function statusColor(status: KillChainStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]';
    case 'active':
      return 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.5)] animate-pulse';
    default:
      return 'bg-midnight-600';
  }
}

function statusBorder(status: KillChainStatus): string {
  switch (status) {
    case 'complete':
      return 'border-green-700/60 bg-green-950/20';
    case 'active':
      return 'border-yellow-600/60 bg-yellow-950/20';
    default:
      return 'border-midnight-700/40 bg-midnight-800/40';
  }
}

function progressWidth(chain: KillChainState): number {
  const order: KillChainPhaseId[] = ['recon', 'exploit', 'phish', 'c2', 'exfil'];
  const completed = order.filter((id) => chain[id] === 'complete').length;
  return (completed / order.length) * 100;
}

function getStatusText(chain: KillChainState): string {
  const total = Object.keys(chain).length;
  const completed = Object.values(chain).filter((s) => s === 'complete').length;
  if (completed === total) return '● All phases complete';
  const active = Object.values(chain).filter((s) => s === 'active').length;
  if (active > 0) return `● ${active} phase${active > 1 ? 's' : ''} active`;
  if (completed > 0) return `● ${completed}/${total} phases complete`;
  return '● No activity yet';
}

function getProgressColor(chain: KillChainState): string {
  const order: KillChainPhaseId[] = ['recon', 'exploit', 'phish', 'c2', 'exfil'];
  const completed = order.filter((id) => chain[id] === 'complete').length;
  if (completed === 0) return 'bg-midnight-600';
  if (completed >= order.length) return 'bg-gradient-to-r from-green-500 to-emerald-500';
  return 'bg-gradient-to-r from-blue-500 via-yellow-500 to-green-500';
}

export function KillChainBar({ chain }: { chain: KillChainState }) {
  const width = progressWidth(chain);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Cyber Kill Chain</h3>
        <span className="text-[9px] text-gray-600">{getStatusText(chain)}</span>
      </div>
      <div className="flex items-center gap-0.5 overflow-x-auto py-1">
        {PHASES.map((phase, idx) => {
          const status = chain[phase.id];
          return (
            <div
              key={phase.id}
              className={`
                flex flex-col items-center flex-shrink-0 px-2.5 py-2 rounded-lg transition-all duration-200
                border ${statusBorder(status)}
                group relative cursor-default
              `}
              title={`${phase.label}: ${status.charAt(0).toUpperCase() + status.slice(1)} — ${phase.desc}`}
            >
              <span className="text-base mb-0.5">{phase.icon}</span>
              <span className="text-[10px] font-medium whitespace-nowrap text-gray-400">
                {phase.label}
              </span>
              {/* Status dot */}
              <div className={`w-1.5 h-1.5 rounded-full mt-1 ${statusColor(status)}`} />

              {/* Arrow between phases */}
              {idx < PHASES.length - 1 && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 text-midnight-600 text-[10px] pointer-events-none">
                  ›
                </div>
              )}

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

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-midnight-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(chain)}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5 text-[9px] text-gray-600 px-0.5">
        <span className="font-medium">{getStatusText(chain)}</span>
        <span>v0.1</span>
      </div>
    </div>
  );
}
