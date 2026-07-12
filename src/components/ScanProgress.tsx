import React, { useRef, useEffect } from 'react';
import type { ScanPhase } from '../types/target';

interface ScanProgressProps {
  phase: ScanPhase;
  messages: string[];
  output: string;
  collapsible?: boolean;
}

export function ScanProgress({ phase, messages, output, collapsible }: ScanProgressProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [outputOpen, setOutputOpen] = React.useState(!collapsible);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (phase === 'idle' && messages.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Status messages */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <span>Status</span>
          {phase === 'scanning' && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-redhawk-400">
              <span className="w-2 h-2 bg-redhawk-500 rounded-full animate-pulse" />
              Running
            </span>
          )}
          {phase === 'complete' && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Complete
            </span>
          )}
          {phase === 'error' && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-redhawk-400">
              <span className="w-2 h-2 bg-redhawk-500 rounded-full" />
              Error
            </span>
          )}
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-sm text-gray-400 font-mono">
              {msg}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Live output — collapsible */}
      {output && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Raw Output</span>
            <button
              onClick={() => setOutputOpen(!outputOpen)}
              className="btn-ghost text-xs text-gray-500"
            >
              {outputOpen ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>
          {outputOpen && (
            <div className="terminal max-h-48 overflow-y-auto">
              <pre className="text-green-400/80 whitespace-pre-wrap break-all">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
