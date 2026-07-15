import { useState, useCallback, useRef, useEffect } from 'react';
import type { TabId } from '../hooks/useSplitPanes';

interface TourStep {
  /** CSS selector for the element to highlight */
  target: string;
  title: string;
  description: string;
  /** Which side of the target the tooltip appears on */
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** If set, click this tab when the user clicks "Next" */
  activateTab?: TabId;
  /** If true, this step doesn't highlight an element (center screen message) */
  isCentered?: boolean;
}

interface GuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
  /** Callback to switch tabs during the tour */
  onActivateTab: (tabId: TabId) => void;
  activeTab: TabId;
  /** Whether the disclaimer was just accepted (first launch) */
  isFirstLaunch: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="logo"]',
    title: '🦅 Welcome to RedHawk',
    description: 'Your all-in-one red teaming suite. This quick tour will walk you through the key tools so you can start hunting.',
    placement: 'bottom',
    isCentered: true,
  },
  {
    target: '[data-tour="tab-recon"]',
    title: '🔍 Recon — Start Here',
    description: 'Enter a domain or IP, hit "Launch Scan", and RedHawk runs WHOIS, DNS, subdomain enumeration, email OSINT, and Nmap port scan in one click.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-exploit"]',
    title: '💥 Exploit',
    description: 'Metasploit RPC integration — search exploits, generate payloads, manage sessions. Needs msfrpcd running in WSL.',
    placement: 'bottom',
    activateTab: 'exploit',
  },
  {
    target: '[data-tour="tab-phish"]',
    title: '🎣 Phish',
    description: 'Evilginx2 campaign management — create phishing campaigns, deploy phishlets, capture credentials.',
    placement: 'bottom',
    activateTab: 'phish',
  },
  {
    target: '[data-tour="tab-payload"]',
    title: '📦 Payload Factory',
    description: 'Generate reverse shell payloads in 10+ formats (Python, PowerShell, C#, VBA, Nim, Rust...). Obfuscate and sign them.',
    placement: 'bottom',
    activateTab: 'payload',
  },
  {
    target: '[data-tour="tab-c2"]',
    title: '📡 Command & Control',
    description: 'Start a C2 server, deploy beacons, send commands, manage agents. Supports malleable C2 profiles.',
    placement: 'bottom',
    activateTab: 'c2',
  },
  {
    target: '[data-tour="tab-exfil"]',
    title: '📤 Exfiltration',
    description: 'Collect files, take screenshots, grab browser data, encrypt and package it all for exfiltration.',
    placement: 'bottom',
    activateTab: 'exfil',
  },
  {
    target: '[data-tour="tab-ops"]',
    title: '📋 Operations Dashboard',
    description: 'Track your operation — timeline, notes, findings, screenshots, and task todos all in one place.',
    placement: 'bottom',
    activateTab: 'ops',
  },
  {
    target: '[data-tour="tab-team"]',
    title: '👥 Team Collaboration',
    description: 'Real-time team coordination — shared activity feed, findings, notes, and target check-in/out.',
    placement: 'bottom',
    activateTab: 'team',
  },
  {
    target: '[data-tour="hamburger"]',
    title: '⚙️ Settings & History',
    description: 'Open the menu to access Settings (tab order, split panes, compact mode, themes) and scan History.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="deps"]',
    title: '🔧 Dependencies',
    description: 'Click here to check and auto-install missing tools (Nmap, Python, Evilginx2, Metasploit, etc.).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="statusbar"]',
    title: '📊 Status Bar',
    description: 'Keep an eye on scan progress, active operation, C2 status, and dependency health — all at a glance.',
    placement: 'top',
  },
  {
    target: '[data-tour="logo"]',
    title: '✅ You\'re Ready!',
    description: 'That covers the essentials. Start with Recon — enter a target and hit Launch Scan. Happy hunting!',
    placement: 'bottom',
    isCentered: true,
  },
];

function computeTooltipStyle(
  targetEl: Element,
  placement: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number,
): React.CSSProperties {
  const rect = targetEl.getBoundingClientRect();
  const gap = 12;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = rect.top - tooltipHeight - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + gap;
      break;
  }

  // Keep tooltip within viewport
  const padding = 16;
  if (left < padding) left = padding;
  if (left + tooltipWidth > window.innerWidth - padding) {
    left = window.innerWidth - tooltipWidth - padding;
  }
  if (top < padding) top = padding;
  if (top + tooltipHeight > window.innerHeight - padding) {
    top = window.innerHeight - tooltipHeight - padding;
  }

  return { position: 'fixed', top, left, zIndex: 70 };
}

export function GuidedTour({ onComplete, onSkip, onActivateTab, activeTab, isFirstLaunch }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[stepIndex];

  // Position the tooltip whenever the step changes or window resizes
  const reposition = useCallback(() => {
    if (step.isCentered) {
      setTargetRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70,
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      // Fallback: show centered
      setTargetRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70,
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    // Estimate tooltip dimensions (we measure after render, but need an initial position)
    const tw = 340;
    const th = 180;
    setTooltipStyle(computeTooltipStyle(el, step.placement, tw, th));
  }, [step]);

  useEffect(() => {
    reposition();
    // Re-measure after render with actual tooltip dimensions
    requestAnimationFrame(() => {
      if (tooltipRef.current && !step.isCentered) {
        const el = document.querySelector(step.target);
        if (el) {
          const tw = tooltipRef.current.offsetWidth || 340;
          const th = tooltipRef.current.offsetHeight || 180;
          setTooltipStyle(computeTooltipStyle(el, step.placement, tw, th));
        }
      }
    });
  }, [stepIndex]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [reposition]);

  const goNext = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      const nextStep = TOUR_STEPS[stepIndex + 1];
      // If next step requires activating a tab, do it
      if (nextStep.activateTab && nextStep.activateTab !== activeTab) {
        onActivateTab(nextStep.activateTab);
      }
      setStepIndex(stepIndex + 1);
    } else {
      onComplete();
    }
  }, [stepIndex, activeTab, onActivateTab, onComplete]);

  const goPrev = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }, [stepIndex]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 tour-backdrop active"
        style={{
          background: 'rgba(7, 11, 23, 0.75)',
          backdropFilter: 'blur(3px)',
        }}
        onClick={handleSkip}
      />

      {/* Target highlight ring */}
      {targetRect && !step.isCentered && (
        <div
          className="fixed pointer-events-none tour-spotlight"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            zIndex: 60,
            borderRadius: 8,
            border: '2px solid rgba(255, 68, 85, 0.7)',
            boxShadow: '0 0 0 4px rgba(255, 68, 85, 0.15), 0 0 32px rgba(255, 68, 85, 0.2)',
            animation: 'tourPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{
          ...tooltipStyle,
          width: step.isCentered ? 420 : 340,
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-midnight-900 border border-redhawk-700/50 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-base font-bold text-gray-100 leading-tight">
              {step.title}
            </h3>
          </div>

          {/* Body */}
          <div className="px-5 pb-3">
            <p className="text-sm text-gray-400 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-3">
            <div className="w-full h-1 bg-midnight-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-redhawk-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1 text-right">
              {stepIndex + 1} / {TOUR_STEPS.length}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={goPrev}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-600 hover:text-gray-400 px-2 py-1 rounded transition-colors"
              >
                Skip
              </button>
              <button
                onClick={goNext}
                className="btn-primary text-xs px-4 py-1.5"
              >
                {isLast ? 'Done 🎯' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
