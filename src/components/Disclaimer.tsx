import React from 'react';

interface DisclaimerProps {
  onAccept: () => void;
}

export function Disclaimer({ onAccept }: DisclaimerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-midnight-900 border border-redhawk-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-redhawk-600/20 flex items-center justify-center">
            <span className="text-redhawk-500 text-xl font-bold">!</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">Legal Disclaimer</h2>
            <p className="text-sm text-gray-400">READ CAREFULLY BEFORE USE</p>
          </div>
        </div>

        {/* Body */}
        <div className="bg-midnight-950 rounded-lg p-4 mb-6 text-sm text-gray-300 space-y-3 border border-midnight-700">
          <p>
            <strong className="text-redhawk-400">RedHawk</strong> is an offensive
            security assessment tool designed for <strong className="text-gray-100">authorized security testing only</strong>.
          </p>

          <p>By using this software, you acknowledge and agree that:</p>

          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>
              You have <strong className="text-gray-200">explicit written permission</strong> to test the target system(s).
            </li>
            <li>
              Unauthorized use of this tool against any system without permission is{' '}
              <strong className="text-redhawk-400">illegal</strong> and may result in
              criminal prosecution.
            </li>
            <li>
              The authors assume <strong className="text-gray-200">no liability</strong>{' '}
              for any misuse or damage caused by this software.
            </li>
            <li>
              You are solely responsible for complying with all applicable local, state,
              and federal laws.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onAccept} className="btn-primary w-full text-base py-3">
            I Accept — I Have Authorization
          </button>
          <button
            onClick={() => window.close()}
            className="btn-secondary w-full text-sm"
          >
            Decline — Exit
          </button>
        </div>
      </div>
    </div>
  );
}
