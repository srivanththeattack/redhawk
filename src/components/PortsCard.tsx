import React from 'react';
import type { NmapPort } from '../types/target';

interface PortsCardProps {
  ports: NmapPort[];
  host?: { ip: string; status: string };
  summary?: string;
}

export function PortsCard({ ports, host, summary }: PortsCardProps) {
  const openPorts = ports.filter((p) => p.state === 'open');
  const filteredPorts = ports.filter((p) => p.state === 'filtered');
  const closedPorts = ports.filter((p) => p.state === 'closed');

  if (ports.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Port Scan</div>
        <p className="text-gray-500 text-sm">No ports found. Target may be down or blocking scans.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Port Scan</span>
        <div className="flex gap-2 text-xs font-normal">
          <span className="badge-open">{openPorts.length} open</span>
          {filteredPorts.length > 0 && (
            <span className="badge-filtered">{filteredPorts.length} filtered</span>
          )}
          {closedPorts.length > 0 && (
            <span className="badge-closed">{closedPorts.length} closed</span>
          )}
        </div>
      </div>

      {host && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <span className="font-mono">{host.ip}</span>
          <span className={`w-2 h-2 rounded-full ${host.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{host.status === 'up' ? 'Host is up' : 'Host is down'}</span>
        </div>
      )}

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {ports.map((port, idx) => (
          <div
            key={idx}
            className={`
              flex items-center gap-3 p-2 rounded text-sm
              ${port.state === 'open' ? 'bg-green-900/10' : ''}
              ${port.state === 'filtered' ? 'bg-yellow-900/10' : ''}
              hover:bg-midnight-800/50 transition-colors
            `}
          >
            {/* Port number */}
            <span className="font-mono text-gray-200 w-16 flex-shrink-0">
              {port.portid}/{port.protocol}
            </span>

            {/* State badge */}
            <span
              className={`badge text-xs w-16 flex-shrink-0 ${
                port.state === 'open'
                  ? 'badge-open'
                  : port.state === 'filtered'
                  ? 'badge-filtered'
                  : 'badge-closed'
              }`}
            >
              {port.state}
            </span>

            {/* Service */}
            <span className="text-gray-300 flex-1 truncate">
              {port.service}
              {port.product && (
                <span className="text-gray-500 ml-1">— {port.product}</span>
              )}
            </span>

            {/* Version */}
            {port.version && (
              <span className="text-gray-500 text-xs font-mono hidden md:block truncate max-w-[150px]">
                {port.version}
              </span>
            )}
          </div>
        ))}
      </div>

      {summary && (
        <p className="text-xs text-gray-600 mt-3 pt-2 border-t border-midnight-800">{summary}</p>
      )}

      {/* Quick actions */}
      {openPorts.length > 0 && (
        <div className="mt-3 pt-2 border-t border-midnight-800">
          <p className="text-xs text-gray-400 mb-2">Quick actions for open ports:</p>
          <div className="flex flex-wrap gap-2">
            {openPorts.some((p) => p.service === 'http' || p.service === 'https') && (
              <button className="btn-ghost text-xs">🌐 Open in browser</button>
            )}
            {openPorts.some((p) => p.portid === '22') && (
              <button className="btn-ghost text-xs">🔑 SSH brute force</button>
            )}
            <button className="btn-ghost text-xs">🔍 Deep scan these ports</button>
          </div>
        </div>
      )}
    </div>
  );
}
