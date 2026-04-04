import { API_URL } from '../../api/client';

/**
 * Returns a safe, HTTPS-reachable URL for a channel logo.
 *
 * Problem: some logo_url values are stored as `http://<IP>/picons/...`.
 * Browsers block mixed-content images when the host is a bare IP address
 * because they cannot be automatically upgraded to HTTPS.
 *
 * Solution: route such URLs through the backend picon proxy which fetches
 * the image server-side and re-serves it over HTTPS.
 *
 * HTTPS URLs and null values are returned unchanged.
 */
export function safeLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith('http://')) return url;

  // base64url-encode the original URL
  const b64 = btoa(url)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${API_URL}/stream/picon?url=${b64}`;
}
