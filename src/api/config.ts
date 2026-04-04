function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;

    if (hostname === 'api.xonaris.space') {
      return origin;
    }

    if (hostname === 'xonaris.space' || hostname.endsWith('.xonaris.space')) {
      return 'https://api.xonaris.space';
    }
  }

  // Dev fallback: Vite proxy rewrites /api -> localhost:3000
  return '/api';
}

/**
 * Base URL for API calls.
 * Priority:
 * 1. Explicit Vite env var
 * 2. Runtime fallback for xonaris.space production
 * 3. Local Vite proxy in development
 */
export const API_URL = resolveApiUrl();

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}
