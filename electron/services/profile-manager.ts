/**
 * RedHawk — Malleable C2 Profile Manager
 *
 * Manages C2 communication profiles that shape how beacons talk to the server.
 * Profiles are stored as JSON in userData/profiles/.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface C2ProfileHttpEndpoint {
  uri: string;
  verb: 'GET' | 'POST' | 'PUT';
  response: {
    status: number;
    headers: { name: string; value: string }[];
  };
}

export interface C2Profile {
  name: string;
  description: string;
  http: {
    jitter: number;
    sleep: number;
    userAgent: string;
    headers: { name: string; value: string }[];
    get: C2ProfileHttpEndpoint;
    post: C2ProfileHttpEndpoint;
    upload: C2ProfileHttpEndpoint;
  };
  dns?: {
    beacon: string;
    txtResponse: string;
  };
  agent: {
    killdateFormat: 'iso' | 'epoch';
    sleeptype: 'jitter' | 'exponential' | 'uniform';
  };
  metadata: {
    author: string;
    version: string;
    stage: 'stageless' | 'stager';
  };
}

// ── Built-in profiles ──

const BUILT_IN_PROFILES: C2Profile[] = [
  {
    name: 'default',
    description: 'Standard RedHawk C2 profile. Clean URIs, minimal headers, JSON everywhere.',
    http: {
      jitter: 30,
      sleep: 5,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      headers: [
        { name: 'X-RedHawk', value: 'true' },
        { name: 'Cache-Control', value: 'no-store' },
      ],
      get: {
        uri: '/c2/checkin',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
      post: {
        uri: '/c2/result',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
      upload: {
        uri: '/c2/upload',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
    },
    agent: {
      killdateFormat: 'iso',
      sleeptype: 'jitter',
    },
    metadata: {
      author: 'RedHawk',
      version: '1.0',
      stage: 'stageless',
    },
  },
  {
    name: 'cs-like',
    description: 'Mimics Cobalt Strike HTTP profile patterns. Longer URIs, cookie-based session tracking feel.',
    http: {
      jitter: 25,
      sleep: 10,
      userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
      headers: [
        { name: 'Accept', value: '*/*' },
        { name: 'Accept-Language', value: 'en-US,en;q=0.5' },
      ],
      get: {
        uri: '/jquery-3.6.0.min.js',
        verb: 'GET',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/javascript' },
            { name: 'Server', value: 'Apache/2.4.41 (Ubuntu)' },
          ],
        },
      },
      post: {
        uri: '/wp-admin/admin-ajax.php',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'text/html; charset=UTF-8' },
            { name: 'X-Powered-By', value: 'PHP/7.4.33' },
          ],
        },
      },
      upload: {
        uri: '/wp-content/uploads/',
        verb: 'POST',
        response: {
          status: 201,
          headers: [
            { name: 'Content-Type', value: 'text/html' },
          ],
        },
      },
    },
    agent: {
      killdateFormat: 'epoch',
      sleeptype: 'jitter',
    },
    metadata: {
      author: 'RedHawk',
      version: '1.0',
      stage: 'stageless',
    },
  },
  {
    name: 'minimal',
    description: 'Minimal profile. Single endpoint, no extra headers, lightweight for constrained environments.',
    http: {
      jitter: 10,
      sleep: 3,
      userAgent: 'curl/8.0',
      headers: [],
      get: {
        uri: '/api',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
      post: {
        uri: '/api',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
      upload: {
        uri: '/api',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json' },
          ],
        },
      },
    },
    agent: {
      killdateFormat: 'epoch',
      sleeptype: 'uniform',
    },
    metadata: {
      author: 'RedHawk',
      version: '1.0',
      stage: 'stageless',
    },
  },
  {
    name: 'onedrive',
    description: 'Mimics Microsoft OneDrive API traffic patterns for O365-heavy environments.',
    http: {
      jitter: 35,
      sleep: 15,
      userAgent: 'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.12026)',
      headers: [
        { name: 'Authorization', value: 'Bearer <REDACTED>' },
        { name: 'Accept', value: 'application/json;odata=verbose' },
        { name: 'User-Agent', value: 'Microsoft-Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.12026; Pro)' },
      ],
      get: {
        uri: '/v1.0/me/drive/root',
        verb: 'GET',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json;odata=verbose' },
            { name: 'X-RequestId', value: '00000000-0000-0000-0000-000000000000' },
            { name: 'client-request-id', value: '00000000-0000-0000-0000-000000000000' },
          ],
        },
      },
      post: {
        uri: '/v1.0/me/drive/root/search(q=\'{query}\')',
        verb: 'POST',
        response: {
          status: 200,
          headers: [
            { name: 'Content-Type', value: 'application/json;odata=verbose' },
            { name: 'X-RequestId', value: '00000000-0000-0000-0000-000000000000' },
          ],
        },
      },
      upload: {
        uri: '/v1.0/me/drive/root/children',
        verb: 'PUT',
        response: {
          status: 201,
          headers: [
            { name: 'Content-Type', value: 'application/json;odata=verbose' },
            { name: 'Location', value: 'https://graph.microsoft.com/v1.0/me/drive/items/' },
          ],
        },
      },
    },
    agent: {
      killdateFormat: 'iso',
      sleeptype: 'jitter',
    },
    metadata: {
      author: 'RedHawk',
      version: '1.0',
      stage: 'stageless',
    },
  },
];

export class ProfileManager {
  private profilesDir: string;
  private cache: Map<string, C2Profile> = new Map();
  private builtinNames: Set<string> = new Set();

  constructor(userDataPath: string) {
    this.profilesDir = path.join(userDataPath, 'profiles');
    this.ensureDir();
    this.loadBuiltins();
    this.loadCustom();
  }

  private ensureDir() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  private loadBuiltins() {
    for (const profile of BUILT_IN_PROFILES) {
      this.cache.set(profile.name, { ...profile });
      this.builtinNames.add(profile.name);
    }
  }

  private loadCustom() {
    if (!fs.existsSync(this.profilesDir)) return;
    const files = fs.readdirSync(this.profilesDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(this.profilesDir, file), 'utf-8');
        const profile = JSON.parse(data) as C2Profile;
        if (profile.name) {
          this.cache.set(profile.name, profile);
        }
      } catch { /* skip corrupt files */ }
    }
  }

  list(): C2Profile[] {
    return Array.from(this.cache.values());
  }

  get(name: string): C2Profile | undefined {
    return this.cache.get(name);
  }

  exists(name: string): boolean {
    return this.cache.has(name);
  }

  save(profile: C2Profile): boolean {
    if (!profile.name) return false;

    // Validate required fields
    if (!profile.http?.get?.uri || !profile.http?.post?.uri) return false;

    // Save to cache
    this.cache.set(profile.name, { ...profile });

    // Don't overwrite built-in files, but store custom overrides
    if (this.builtinNames.has(profile.name)) {
      return true; // Built-in is always available in memory
    }

    // Write custom profile to disk
    const filePath = path.join(this.profilesDir, `${profile.name}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  delete(name: string): boolean {
    if (this.builtinNames.has(name)) return false; // Can't delete built-in
    this.cache.delete(name);
    const filePath = path.join(this.profilesDir, `${name}.json`);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** Resolve profile to concrete settings — merges with overrides */
  resolve(profileName: string, overrides?: Partial<C2Profile>): C2Profile {
    const base = this.get(profileName) || this.get('default')!;
    if (!overrides) return { ...base };
    return deepMerge({ ...base }, overrides);
  }
}

function deepMerge(target: any, source: any): any {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
