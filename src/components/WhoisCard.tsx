import React from 'react';

interface WhoisInfo {
  domain?: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
  orgName?: string;
  country?: string;
  emails?: string[];
}

interface WhoisCardProps {
  data: WhoisInfo | { error: string } | undefined;
}

export function WhoisCard({ data }: WhoisCardProps) {
  if (!data) return null;

  if ('error' in data) {
    return (
      <div className="card">
        <div className="card-header">WHOIS Lookup</div>
        <p className="text-gray-500 text-sm">{data.error}</p>
      </div>
    );
  }

  const fields: { label: string; value: string | undefined; mono?: boolean }[] = [
    { label: 'Domain', value: data.domain },
    { label: 'Registrar', value: data.registrar },
    { label: 'Organization', value: data.orgName },
    { label: 'Country', value: data.country },
    { label: 'Created', value: data.creationDate },
    { label: 'Expires', value: data.expirationDate },
  ];

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>WHOIS Lookup</span>
        {data.domain && (
          <span className="text-xs text-gray-500 font-normal font-mono">{data.domain}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {fields
          .filter((f) => f.value)
          .map((field) => (
            <div key={field.label} className="flex justify-between items-center py-1 border-b border-midnight-800 last:border-0">
              <span className="text-gray-400 text-xs">{field.label}</span>
              <span className={`text-gray-200 text-sm text-right ${field.mono ? 'font-mono' : ''}`}>
                {field.value}
              </span>
            </div>
          ))}

        {data.nameServers && data.nameServers.length > 0 && (
          <div className="pt-2">
            <span className="text-gray-400 text-xs block mb-1">Name Servers</span>
            <div className="flex flex-wrap gap-1">
              {data.nameServers.map((ns, i) => (
                <span key={i} className="badge bg-midnight-800 text-gray-300 border border-midnight-600 text-xs font-mono">
                  {ns}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.emails && data.emails.length > 0 && (
          <div className="pt-2">
            <span className="text-gray-400 text-xs block mb-1">Contact Emails</span>
            <div className="space-y-1">
              {data.emails.map((email, i) => (
                <div key={i} className="text-sm text-gray-300 font-mono bg-midnight-800/50 rounded px-2 py-1">
                  {email}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
