import React, { useState, useCallback } from 'react';

const GITHUB_RELEASES_URL = 'https://github.com/srivanththeattack/redhawk/releases';

export function UpdateBanner() {
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowDetails(false);
  }, []);

  const handleOpenReleases = useCallback(() => {
    window.open(GITHUB_RELEASES_URL, '_blank');
    setShowDetails(false);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title="Check for updates"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
          text-gray-400 hover:text-white hover:bg-midnight-700/50
          transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="hidden sm:inline">Updates</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden">

          <div className="flex items-center justify-between px-4 py-3 border-b border-midnight-700/50">
            <span className="text-sm font-medium text-white">Updates</span>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-300">
              You're running <strong className="text-white">v0.1.1</strong>
            </p>
            <p className="text-xs text-gray-500">
              Check GitHub for the latest release and download the new installer.
            </p>
            <button
              onClick={handleOpenReleases}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium
                bg-midnight-700 hover:bg-midnight-600 text-gray-200
                border border-midnight-600/50 hover:border-midnight-500/50
                transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open GitHub Releases
            </button>
          </div>

          <div className="px-4 py-2 bg-midnight-900/50 border-t border-midnight-700/50">
            <p className="text-[10px] text-gray-600 text-center">
              After downloading, run the new installer to update
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
