import { Parser } from 'xml2js';

export interface NmapResult {
  scanInfo: {
    args: string;
    startTime: string;
    scanner: string;
    version: string;
  };
  host: {
    ip: string;
    hostname: string | null;
    status: string;
    os: string | null;
    osAccuracy: number | null;
  };
  ports: NmapPort[];
  portCount: number;
  openPortCount: number;
  summary: string;
}

export interface NmapPort {
  portid: string;
  protocol: string;
  state: string;
  service: string;
  product: string | null;
  version: string | null;
  cpe: string | null;
}

export class NmapParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
    });
  }

  async parse(xmlData: string): Promise<NmapResult> {
    try {
      const result = await this.parser.parseStringPromise(xmlData);
      const nmaprun = result.nmaprun;

      // Scan info
      const scanInfo = {
        args: nmaprun.args || '',
        startTime: nmaprun.start || '',
        scanner: nmaprun.scanner || '',
        version: nmaprun.version || '',
      };

      // Default host info
      let host: NmapResult['host'] = {
        ip: '',
        hostname: null,
        status: 'unknown',
        os: null,
        osAccuracy: null,
      };

      const ports: NmapPort[] = [];

      if (nmaprun.host) {
        const hostData = Array.isArray(nmaprun.host) ? nmaprun.host[0] : nmaprun.host;

        // IP address
        if (hostData.address) {
          const addrs = Array.isArray(hostData.address)
            ? hostData.address
            : [hostData.address];
          const ipv4 = addrs.find((a: any) => a.addrtype === 'ipv4');
          if (ipv4) host.ip = ipv4.addr;
          else if (addrs.length > 0) host.ip = addrs[0].addr;
        }

        // Hostname
        if (hostData.hostnames?.hostname) {
          const hnames = Array.isArray(hostData.hostnames.hostname)
            ? hostData.hostnames.hostname
            : [hostData.hostnames.hostname];
          if (hnames.length > 0) host.hostname = hnames[0].name || null;
        }

        // Status
        if (hostData.status) {
          host.status = hostData.status.state || 'unknown';
        }

        // OS detection
        if (hostData.os?.osmatch) {
          const osMatches = Array.isArray(hostData.os.osmatch)
            ? hostData.os.osmatch
            : [hostData.os.osmatch];
          if (osMatches.length > 0) {
            host.os = osMatches[0].name || null;
            host.osAccuracy = osMatches[0].accuracy
              ? parseInt(osMatches[0].accuracy)
              : null;
          }
        }

        // Ports
        if (hostData.ports?.port) {
          const portList = Array.isArray(hostData.ports.port)
            ? hostData.ports.port
            : [hostData.ports.port];

          for (const p of portList) {
            const port: NmapPort = {
              portid: p.portid || '0',
              protocol: p.protocol || 'tcp',
              state: p.state?.state || 'unknown',
              service: p.service?.name || 'unknown',
              product: p.service?.product || null,
              version: p.service?.version
                ? `${p.service.product || ''} ${p.service.version}`.trim()
                : null,
              cpe: null,
            };

            if (p.service?.cpe) {
              port.cpe = Array.isArray(p.service.cpe)
                ? p.service.cpe[0]
                : p.service.cpe;
            }

            ports.push(port);
          }
        }
      }

      // Sort ports by number
      ports.sort((a, b) => parseInt(a.portid) - parseInt(b.portid));

      const openPortCount = ports.filter((p) => p.state === 'open').length;

      return {
        scanInfo,
        host,
        ports,
        portCount: ports.length,
        openPortCount,
        summary: `${ports.length} ports found, ${openPortCount} open. Target: ${host.ip} (${host.status})`,
      };
    } catch (err: any) {
      throw new Error(`Failed to parse nmap XML: ${err.message}`);
    }
  }
}
