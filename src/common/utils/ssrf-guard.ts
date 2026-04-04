import { URL } from 'url';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve4);

const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
];

const BLOCKED_IP_PREFIXES = [
  '127.',       // Loopback
  '10.',        // RFC 1918
  '172.16.',    // RFC 1918
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',   // RFC 1918
  '169.254.',   // Link-local / AWS metadata
  'fd',         // IPv6 ULA
  'fe80:',      // IPv6 link-local
  '::1',        // IPv6 loopback
  '0.',         // This network
  '100.64.',    // RFC 6598 CGNAT
  '100.65.', '100.66.', '100.67.', '100.68.', '100.69.', '100.70.', '100.71.',
  '100.72.', '100.73.', '100.74.', '100.75.', '100.76.', '100.77.', '100.78.', '100.79.',
  '100.80.', '100.81.', '100.82.', '100.83.', '100.84.', '100.85.', '100.86.', '100.87.',
  '100.88.', '100.89.', '100.90.', '100.91.', '100.92.', '100.93.', '100.94.', '100.95.',
  '100.96.', '100.97.', '100.98.', '100.99.', '100.100.', '100.101.', '100.102.', '100.103.',
  '100.104.', '100.105.', '100.106.', '100.107.', '100.108.', '100.109.', '100.110.', '100.111.',
  '100.112.', '100.113.', '100.114.', '100.115.', '100.116.', '100.117.', '100.118.', '100.119.',
  '100.120.', '100.121.', '100.122.', '100.123.', '100.124.', '100.125.', '100.126.', '100.127.',
  '198.18.', '198.19.',  // RFC 2544 benchmarking
  '240.',       // RFC 1112 reserved
  '255.',       // Broadcast
  'fc00:',      // IPv6 ULA (full range)
  '::ffff:127.',  // IPv4-mapped IPv6 loopback
  '::ffff:10.',   // IPv4-mapped IPv6 private
  '::ffff:192.168.', // IPv4-mapped IPv6 private
];

function isBlockedIp(ip: string): boolean {
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  return false;
}

// ── Hostname validation cache (TTL = 5 min) ──────────────────────────────────
// Avoids redundant DNS lookups for every HLS segment on the same host.
const hostCache = new Map<string, { safe: boolean; ts: number }>();
const HOST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedHost(hostname: string): boolean | undefined {
  const entry = hostCache.get(hostname);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > HOST_CACHE_TTL) {
    hostCache.delete(hostname);
    return undefined;
  }
  return entry.safe;
}

function setCachedHost(hostname: string, safe: boolean): void {
  // Cap cache size to prevent unbounded growth
  if (hostCache.size > 2000) {
    const oldest = hostCache.keys().next().value;
    if (oldest) hostCache.delete(oldest);
  }
  hostCache.set(hostname, { safe, ts: Date.now() });
}

/**
 * Validate that a URL is safe to fetch (not pointing to internal networks).
 * Performs DNS resolution to prevent DNS rebinding attacks.
 * Results are cached per hostname for 5 minutes to avoid latency on HLS segments.
 * Throws an error if the URL is blocked.
 */
export async function validateExternalUrl(targetUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new Error('URL invalide');
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Protocole non autorisé: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error('URL interne bloquée');
  }

  // Check if hostname is an IP address and block private ranges
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error('URL pointant vers un réseau privé bloquée');
    }
    return; // IP is safe
  }

  // ── Cache check ────────────────────────────────────────────────
  const cached = getCachedHost(hostname);
  if (cached === true) return;           // known safe
  if (cached === false) throw new Error('URL résolvant vers un réseau privé bloquée (cached)');

  // ── DNS resolution (first time or cache expired) ──────────────
  try {
    const addresses = await dnsResolve(hostname);
    for (const addr of addresses) {
      if (isBlockedIp(addr)) {
        setCachedHost(hostname, false);
        throw new Error('URL résolvant vers un réseau privé bloquée');
      }
    }
    setCachedHost(hostname, true);
  } catch (err: any) {
    if (err.message?.includes('bloquée')) throw err;
    // DNS resolution failure — block to prevent SSRF via DNS rebinding
    setCachedHost(hostname, false);
    throw new Error('Résolution DNS échouée — requête bloquée par sécurité');
  }
}

/**
 * Check if a full URL is on the same host as a reference URL.
 * Used by the stream proxy to skip full SSRF re-validation
 * when the reference host was already validated.
 */
export function isSameHost(url: string, referenceUrl: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(referenceUrl);
    return a.hostname.toLowerCase() === b.hostname.toLowerCase();
  } catch {
    return false;
  }
}
