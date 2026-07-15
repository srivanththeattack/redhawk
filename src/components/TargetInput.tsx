import React, { useState, useRef, useEffect } from 'react';

interface TargetInputProps {
  target: string;
  onTargetChange: (target: string) => void;
  onScan: () => void;
  isScanning: boolean;
  placeholder?: string;
  label?: string;
}

export function TargetInput({ target, onTargetChange, onScan, isScanning, placeholder, label }: TargetInputProps) {
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Ctrl+Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isValid && target.trim() && !isScanning) {
        onScan();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [target, isValid, isScanning, onScan]);

  const validateAndSet = (value: string) => {
    onTargetChange(value);
    if (!value.trim()) {
      setIsValid(true);
      return;
    }
    // In maigret mode (username search), accept any non-empty input
    if (placeholder?.toLowerCase().includes('username')) {
      setIsValid(true);
      return;
    }
    const clean = value.trim();
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean);
    const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(clean);
    // Also accept hostnames without TLD for local targets
    const isHostname = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(clean);
    setIsValid(isIp || isDomain || isHostname);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && target.trim()) {
      onScan();
    }
  };

  return (
    <div className="relative group">
      {/* Subtle glow effect on focus */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-redhawk-600/20 to-redhawk-800/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />

      <div className="relative card border-midnight-700/50 group-focus-within:border-redhawk-600/50 transition-colors duration-200">
        <div className="flex items-center gap-3">
          {/* Input with icon */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-600 group-focus-within:text-redhawk-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={target}
              onChange={(e) => validateAndSet(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Enter target — IP, domain, or hostname..."}
              className={`input-field pl-10 h-12 text-base ${
                !isValid && target.trim() ? 'border-redhawk-500 focus:ring-redhawk-500' : ''
              }`}
              disabled={isScanning}
            />
            {!isValid && target.trim() && (
              <p className="text-redhawk-400 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {placeholder?.toLowerCase().includes('username')
                  ? 'Enter a valid username'
                  : 'Enter a valid IP, domain (example.com), or hostname'}
              </p>
            )}
          </div>

          {/* Scan button */}
          <div className="relative group/scan">
          <button
            onClick={onScan}
            disabled={!target.trim() || !isValid || isScanning}
            className="btn-primary flex items-center gap-2 h-12 px-6 whitespace-nowrap text-sm"
            title="Quick scan — runs WHOIS, DNS, Subdomains, Emails (for domains) + Nmap port scan"
          >
            {isScanning ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Launch Scan
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
