/**
 * RedHawk — Platform Abstraction Layer (Windows / macOS / Linux)
 *
 * Single source of truth for OS-specific behavior across the entire app.
 * Every service imports from here instead of hardcoding OS-specific commands.
 */

import * as os from 'os';

// ── Platform Detection ──

export type RedHawkPlatform = 'win32' | 'darwin' | 'linux';

export function currentPlatform(): RedHawkPlatform {
  return process.platform as RedHawkPlatform;
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isMac(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function isUnix(): boolean {
  return !isWindows();
}

// ── Executable Names ──

export function getPythonCommand(): string {
  return isWindows() ? 'python' : 'python3';
}

export function getSystemShell(): string {
  if (isWindows()) return process.env.COMSPEC || 'cmd.exe';
  return '/bin/bash';
}

export function getShellArgs(): string[] {
  return isWindows() ? ['/c'] : ['-c'];
}

export function getWhichCommand(): string {
  return isWindows() ? 'where' : 'which';
}

export function getHomeDir(): string {
  return isWindows()
    ? (process.env.USERPROFILE || 'C:\\')
    : (process.env.HOME || '/tmp');
}

// ── Terminal ──

export function getDefaultTerminalShell(): string {
  if (isWindows()) return 'wsl.exe';
  return process.env.SHELL || '/bin/bash';
}

export function getTerminalShellArgs(): string[] {
  return isWindows() ? [] : ['-i'];
}

export function getTerminalEnvVars(): Record<string, string> {
  const base = { ...process.env, TERM: 'xterm-256color' } as Record<string, string>;
  if (isWindows()) base.CWD = process.env.USERPROFILE || 'C:\\';
  return base;
}

export function getTerminalCwd(): string {
  return isWindows()
    ? (process.env.USERPROFILE || 'C:\\')
    : (process.env.HOME || '/tmp');
}

// ── Package Managers ──

export type PackageManager = 'winget' | 'choco' | 'brew' | 'apt' | 'dnf' | 'pacman' | 'zypper' | 'none';

export function getPackageManager(): PackageManager {
  if (isWindows()) {
    try {
      require('child_process').execSync('winget --version', { stdio: 'ignore' });
      return 'winget';
    } catch {
      try {
        require('child_process').execSync('choco --version', { stdio: 'ignore' });
        return 'choco';
      } catch {
        return 'none';
      }
    }
  }
  if (isMac()) {
    try {
      require('child_process').execSync('brew --version', { stdio: 'ignore' });
      return 'brew';
    } catch {
      return 'none';
    }
  }
  // Linux
  try { require('child_process').execSync('apt --version 2>/dev/null', { stdio: 'ignore' }); return 'apt'; }
  catch {
    try { require('child_process').execSync('dnf --version 2>/dev/null', { stdio: 'ignore' }); return 'dnf'; }
    catch {
      try { require('child_process').execSync('pacman --version 2>/dev/null', { stdio: 'ignore' }); return 'pacman'; }
      catch {
        try { require('child_process').execSync('zypper --version 2>/dev/null', { stdio: 'ignore' }); return 'zypper'; }
        catch { return 'none'; }
      }
    }
  }
}

export function getPackageInstallCommand(pkg: string): string[] {
  switch (getPackageManager()) {
    case 'apt':   return ['sudo', 'apt', 'install', '-y', pkg];
    case 'dnf':   return ['sudo', 'dnf', 'install', '-y', pkg];
    case 'pacman': return ['sudo', 'pacman', '-S', '--noconfirm', pkg];
    case 'zypper': return ['sudo', 'zypper', 'install', '-y', pkg];
    case 'brew':  return ['brew', 'install', pkg];
    default:      return [];
  }
}

// ── Screenshot ──

export function getScreenshotCommand(): string {
  if (isWindows()) return 'powershell';
  if (isMac()) return '/usr/sbin/screencapture';
  // Linux: try scrot, then import (ImageMagick), then gnome-screenshot
  for (const cmd of ['scrot', 'import', 'gnome-screenshot']) {
    try {
      require('child_process').execSync(`which ${cmd} 2>/dev/null`, { stdio: 'ignore' });
      return cmd;
    } catch { continue; }
  }
  return 'scrot'; // default fallback
}

export function getScreenshotArgs(outputPath: string): string[] {
  if (isWindows()) {
    return [
      '-ExecutionPolicy', 'Bypass', '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; ` +
      `$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; ` +
      `$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height; ` +
      `$graphics = [System.Drawing.Graphics]::FromImage($bitmap); ` +
      `$graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $screen.Size); ` +
      `$bitmap.Save('${outputPath.replace(/'/g, "''")}'); ` +
      `$graphics.Dispose(); $bitmap.Dispose()`,
    ];
  }
  if (isMac()) return ['-x', '-T', '0', outputPath];
  // Linux: depends on which tool is available
  const cmd = getScreenshotCommand();
  switch (cmd) {
    case 'scrot':          return ['-z', outputPath];
    case 'import':         return ['-window', 'root', outputPath];
    case 'gnome-screenshot': return ['-f', outputPath];
    default:               return [outputPath];
  }
}

// ── Browser Data Paths ──

export interface BrowserPaths {
  chrome: string;
  edge: string | null;
  firefox: string;
  brave?: string;
  chromium?: string;
}

export function getBrowserDataPaths(): BrowserPaths {
  if (isWindows()) {
    const la = process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local';
    const aa = process.env.APPDATA || 'C:\\Users\\Default\\AppData\\Roaming';
    return {
      chrome: `${la}\\Google\\Chrome\\User Data`,
      edge: `${la}\\Microsoft\\Edge\\User Data`,
      firefox: `${aa}\\Mozilla\\Firefox\\Profiles`,
    };
  }
  const home = process.env.HOME || '/tmp';
  if (isMac()) {
    return {
      chrome: `${home}/Library/Application Support/Google/Chrome`,
      edge: null,
      firefox: `${home}/Library/Application Support/Firefox/Profiles`,
      brave: `${home}/Library/Application Support/BraveSoftware/Brave-Browser`,
    };
  }
  // Linux
  return {
    chrome: `${home}/.config/google-chrome`,
    edge: `${home}/.config/microsoft-edge`,
    firefox: `${home}/.mozilla/firefox`,
    brave: `${home}/.config/BraveSoftware/Brave-Browser`,
    chromium: `${home}/.config/chromium`,
  };
}

// ── Nmap Paths ──

export function getNmapSearchPaths(): string[] {
  if (isWindows()) {
    return [
      'nmap',
      'C:\\Program Files (x86)\\Nmap\\nmap.exe',
      'C:\\Program Files\\Nmap\\nmap.exe',
      `${process.env.LOCALAPPDATA || ''}\\Programs\\Nmap\\nmap.exe`,
    ];
  }
  return [
    'nmap',
    '/usr/bin/nmap',
    '/usr/local/bin/nmap',
    '/opt/homebrew/bin/nmap',
  ];
}

// ── Metasploit Paths ──

export function getMetasploitSearchPaths(): { path: string; label: string }[] {
  if (isWindows()) {
    return [
      { p: 'C:\\metasploit\\MSP\\msfrpcd.exe', label: 'C:\\metasploit' },
      { p: `${process.env.ProgramFiles}\\Metasploit\\MSP\\msfrpcd.exe`, label: 'Program Files' },
      { p: `${process.env.LOCALAPPDATA}\\Metasploit\\msfrpcd.exe`, label: 'LocalAppData' },
    ];
  }
  return [
    { p: '/usr/bin/msfrpcd', label: '/usr/bin' },
    { p: '/usr/local/bin/msfrpcd', label: '/usr/local/bin' },
    { p: '/opt/metasploit/bin/msfrpcd', label: 'Opt Metasploit' },
    { p: `${process.env.HOME}/.local/bin/msfrpcd`, label: 'User local' },
  ];
}

// ── Evilginx2 Paths ──

export function getEvilginxSearchPaths(): string[] {
  if (isWindows()) {
    return [
      `${process.env.LOCALAPPDATA}\\RedHawk\\tools\\evilginx2.exe`,
      `${process.env.USERPROFILE}\\.evilginx\\`,
      `${process.env.ProgramFiles}\\evilginx2\\evilginx2.exe`,
      `${process.env.LOCALAPPDATA}\\Programs\\evilginx2\\evilginx2.exe`,
      'C:\\cybersec stuff\\evilginx2\\evilginx2.exe',
      'C:\\tools\\evilginx2\\evilginx2.exe',
    ];
  }
  return [
    '/usr/local/bin/evilginx2',
    '/opt/homebrew/bin/evilginx2',
    `${process.env.HOME}/.local/bin/evilginx2`,
    `${process.env.HOME}/go/bin/evilginx2`,
    '/usr/bin/evilginx2',
  ];
}

// ── OS Info ──

export interface OsInfo {
  os: string;
  release: string;
  arch: string;
  hostname: string;
  user: string;
}

export function getOsInfo(): OsInfo {
  return {
    os: `${os.type()} ${os.release()}`,
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    user: os.userInfo().username,
  };
}

// ── File Transfer ──

export function getFileTransferCommand(
  destinationType: 'ftp' | 'smb' | 'sftp',
  _sourcePath: string,
  destUrl: string,
): { command: string; args: string[] } | null {
  if (destinationType === 'ftp') {
    if (isWindows()) {
      return { command: 'ftp', args: ['-s:' + _sourcePath + '.ftp'] };
    }
    return { command: 'curl', args: ['-T', _sourcePath, destUrl] };
  }
  if (destinationType === 'smb') {
    if (isWindows()) {
      return { command: 'net', args: ['use', destUrl.replace(/^smb:\/\//, '\\\\').replace(/\//g, '\\')] };
    }
    return { command: 'smbclient', args: [destUrl.replace(/^smb:\/\//, '//'), '-c', `put ${_sourcePath}`] };
  }
  if (destinationType === 'sftp') {
    return { command: 'scp', args: [_sourcePath, destUrl] };
  }
  return null;
}

// ── Display ──

/**
 * Returns a summary object describing the current platform
 */
export function getPlatform(): { platform: string; arch: string; isWindows: boolean; isMac: boolean; isLinux: boolean } {
  return {
    platform: process.platform,
    arch: process.arch,
    isWindows: isWindows(),
    isMac: isMac(),
    isLinux: isLinux(),
  };
}

export function getPlatformDisplayName(): string {
  if (isWindows()) return 'Windows';
  if (isMac()) return 'macOS';
  return 'Linux';
}

export function getPlatformIcon(): string {
  if (isWindows()) return '⊞';
  if (isMac()) return '🍎';
  return '🐧';
}
