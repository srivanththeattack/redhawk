/**
 * RedHawk — Metasploit RPC Client
 *
 * Connects to msfrpcd (Metasploit RPC daemon) for exploit management,
 * payload generation, and session control.
 *
 * Start msfrpcd:
 *   msfrpcd -P password -S -f
 *   (Windows: "C:\metasploit\MSP\msfrpcd.exe" -P password -S -f)
 *
 * Default: localhost:55553, password "redhawk"
 */

import * as net from 'net';
import { EventEmitter } from 'events';

interface MsfRpcAuth {
  token: string;
  error?: string;
}

interface Exploit {
  name: string;
  fullname: string;
  rank: string;
  description: string;
  disclosure?: string;
  targets?: string[];
}

interface Payload {
  name: string;
  description: string;
  platform: string;
  arch: string;
}

interface Session {
  id: number;
  type: string;
  target_host: string;
  info: string;
  via_exploit: string;
  via_payload: string;
  tunnel_local: string;
  tunnel_peer: string;
  username?: string;
}

export class MsfRpcClient extends EventEmitter {
  private host: string;
  private port: number;
  private password: string;
  private token: string | null = null;
  private connected = false;
  private requestId = 0;
  private client: net.Socket | null = null;
  private buffer = '';
  private pendingRequests: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> = new Map();

  constructor(host = '127.0.0.1', port = 55553, password = 'redhawk') {
    super();
    this.host = host;
    this.port = port;
    this.password = password;
  }

  /**
   * Connect to msfrpcd and authenticate
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client = new net.Socket();

      this.client.connect(this.port, this.host, () => {
        this.connected = true;
        this.emit('connected');
        // Authenticate immediately
        this.authenticate().then((auth) => {
          if (auth.token) {
            this.token = auth.token;
            this.emit('authenticated');
            resolve(true);
          } else {
            reject(new Error(auth.error || 'Authentication failed'));
          }
        }).catch(reject);
      });

      this.client.on('data', (data: Buffer) => {
        this.buffer += data.toString();

        // Process complete JSON-RPC responses
        let depth = 0;
        let startIdx = 0;
        for (let i = 0; i < this.buffer.length; i++) {
          if (this.buffer[i] === '{') {
            if (depth === 0) startIdx = i;
            depth++;
          } else if (this.buffer[i] === '}') {
            depth--;
            if (depth === 0 && startIdx >= 0) {
              const response = this.buffer.slice(startIdx, i + 1);
              this.buffer = this.buffer.slice(i + 1);
              this.handleResponse(response);
              startIdx = -1;
              i = -1; // restart scan
            }
          }
        }
      });

      this.client.on('error', (err) => {
        this.connected = false;
        this.emit('error', err);
        reject(err);
      });

      this.client.on('close', () => {
        this.connected = false;
        this.token = null;
        this.emit('disconnected');
      });

      // Timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  disconnect() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.connected = false;
    this.token = null;
  }

  isConnected(): boolean {
    return this.connected && this.token !== null;
  }

  /**
   * Make a JSON-RPC call
   */
  private async call(method: string, ...params: any[]): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to msfrpcd');
    }

    const id = ++this.requestId;
    const request = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params: [this.token, ...params],
      id,
    }) + '\n';

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.client!.write(request);

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('RPC call timeout'));
        }
      }, 30000);
    });
  }

  private handleResponse(data: string) {
    try {
      const response = JSON.parse(data);
      const id = response.id;

      if (id && this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);

        if (response.error) {
          reject(new Error(response.error.message || response.error));
        } else {
          resolve(response.result);
        }
      }
    } catch (err) {
      this.emit('parseError', data);
    }
  }

  private async authenticate(): Promise<MsfRpcAuth> {
    // Raw auth without token
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'auth.login',
        params: [this.password],
        id,
      }) + '\n';

      this.pendingRequests.set(id, {
        resolve: (result) => resolve(result),
        reject: (err) => resolve({ token: '', error: err.message }),
      });

      this.client!.write(request);

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({ token: '', error: 'Auth timeout' });
        }
      }, 10000);
    });
  }

  // ── Metasploit API Methods ──

  async getVersion(): Promise<string> {
    const result = await this.call('core.version');
    return result.version || 'unknown';
  }

  async searchExploits(query: string): Promise<Exploit[]> {
    const result = await this.call('module.search', query);
    return (result || []).map((m: any) => ({
      name: m.name || '',
      fullname: m.fullname || '',
      rank: m.rank || 'normal',
      description: (m.description || '').slice(0, 200),
      disclosure: m.disclosure_date || '',
    }));
  }

  async getExploitInfo(name: string): Promise<any> {
    const result = await this.call('module.info', 'exploit', name);
    return result;
  }

  async getPayloads(exploit: string): Promise<Payload[]> {
    const result = await this.call('module.compatible_payloads', exploit);
    return (result || []).map((p: any) => ({
      name: p.name || '',
      description: p.description || '',
      platform: (p.name || '').split('/')[0] || '',
      arch: '',
    }));
  }

  async generatePayload(payload: string, lhost: string, lport: number, format = 'exe'): Promise<string> {
    const result = await this.call('module.execute', 'payload', payload, {
      LHOST: lhost,
      LPORT: lport,
      Format: format,
    });
    return result?.payload || '';
  }

  async executeExploit(exploit: string, payload: string, rhost: string, rport: number, options: Record<string, any> = {}): Promise<any> {
    const opts: Record<string, any> = {
      RHOSTS: rhost,
      RPORT: rport,
      PAYLOAD: payload,
      ...options,
    };
    const result = await this.call('module.execute', 'exploit', exploit, opts);
    return result;
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.call('session.list');
    if (!result) return [];
    return Object.entries(result).map(([id, s]: [string, any]) => ({
      id: parseInt(id),
      type: s.type || 'unknown',
      target_host: s.target_host || s.session_host || '',
      info: s.info || s.desc || '',
      via_exploit: s.via_exploit || '',
      via_payload: s.via_payload || '',
      tunnel_local: s.tunnel_local || s.local_host || '',
      tunnel_peer: s.tunnel_peer || s.session_peer || '',
    }));
  }

  async writeSession(sessionId: number, data: string): Promise<boolean> {
    const result = await this.call('session.shell_write', sessionId, data);
    return result?.result === 'success';
  }

  async readSession(sessionId: number): Promise<string> {
    const result = await this.call('session.shell_read', sessionId);
    return result?.data || result?.output || '';
  }

  async stopSession(sessionId: number): Promise<boolean> {
    const result = await this.call('session.stop', sessionId);
    return result?.result === 'success';
  }

  async createResourceScript(commands: string[]): Promise<string> {
    return commands.join('\n');
  }

  /**
   * Run a quick vulnerability assessment: search for relevant exploits
   * based on services found during recon
   */
  async quickVulnScan(services: { port: number; service: string; product?: string }[]): Promise<any[]> {
    const results: any[] = [];

    for (const svc of services) {
      const searchTerms = [svc.service, svc.product].filter(Boolean).join(' ');
      if (!searchTerms) continue;

      try {
        const exploits = await this.searchExploits(searchTerms);
        results.push({
          service: `${svc.service}:${svc.port}`,
          product: svc.product || '',
          exploits: exploits.slice(0, 10),
        });
      } catch {
        // Skip failed lookups
      }
    }

    return results;
  }
}
