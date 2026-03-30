import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  isEncryptionEnabled,
  generateNonce,
  encryptRequestBody,
  encryptKeyForHeaders,
  decryptResponse,
  cleanupPendingKey,
  resetRsaKey,
} from './encryption';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Shared refresh-token lock ──────────────────
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post('/api/auth/refresh', {}, { withCredentials: true })
    .then(() => {
      refreshPromise = null;
      return true;
    })
    .catch(() => {
      refreshPromise = null;
      return false;
    });

  return refreshPromise;
}

/* ── Encryption request interceptor ──────────── */
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (!isEncryptionEnabled()) return config;

  const nonce = generateNonce();
  const timestamp = Date.now().toString();

  config.headers.set('X-Encrypted', 'true');
  config.headers.set('X-Nonce', nonce);
  config.headers.set('X-Timestamp', timestamp);

  // Store nonce on the config for the response interceptor
  (config as any)._nonce = nonce;

  const hasBody =
    config.data !== undefined &&
    config.data !== null &&
    typeof config.data === 'object';

  if (hasBody) {
    // POST / PUT / PATCH — encrypt body as { data, key, iv }
    try {
      const payload = await encryptRequestBody(
        JSON.stringify(config.data),
        nonce,
      );
      config.data = payload;
    } catch {
      // First attempt failed (stale RSA key?) — retry once
      resetRsaKey();
      try {
        const payload = await encryptRequestBody(
          JSON.stringify(config.data),
          nonce,
        );
        config.data = payload;
      } catch (err) {
        // Encryption failed — reject the request instead of sending plaintext
        cleanupPendingKey(nonce);
        return Promise.reject(new Error('Encryption failed — request blocked for security'));
      }
    }
  } else {
    // GET / DELETE — send encrypted AES key in header
    try {
      const encKey = await encryptKeyForHeaders(nonce);
      config.headers.set('X-Encryption-Key', encKey);
    } catch {
      resetRsaKey();
      try {
        const encKey = await encryptKeyForHeaders(nonce);
        config.headers.set('X-Encryption-Key', encKey);
      } catch (err) {
        cleanupPendingKey(nonce);
        return Promise.reject(new Error('Encryption failed — request blocked for security'));
      }
    }
  }

  return config;
});

/* ── Response interceptor: decrypt + auto-refresh + error redirects ── */
api.interceptors.response.use(
  async (res) => {
    const nonce = (res.config as any)?._nonce as string | undefined;

    // Decrypt encrypted response
    if (
      nonce &&
      res.data?.data &&
      res.data?.iv &&
      typeof res.data.data === 'string' &&
      typeof res.data.iv === 'string'
    ) {
      try {
        res.data = JSON.parse(await decryptResponse(nonce, res.data));
      } catch {
        cleanupPendingKey(nonce!);
      }
    } else if (nonce) {
      cleanupPendingKey(nonce);
    }

    return res;
  },
  async (err) => {
    // Clean up pending encryption key
    const nonce = (err.config as any)?._nonce as string | undefined;
    if (nonce) cleanupPendingKey(nonce);

    const status = err.response?.status;
    const path = window.location.pathname;
    const originalConfig = err.config;

    // ── 401: attempt silent token refresh ──
    if (status === 401 && !(originalConfig as any)?._retried) {
      (originalConfig as any)._retried = true;
      const refreshed = await tryRefreshTokens();
      if (refreshed) {
        // Retry original request with fresh tokens
        return api(originalConfig);
      }
      // Refresh failed → redirect to login
      const publicPaths = ['/', '/login', '/register', '/maintenance', '/banned', '/error'];
      if (!publicPaths.some((p) => path === p || (p !== '/' && path.startsWith(p)))) {
        window.location.href = '/login';
      }
    }

    // ── 403 banned ──
    if (status === 403 && err.response?.data?.message === 'Compte banni') {
      if (path !== '/banned') {
        try {
          sessionStorage.setItem('xonaris_ban_reason', err.response.data.ban_reason || '');
        } catch { /* ignore */ }
        window.location.href = '/banned';
      }
    }

    // ── 503 maintenance ──
    if (status === 503) {
      const exempt = ['/maintenance', '/banned', '/error'];
      if (!exempt.includes(path)) {
        window.location.href = '/maintenance';
      }
    }

    return Promise.reject(err);
  },
);

export default api;
