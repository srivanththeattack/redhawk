import React, { useState } from 'react';

interface TargetInputProps {
  target: string;
  onTargetChange: (target: string) => void;
  onScan: () => void;
  isScanning: boolean;
}

export function TargetInput({ target, onTargetChange, onScan, isScanning }: TargetInputProps) {
  const [isValid, setIsValid] = useState(true);

  const validateAndSet = (value: string) => {
    onTargetChange(value);
    if (!value.trim()) {
      setIsValid(true);
      return;
    }
    // Basic validation — IP or domain
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value.trim());
    const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value.trim());
    setIsValid(isIp || isDomain);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && target.trim()) {
      onScan();
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={target}
            onChange={(e) => validateAndSet(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter target IP or domain... (e.g., 192.168.1.1 or example.com)"
            className={`input-field pl-10 ${!isValid && target.trim() ? 'border-redhawk-500 focus:ring-redhawk-500' : ''}`}
            disabled={isScanning}
          />
          {!isValid && target.trim() && (
            <p className="text-redhawk-400 text-xs mt-1">Enter a valid IP address or domain name</p>
          )}
        </div>

        <button
          onClick={onScan}
          disabled={!target.trim() || !isValid || isScanning}
          className="btn-primary flex items-center gap-2 h-[42px] whitespace-nowrap"
        >
          {isScanning ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
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
              Scan Target
            </>
          )}
        </button>
      </div>
    </div>
  );
}
