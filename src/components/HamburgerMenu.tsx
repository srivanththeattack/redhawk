import React, { useState, useCallback, useRef, useEffect } from 'react';

const GITHUB_RELEASES_URL = 'https://github.com/srivanththeattack/redhawk/releases';

const HELP_SECTIONS: { title: string; content: string }[] = [
  {
    title: '🔍 Reconnaissance',
    content: `Run targeted recon scans against a domain or IP. Each button runs a specific scan type:
• WHOIS — Domain registration details
• DNS — DNS record enumeration (A, AAAA, MX, TXT, NS, CNAME, SOA)
• Subdomains — Bruteforce subdomains using a built-in wordlist
• Emails — OSINT email address harvesting
• Port Scan — nmap SYN scan of top 1000 ports
• SSL Cert — Fetch and parse SSL/TLS certificate details
• HTTP Headers — Analyze HTTP response headers
• WAF Detect — Detect Web Application Firewalls via probe requests
• Tech Detect — Identify web technologies and frameworks
• Dir Brute — Directory/file bruteforce
• Service Scan — nmap service version detection (-sV)
• Vuln Scan — nmap NSE vulnerability scripts (--script vuln)`,
  },
  {
    title: '💀 Exploitation (Metasploit)',
    content: `Connect to a running Metasploit RPC daemon (msfrpcd) to:
• Search for exploits and payloads
• Generate payloads with LHOST/LPORT
• List active sessions
• Launch exploits (coming soon)

Start msfrpcd: msfrpcd -P <password> -S -f`,
  },
  {
    title: '🎣 Phishing (Evilginx2)',
    content: `Create and manage phishing campaigns using evilginx2:
• Check evilginx2 status and available phishlets
• Create a campaign with target domain and phishlet
• Start/stop the phishing server
• Harvest captured credentials
• Delete completed campaigns

Requires evilginx2 binary in PATH. Configure your VPS IP and domain before starting.`,
  },
  {
    title: '📡 Command & Control',
    content: `Built-in C2 server for agent management:
• Start/stop the C2 listener (configure port, SSL)
• View connected agents
• Send commands to individual agents or broadcast
• Generate agent payloads (PowerShell, Python, Bash)

Use responsibly — only on authorized targets.`,
  },
  {
    title: '📤 Data Exfiltration',
    content: `Collect, package, and exfiltrate data:
• Create exfiltration jobs targeting directories
• Collect browser data (cookies, saved passwords from Chrome/FF)
• Take screenshots
• Package with optional compression (zip/gzip) and encryption (AES-256)
• Exfiltrate via HTTP POST or SMB`,
  },
  {
    title: '❓ Troubleshooting',
    content: `• Dependencies not found? Click "Install Deps" in the header
• Scans not running? Ensure nmap/python3 are in PATH
• MSF not connecting? Verify msfrpcd is running and port/password are correct
• Evilginx not found? Download from https://github.com/kgretzky/evilginx2/releases
• C2 agents not connecting? Check firewall rules
• Report issues: https://github.com/srivanththeattack/redhawk/issues`,
  },
];

interface HamburgerMenuProps {
  onToggleHistory: () => void;
  sidebarOpen: boolean;
}

export function HamburgerMenu({ onToggleHistory, sidebarOpen }: HamburgerMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSub, setActiveSub] = useState<'updates' | 'help' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setActiveSub(null);
        setSearchQuery('');
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
    setActiveSub(null);
    setSearchQuery('');
  }, []);

  const handleItemClick = useCallback((item: 'updates' | 'help' | 'history') => {
    if (item === 'history') {
      onToggleHistory();
      handleClose();
    } else if (item === 'updates') {
      setActiveSub(activeSub === 'updates' ? null : 'updates');
    } else if (item === 'help') {
      setActiveSub(activeSub === 'help' ? null : 'help');
    }
  }, [activeSub, onToggleHistory, handleClose]);

  const handleOpenReleases = useCallback(() => {
    window.open(GITHUB_RELEASES_URL, '_blank');
    handleClose();
  }, [handleClose]);

  const filtered = searchQuery.trim()
    ? HELP_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : HELP_SECTIONS;

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger button */}
      <button
        onClick={() => { setMenuOpen(!menuOpen); setActiveSub(null); setSearchQuery(''); }}
        title="Menu"
        className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-all ${
          menuOpen
            ? 'bg-midnight-700/50 text-white'
            : 'text-gray-400 hover:text-white hover:bg-midnight-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden">

          {/* Updates */}
          <div className="border-b border-midnight-700/50">
            <button
              onClick={() => handleItemClick('updates')}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300
                hover:bg-midnight-700/50 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="flex-1 text-left">Updates</span>
              <svg className={`w-3 h-3 text-gray-600 transition-transform ${activeSub === 'updates' ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {activeSub === 'updates' && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-gray-400">
                  You're running <strong className="text-white">v0.1.1</strong>
                </p>
                <p className="text-[11px] text-gray-500">
                  Check GitHub for the latest release.
                </p>
                <button onClick={handleOpenReleases}
                  className="w-full py-2 rounded-lg text-xs font-medium
                    bg-midnight-700 hover:bg-midnight-600 text-gray-200
                    border border-midnight-600/50 transition-colors">
                  Open GitHub Releases
                </button>
              </div>
            )}
          </div>

          {/* Help */}
          <div className="border-b border-midnight-700/50">
            <button
              onClick={() => handleItemClick('help')}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300
                hover:bg-midnight-700/50 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-left">Help</span>
              <svg className={`w-3 h-3 text-gray-600 transition-transform ${activeSub === 'help' ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {activeSub === 'help' && (
              <div className="px-4 pb-4">
                <div className="relative mb-2">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search help..."
                    className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-midnight-900 border border-midnight-600/50 rounded-lg
                      text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filtered.map((s, i) => (
                    <div key={i}>
                      <p className="text-[11px] font-semibold text-gray-300">{s.title}</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-line">{s.content}</p>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-[11px] text-gray-500 text-center py-2">No results</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <button
            onClick={() => handleItemClick('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs transition-all ${
              sidebarOpen
                ? 'bg-midnight-700/50 text-redhawk-400'
                : 'text-gray-300 hover:bg-midnight-700/50 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-left">History</span>
            {sidebarOpen && (
              <span className="text-[10px] text-redhawk-400/60">active</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
