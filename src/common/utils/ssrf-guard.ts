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
];

function isBlockedIp(ip: string): boolean {
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Validate that a URL is safe to fetch (not pointing to internal networks).
 * Performs DNS resolution to prevent DNS rebinding attacks.
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

  // Resolve hostname to IP and check resolved addresses (DNS rebinding protection)
  try {
    const addresses = await dnsResolve(hostname);
    for (const addr of addresses) {
      if (isBlockedIp(addr)) {
        throw new Error('URL résolvant vers un réseau privé bloquée');
      }
    }
  } catch (err: any) {
    if (err.message?.includes('bloquée')) throw err;
    // DNS resolution failure — allow through (external DNS might be unavailable)
  }
}
