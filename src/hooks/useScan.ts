import { useEffect, useCallback } from 'react';
import { useScanStore } from '../store/scan-store';

export function useScan() {
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
  } = useScanStore();

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
      window.api.onScanStatus((data) => {
        addStatusMessage(data.message);
      })
    );

    cleanups.push(
      window.api.onScanOutput((data) => {
        appendOutput(data);
      })
    );

    cleanups.push(
      window.api.onScanComplete((data) => {
        setResults(data);
        addStatusMessage('Scan complete!');
      })
    );

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  const startScan = useCallback(async () => {
    if (!target.trim()) return;

    reset();
    setPhase('scanning');
    addStatusMessage(`Starting scan on ${target}...`);

    try {
      await window.api.runQuickScan(target.trim());
    } catch (err: any) {
      setPhase('error');
      addStatusMessage(`Error: ${err.message}`);
    }
  }, [target]);

  const runWhois = useCallback(async (domain: string) => {
    addStatusMessage(`Running WHOIS on ${domain}...`);
    return window.api.runWhois(domain);
  }, []);

  const runDnsEnum = useCallback(async (domain: string) => {
    addStatusMessage(`Enumerating DNS for ${domain}...`);
    return window.api.runDnsEnum(domain);
  }, []);

  const runSubdomainEnum = useCallback(async (domain: string) => {
    addStatusMessage(`Finding subdomains for ${domain}...`);
    return window.api.runSubdomainEnum(domain);
  }, []);

  const runEmailOsint = useCallback(async (domain: string) => {
    addStatusMessage(`Looking up emails for ${domain}...`);
    return window.api.runEmailOsint(domain);
  }, []);

  const runNmapScan = useCallback(async (ip: string, flags: string) => {
    addStatusMessage(`Running nmap scan on ${ip}...`);
    return window.api.runNmapScan(ip, flags);
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
      // Re-check
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
    setTarget,
    acceptDisclaimer,
    startScan,
    runWhois,
    runDnsEnum,
    runSubdomainEnum,
    runEmailOsint,
    runNmapScan,
    loadHistory,
    installDeps,
    reset,
  };
}
