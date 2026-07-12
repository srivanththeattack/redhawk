import React from 'react';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: string;
}

interface DnsCardProps {
  data: { records?: DnsRecord[] } | { error: string } | undefined;
}

const TYPE_COLORS: Record<string, string> = {
  A: 'bg-blue-900/50 text-blue-400 border-blue-700',
  AAAA: 'bg-purple-900/50 text-purple-400 border-purple-700',
  MX: 'bg-green-900/50 text-green-400 border-green-700',
  CNAME: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  NS: 'bg-indigo-900/50 text-indigo-400 border-indigo-700',
  TXT: 'bg-pink-900/50 text-pink-400 border-pink-700',
  SOA: 'bg-orange-900/50 text-orange-400 border-orange-700',
};

export function DnsCard({ data }: DnsCardProps) {
  if (!data) return null;

  if ('error' in data) {
    return (
      <div className="card">
        <div className="card-header">DNS Records</div>
        <p className="text-gray-500 text-sm">{data.error}</p>
      </div>
    );
  }

  const records = data.records || [];

  if (records.length === 0) {
    return (
      <div className="card">
        <div className="card-header">DNS Records</div>
        <p className="text-gray-500 text-sm">No DNS records found</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>DNS Records</span>
        <span className="text-xs text-gray-500 font-normal">{records.length} records</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {records.map((record, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2 rounded bg-midnight-800/50">
            <span
              className={`badge border text-xs font-mono flex-shrink-0 ${
                TYPE_COLORS[record.type] || 'bg-gray-900/50 text-gray-400 border-gray-700'
              }`}
            >
              {record.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-gray-300 text-sm font-mono truncate">{record.value}</p>
              {record.name && (
                <p className="text-gray-500 text-xs truncate">{record.name}</p>
              )}
            </div>
            {record.ttl && (
              <span className="text-gray-600 text-xs font-mono flex-shrink-0">
                TTL {record.ttl}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
