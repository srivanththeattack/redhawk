import React, { useState, useCallback } from 'react';

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
• Agents call back at configurable intervals

Use responsibly — only on authorized targets.`,
  },
  {
    title: '📤 Data Exfiltration',
    content: `Collect, package, and exfiltrate data:
• Create exfiltration jobs targeting directories
• Collect browser data (cookies, saved passwords from Chrome/FF)
• Take screenshots
• Package with optional compression (zip/gzip) and encryption (AES-256)
• Exfiltrate via HTTP POST or SMB
• Encryption key auto-generated, copy it for decryption`,
  },
  {
    title: '❓ Troubleshooting',
    content: `• Dependencies not found? Click "Install Deps" in the header
• Scans not running? Ensure nmap/python3 are in PATH
• MSF not connecting? Verify msfrpcd is running and port/password are correct
• Evilginx not found? Download from https://github.com/kgretzky/evilginx2/releases
• C2 agents not connecting? Check firewall rules and agent heartbeat interval
• App stuck? Restart the application
• Report issues: https://github.com/srivanththeattack/redhawk/issues`,
  },
];

export function HelpBanner() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
    setSearchQuery('');
  }, []);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
  }, []);

  const filtered = searchQuery.trim()
    ? HELP_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : HELP_SECTIONS;

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title="Help & documentation"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
          text-gray-400 hover:text-white hover:bg-midnight-700/50
          transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden sm:inline">Help</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-midnight-700/50 flex-shrink-0">
            <span className="text-sm font-medium text-white">Help</span>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-midnight-700/50">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-midnight-900 border border-midnight-600/50 rounded-lg
                  text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="px-4 py-3 space-y-4">
              {filtered.map((section, i) => (
                <div key={i}>
                  <h4 className="text-xs font-semibold text-gray-200 mb-1.5">{section.title}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No results for "{searchQuery}"</p>
              )}
            </div>
          </div>

          <div className="px-4 py-2 bg-midnight-900/50 border-t border-midnight-700/50 flex-shrink-0">
            <p className="text-[10px] text-gray-600 text-center">
              Report bugs on{' '}
              <a
                href="https://github.com/srivanththeattack/redhawk/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400"
              >
                GitHub Issues
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
