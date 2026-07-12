import React from 'react';
import type { ScanResults } from '../types/target';

interface Action {
  id: string;
  icon: string;
  label: string;
  description: string;
  condition: (results: ScanResults) => boolean;
  onClick: () => void;
}

interface ActionPromptProps {
  results: ScanResults | null;
  actions: Omit<Action, 'condition' | 'onClick'>[];
  onAction: (actionId: string) => void;
}

export function ActionPrompt({ results, actions, onAction }: ActionPromptProps) {
  if (!results) return null;

  // Filter actions based on results
  const availableActions = actions.filter((a) => {
    switch (a.id) {
      case 'deep-scan':
        return results.nmap && results.nmap.ports.length > 0;
      case 'vuln-scan':
        return (
          results.nmap &&
          results.nmap.ports.some(
            (p) => p.service === 'http' || p.service === 'https' || p.service === 'ssh'
          )
        );
      case 'email-osint':
        return !results.emails || ('error' in results.emails && results.whois && !('error' in results.whois));
      case 'subdomain-enum':
        return !results.subdomains || ('error' in results.subdomains);
      case 'dns-enum':
        return !results.dns || ('error' in results.dns);
      case 'whois':
        return !results.whois || ('error' in results.whois);
      default:
        return true;
    }
  });

  // Determine which phase we're in
  const hasDns = results.dns && !('error' in results.dns);
  const hasWhois = results.whois && !('error' in results.whois);
  const hasPorts = results.nmap && results.nmap.openPortCount > 0;
  const hasEmails = results.emails && !('error' in results.emails);

  let contextMessage = 'What would you like to do next?';
  if (!hasWhois) contextMessage = 'Start with a WHOIS lookup to get domain information.';
  else if (!hasDns) contextMessage = 'Good. Now enumerate DNS records.';
  else if (!hasPorts) contextMessage = 'DNS done. Run a port scan to find open services.';
  else if (!hasEmails) contextMessage = 'Ports mapped. Try finding associated email addresses.';
  else contextMessage = 'Good reconnaissance coverage. You can drill deeper on any finding.';

  if (availableActions.length === 0) return null;

  return (
    <div className="card border-redhawk-700/30 bg-redhawk-950/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-redhawk-400 text-lg">▶</span>
        <span className="card-header mb-0 text-redhawk-400">NEXT MOVE</span>
      </div>

      <p className="text-sm text-gray-400 mb-4">{contextMessage}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {availableActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="flex items-start gap-3 p-3 rounded-lg bg-midnight-800/50 border border-midnight-700
                       hover:bg-midnight-700/50 hover:border-redhawk-700/50 transition-all duration-150
                       text-left group"
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{action.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200 group-hover:text-redhawk-400 transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
