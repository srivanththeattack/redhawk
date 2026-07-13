import React, { useEffect, useState, useCallback } from 'react';

const TAB_HISTORY_LABELS: Record<string, string> = {
  recon: 'Scan History',
  exploit: 'Exploit History',
  phish: 'Phish History',
  c2: 'C2 History',
  exfil: 'Exfil History',
};

const TAB_ICONS: Record<string, string> = {
  recon: '🔍',
  exploit: '💀',
  phish: '🎣',
  c2: '📡',
  exfil: '📤',
};

function ActivityIcon(type: string): string {
  switch (type) {
    case 'scan': return '🔍';
    case 'exploit': return '💀';
    case 'phish': return '🎣';
    case 'c2': return '📡';
    case 'exfil': return '📤';
    case 'connect': return '🔗';
    case 'disconnect': return '🔌';
    case 'start': return '▶️';
    case 'stop': return '⏹️';
    case 'error': return '❌';
    case 'success': return '✅';
    case 'command': return '⌨️';
    case 'info': return 'ℹ️';
    default: return '📋';
  }
}

export function HistorySidebar({ currentTab, scan }: { currentTab: string; scan: any }) {
  const [activities, setActivities] = useState<any[]>([]);

  const loadActivities = useCallback(async () => {
    try {
      // For recon, show scan history from the store
      if (currentTab === 'recon') {
        setActivities(scan.history || []);
        return;
      }
      // For other tabs, load from activity log
      const acts = await window.api.getActivity(currentTab);
      setActivities(acts || []);
    } catch {
      setActivities([]);
    }
  }, [currentTab, scan.history]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleClear = useCallback(async () => {
    const label = TAB_HISTORY_LABELS[currentTab] || 'History';
    if (!window.confirm(`Clear all ${label.toLowerCase()}?`)) return;

    try {
      if (currentTab === 'recon') {
        await window.api.clearScanHistory();
        scan.loadHistory();
      } else {
        await window.api.clearActivity(currentTab);
        loadActivities();
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [currentTab, scan, loadActivities]);

  const title = TAB_HISTORY_LABELS[currentTab] || 'History';
  const icon = TAB_ICONS[currentTab] || '📋';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h3>
        <div className="flex items-center gap-2">
          {activities.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[10px] text-gray-600 hover:text-redhawk-400 transition-colors"
              title="Clear history"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-gray-600 bg-midnight-800 px-2 py-0.5 rounded-full">
            {activities.length}
          </span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <svg className="w-10 h-10 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs">No {currentTab === 'recon' ? 'scans' : 'activity'} yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((entry: any, idx: number) => {
            // Determine if it's a recon scan entry or activity entry
            const isScanEntry = entry.target && entry.results;
            const time = isScanEntry
              ? new Date(entry.timestamp).toLocaleString()
              : new Date(entry.timestamp).toLocaleString();
            const actIcon = isScanEntry ? '🔍' : ActivityIcon(entry.type);

            return (
              <div
                key={idx}
                className="group p-3 rounded-lg bg-midnight-800/30 border border-midnight-700/30
                           hover:bg-midnight-700/40 hover:border-midnight-600/50 transition-all duration-150"
              >
                {isScanEntry ? (
                  // Scan history entry
                  <>
                    <div
                      className="cursor-pointer"
                      onClick={() => scan.setTarget(entry.target)}
                    >
                      <p className="text-sm font-mono text-gray-200 truncate group-hover:text-redhawk-400 transition-colors">
                        {entry.target}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1.5 font-medium">
                        {time}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.results?.nmap?.openPortCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/40">
                            {entry.results.nmap.openPortCount} ports
                          </span>
                        )}
                        {entry.results?.whois && !('error' in entry.results.whois) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/40">WHOIS</span>
                        )}
                        {entry.results?.dns && !('error' in entry.results.dns) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-700/40">DNS</span>
                        )}
                        {entry.results?.subdomains?.count > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/40">
                            {entry.results.subdomains.count} subs
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  // Activity log entry
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{actIcon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-200 truncate">{entry.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{entry.detail}</p>
                        <p className="text-[9px] text-gray-600 mt-1">{time}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
