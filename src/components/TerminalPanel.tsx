import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TERMINAL_HEIGHT_KEY = 'redhawk_terminal_height';
const DEFAULT_HEIGHT = 220;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;

interface TerminalPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function TerminalPanel({ open, onToggle }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(TERMINAL_HEIGHT_KEY);
      return saved ? Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, parseInt(saved, 10))) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });
  const [ptyReady, setPtyReady] = useState(false);
  const ptyReadyRef = useRef(false);

  // Keep the ref in sync
  useEffect(() => {
    ptyReadyRef.current = ptyReady;
  }, [ptyReady]);

  // ── Resize dragging state ──
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      try { localStorage.setItem(TERMINAL_HEIGHT_KEY, String(startHeightRef.current)); } catch {}
      // Refit terminal after resize
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [height]);

  // ── Initialize xterm + pty ──
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
      theme: {
        background: '#0b0e1a',
        foreground: '#d1d5db',
        cursor: '#ff4455',
        selectionBackground: 'rgba(255,68,85,0.25)',
        black: '#1a1d2e',
        red: '#ff4455',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#d1d5db',
        brightBlack: '#2d3148',
        brightRed: '#ff6b7a',
        brightGreen: '#6ee7b7',
        brightYellow: '#fcd34d',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f3f4f6',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    terminalRef.current = term;

    // Fit to container
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch {}
    });

    // Spawn pty
    let cancelled = false;

    (async () => {
      const dims = fitAddon.proposeDimensions();
      const cols = dims?.cols || 80;
      const rows = dims?.rows || 24;
      const ok = await window.api.terminalCreate(cols, rows);
      if (cancelled) return;
      if (ok) {
        setPtyReady(true);
      } else {
        term.writeln('\x1b[31m⚠ Failed to start WSL terminal.\x1b[0m');
        term.writeln('Make sure WSL is installed and configured.');
      }
    })();

    // Forward pty output → terminal
    const dataCleanup = window.api.onTerminalData((data: string) => {
      if (!cancelled) term.write(data);
    });

    // Handle pty exit
    const exitCleanup = window.api.onTerminalExit(() => {
      if (!cancelled) {
        term.writeln('\r\n\x1b[33m[Process exited]\x1b[0m');
        setPtyReady(false);
      }
    });

    // Forward user input → pty
    const disposeInput = term.onData((data: string) => {
      window.api.terminalWrite(data);
    });

    // ResizeObserver — keeps terminal sized to container and syncs pty dimensions
    const roCallback = () => {
      try {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && ptyReadyRef.current) {
          window.api.terminalResize(dims.cols, dims.rows);
        }
      } catch {}
    };
    const resizeObserver = new ResizeObserver(roCallback);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Store cleanup
    cleanupRef.current = () => {
      cancelled = true;
      disposeInput.dispose();
      dataCleanup();
      exitCleanup();
      resizeObserver.disconnect();
      term.dispose();
      window.api.terminalKill();
      terminalRef.current = null;
      fitAddonRef.current = null;
      setPtyReady(false);
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [open]);

  // ── Send initial resize to pty when it becomes ready ──
  useEffect(() => {
    if (ptyReady && fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          window.api.terminalResize(dims.cols, dims.rows);
        }
      } catch {}
    }
  }, [ptyReady]);

  // ── Focus terminal when opened ──
  useEffect(() => {
    if (open && terminalRef.current) {
      setTimeout(() => terminalRef.current?.focus(), 100);
    }
  }, [open]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-t border-midnight-800/50"
      style={{
        height: open ? height : 0,
        minHeight: open ? MIN_HEIGHT : 0,
        opacity: open ? 1 : 0,
      }}
    >
      {/* Resize handle */}
      <div
        className="h-2 cursor-ns-resize flex items-center justify-center bg-midnight-900/80 hover:bg-midnight-800/80 transition-colors select-none group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-0.5 rounded-full bg-midnight-700 group-hover:bg-redhawk-600/50 transition-colors" />
      </div>

      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-midnight-900/90 border-b border-midnight-800/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">TERMINAL</span>
          <span className={`w-1.5 h-1.5 rounded-full ${ptyReady ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-[10px] text-gray-600">{ptyReady ? 'WSL' : 'disconnected'}</span>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-600 hover:text-gray-300 text-xs px-1.5 py-0.5 rounded transition-colors"
          title="Close terminal"
        >
          ✕
        </button>
      </div>

      {/* xterm container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: `calc(100% - 40px)` }}
        tabIndex={-1}
      />
    </div>
  );
}
