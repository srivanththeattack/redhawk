import { useEffect, useCallback } from 'react';
import { useScanStore } from '../store/scan-store';
import type { ScanResults } from '../types/target';

export function useScan() {
  const store = useScanStore();
  const {
    target,
    phase,
    statusMessages,
    scanOutput,
    results,
    history,
    depsStatus,
    depsChecking,
    disclaimerAccepted,
    scanTasks,
    killChain,
    setTarget,
    setPhase,
    addStatusMessage,
    appendOutput,
    setResults,
    setHistory,
    setDepsStatus,
    setDepsChecking,
    acceptDisclaimer,
    reset,
    setTaskStatus,
    setKillChainPhase,
    resetKillChain,
  } = store;

  // Check dependencies on mount
  useEffect(() => {
    const checkDeps = async () => {
      setDepsChecking(true);
      try {
        const status = await window.api.checkDeps();
        setDepsStatus(status);
      } catch (err) {
        console.error('Failed to check dependencies:', err);
      } finally {
        setDepsChecking(false);
      }
    };
    checkDeps();
  }, []);

  // Subscribe to IPC events
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      window.api.onScanStatus((data: { target: string; message: string }) => {
        addStatusMessage(data.message);
      })
    );

    cleanups.push(
      window.api.onScanOutput((data: string) => {
        appendOutput(data);
      })
    );

    cleanups.push(
      window.api.onScanComplete((data: any) => {
        setResults(data);
        // Mark recon phase as complete in kill chain
        setKillChainPhase('recon', 'complete');
        // Mark all quick-scan tasks as complete
        const state = useScanStore.getState();
        const isDomain = state.target.includes('.') && !state.target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        if (isDomain) {
          state.setTaskStatus('whois', 'complete');
          state.setTaskStatus('dns', 'complete');
          state.setTaskStatus('subdomains', 'complete');
          state.setTaskStatus('emails', 'complete');
        }
        state.setTaskStatus('nmap', 'complete');
        addStatusMessage('Scan complete!');
      })
    );

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // Helper: merge partial results into current results state
  // Uses getState() to avoid stale closures
  const mergeResults = useCallback((partial: Partial<ScanResults>) => {
    const state = useScanStore.getState();
    const current = state.results;
    if (current) {
      state.setResults({ ...current, ...partial });
    } else {
      state.setResults({
        target: state.target || 'unknown',
        timestamp: new Date().toISOString(),
        ...partial,
      } as ScanResults);
    }
  }, []);

  // Helper: run a task with status tracking
  const runTask = useCallback(async (
    taskName: keyof typeof scanTasks,
    label: string,
    runner: () => Promise<any>,
    resultKey: string,
  ) => {
    addStatusMessage(`Running ${label}...`);
    setTaskStatus(taskName, 'running');
    try {
      const data = await runner();
      setTaskStatus(taskName, data?.error ? 'error' : 'complete');
      mergeResults({ [resultKey]: data } as any);
    } catch (err: any) {
      setTaskStatus(taskName, 'error');
      mergeResults({ [resultKey]: { error: err.message } } as any);
    }
  }, []);

  const startScan = useCallback(async () => {
    if (!target.trim()) return;

    reset();
    setPhase('scanning');

    // Set task statuses so the UI shows them as running
    const isDomain = target.includes('.') && !target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    if (isDomain) {
      setTaskStatus('whois', 'running');
      setTaskStatus('dns', 'running');
      setTaskStatus('subdomains', 'running');
      setTaskStatus('emails', 'running');
    }
    setTaskStatus('nmap', 'running');

    addStatusMessage(`Starting scan on ${target}...`);

    try {
      await window.api.runQuickScan(target.trim());
    } catch (err: any) {
      setPhase('error');
      addStatusMessage(`Error: ${err.message}`);
    }
  }, [target]);

  const runWhois = useCallback(async (domain: string) => {
    await runTask('whois', 'WHOIS lookup',
      () => window.api.runWhois(domain),
      'whois',
    );
  }, []);

  const runDnsEnum = useCallback(async (domain: string) => {
    await runTask('dns', 'DNS enumeration',
      () => window.api.runDnsEnum(domain),
      'dns',
    );
  }, []);

  const runSubdomainEnum = useCallback(async (domain: string) => {
    await runTask('subdomains', 'subdomain enumeration',
      () => window.api.runSubdomainEnum(domain),
      'subdomains',
    );
  }, []);

  const runEmailOsint = useCallback(async (domain: string) => {
    await runTask('emails', 'email OSINT',
      () => window.api.runEmailOsint(domain),
      'emails',
    );
  }, []);

  const runNmapScan = useCallback(async (ip: string, flags: string) => {
    await runTask('nmap', 'nmap scan',
      () => window.api.runNmapScan(ip, flags),
      'nmap',
    );
  }, []);

  const runSslScan = useCallback(async (domain: string) => {
    await runTask('ssl', 'SSL certificate scan',
      () => window.api.runSslScan(domain),
      'ssl',
    );
  }, []);

  const runHttpHeaders = useCallback(async (domain: string) => {
    await runTask('httpHeaders', 'HTTP headers scan',
      () => window.api.runHttpHeaders(domain),
      'httpHeaders',
    );
  }, []);

  const runWafDetect = useCallback(async (domain: string) => {
    await runTask('waf', 'WAF detection',
      () => window.api.runWafDetect(domain),
      'waf',
    );
  }, []);

  const runTechDetect = useCallback(async (domain: string) => {
    await runTask('tech', 'technology fingerprinting',
      () => window.api.runTechDetect(domain),
      'tech',
    );
  }, []);

  const runDirBrute = useCallback(async (domain: string) => {
    await runTask('dirBrute', 'directory bruteforce',
      () => window.api.runDirBrute(domain),
      'dirBrute',
    );
  }, []);

  const runServiceScan = useCallback(async (ip: string) => {
    await runTask('serviceScan', 'service version scan',
      () => window.api.runServiceScan(ip),
      'serviceScan',
    );
  }, []);

  const runVulnScan = useCallback(async (ip: string) => {
    await runTask('vulnScan', 'vulnerability scan',
      () => window.api.runVulnScan(ip),
      'vulnScan',
    );
  }, []);

  const runMaigret = useCallback(async (username: string) => {
    await runTask('maigret', 'maigret username OSINT',
      () => window.api.runMaigret(username),
      'maigret',
    );
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const h = await window.api.getScanHistory();
      setHistory(h);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  const installDeps = useCallback(async () => {
    setDepsChecking(true);
    try {
      const result = await window.api.installDeps(true);
      addStatusMessage(result.success ? 'Dependencies installed!' : 'Some deps failed');
      const status = await window.api.checkDeps();
      setDepsStatus(status);
    } catch (err: any) {
      addStatusMessage(`Dependency install error: ${err.message}`);
    } finally {
      setDepsChecking(false);
    }
  }, []);

  return {
    target,
    phase,
    statusMessages,
    scanOutput,
    results,
    history,
    depsStatus,
    depsChecking,
    disclaimerAccepted,
    scanTasks,
    killChain,
    appendOutput,
    setTarget,
    acceptDisclaimer,
    startScan,
    runWhois,
    runDnsEnum,
    runSubdomainEnum,
    runEmailOsint,
    runNmapScan,
    runSslScan,
    runHttpHeaders,
    runWafDetect,
    runTechDetect,
    runDirBrute,
    runServiceScan,
    runVulnScan,
    runMaigret,
    loadHistory,
    installDeps,
    reset,
    setKillChainPhase,
    resetKillChain,
  };
}
