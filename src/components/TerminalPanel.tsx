import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import type { ITheme } from 'xterm';
import 'xterm/css/xterm.css';

const TERMINAL_HEIGHT_KEY = 'redhawk_terminal_height';
const DEFAULT_HEIGHT = 220;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;

interface TerminalPanelProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Build an xterm theme by reading the app's CSS custom properties.
 * Falls back to a solid dark palette if variables aren't set.
 */
function getTerminalTheme(): ITheme {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  const read = (varName: string, fallback: string) => {
    const val = style.getPropertyValue(varName).trim();
    return val || fallback;
  };

  const bg    = read('--theme-bg-primary', '#0b0e1a');
  const fg    = read('--theme-text-primary', '#d1d5db');
  const accent = read('--theme-accent', '#ff4455');
  const err   = read('--theme-error', '#ef4444');
  const ok    = read('--theme-success', '#34d399');
  const warn  = read('--theme-warning', '#fbbf24');

  return {
    background: bg,
    foreground: fg,
    cursor: accent,
    cursorAccent: bg,
    selectionBackground: accent + '35',
    selectionInactiveBackground: accent + '1a',

    // Standard ANSI colours — the first 8 use theme colours where they fit
    black: '#1e1e2e',
    red: err,
    green: ok,
    yellow: warn,
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: fg,

    // Bright variants — slightly lighter
    brightBlack: '#3b4261',
    brightRed: err + 'cc',
    brightGreen: ok + 'cc',
    brightYellow: warn + 'cc',
    brightBlue: '#89b4fa',
    brightMagenta: '#cba6f7',
    brightCyan: '#89dceb',
    brightWhite: '#e2e8f0',
  };
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

  useEffect(() => {
    ptyReadyRef.current = ptyReady;
  }, [ptyReady]);

  // ── Resize dragging ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + delta)));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      try { localStorage.setItem(TERMINAL_HEIGHT_KEY, String(height)); } catch {}
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [height]);

  // ── Watch for live theme changes & apply to xterm ──
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    const updateTheme = () => {
      try { term.setOption('theme', getTerminalTheme()); } catch {}
    };

    // Observe data-theme attribute changes on <html>
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          updateTheme();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    // Also observe style changes (some themes set CSS vars via style attribute)
    const styleObserver = new MutationObserver(() => updateTheme());
    styleObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      styleObserver.disconnect();
    };
  }, [ptyReady]);

  // ── Initialize xterm + pty ──
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
      theme: getTerminalTheme(),
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    terminalRef.current = term;

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

    // ResizeObserver — keeps terminal sized to container and syncs pty dims
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
      className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-t"
      style={{
        borderColor: 'var(--theme-border, rgba(255,255,255,0.08))',
        height: open ? height : 0,
        minHeight: open ? MIN_HEIGHT : 0,
        opacity: open ? 1 : 0,
      }}
    >
      {/* Resize handle */}
      <div
        className="h-2 cursor-ns-resize flex items-center justify-center select-none group"
        style={{ background: 'var(--theme-bg-secondary, #0f1525)' }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="w-8 h-0.5 rounded-full transition-colors"
          style={{ background: 'var(--theme-text-muted, #4a5568)' }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--theme-accent, #ff4455)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--theme-text-muted, #4a5568)')}
        />
      </div>

      {/* Terminal header bar */}
      <div
        className="flex items-center justify-between px-3 py-1 border-b"
        style={{
          background: 'var(--theme-bg-secondary, #0f1525)',
          borderColor: 'var(--theme-border, rgba(255,255,255,0.05))',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--theme-text-secondary, #c8d0e0)' }} className="text-xs font-medium tracking-wider">TERMINAL</span>
          <span className={`w-1.5 h-1.5 rounded-full ${ptyReady ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-[10px]" style={{ color: 'var(--theme-text-muted, #4a5568)' }}>{ptyReady ? 'WSL' : 'disconnected'}</span>
        </div>
        <button
          onClick={onToggle}
          className="text-xs px-1.5 py-0.5 rounded transition-colors"
          style={{ color: 'var(--theme-text-muted, #4a5568)' }}
          title="Close terminal"
        >
          ✕
        </button>
      </div>

      {/* xterm container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: 'calc(100% - 40px)' }}
        tabIndex={-1}
      />
    </div>
  );
}
