import { buildApiUrl } from './config';

/**
 * Browser-side hybrid RSA + AES-256-GCM encryption / decryption.
 *
 * Request flow:
 *   1. Generate random AES-256 key + IV
 *   2. Encrypt payload with AES-256-GCM
 *   3. Wrap AES key with backend's RSA-OAEP-4096 public key
 *   4. Send  { data, key, iv }
 *
 * Response flow:
 *   Backend encrypts with same AES key → { data, iv }
 *   Client decrypts using the AES key it generated.
 *
 * Anti-replay: each request includes X-Nonce + X-Timestamp headers.
 */

const RSA_ALGORITHM: RsaHashedImportParams = {
  name: 'RSA-OAEP',
  hash: 'SHA-256',
};
const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_BITS = 128;
const RSA_STATE_KEY = '__xonaris_rsa_state__';
const RSA_PEM_STORAGE_KEY = 'xonaris_rsa_public_key';

type SharedRsaState = {
  publicKey: CryptoKey | null;
  fetchPromise: Promise<CryptoKey> | null;
};

type GlobalWithRsaState = typeof globalThis & {
  [RSA_STATE_KEY]?: SharedRsaState;
};

function getSharedRsaState(): SharedRsaState {
  const scope = globalThis as GlobalWithRsaState;
  if (!scope[RSA_STATE_KEY]) {
    scope[RSA_STATE_KEY] = {
      publicKey: null,
      fetchPromise: null,
    };
  }
  return scope[RSA_STATE_KEY]!;
}

function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'spki',
    keyData,
    RSA_ALGORITHM,
    false,
    ['encrypt'],
  );
}

function readStoredPublicKeyPem(): string | null {
  // Security: RSA key is kept in memory only (not localStorage) to prevent
  // persistent key replacement via XSS. The key is re-fetched each session.
  return null;
}

function writeStoredPublicKeyPem(_pem: string): void {
  // Intentionally no-op: key stays in-memory via getSharedRsaState() only.
  // Removed localStorage persistence to prevent XSS-based key replacement.
}

function clearStoredPublicKeyPem(): void {
  // Clean up any previously stored key from localStorage
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RSA_PEM_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

// ── State ────────────────────────────────────

/** Map: nonce → AES CryptoKey  (for response decryption) */
const pendingKeys = new Map<string, { key: CryptoKey; createdAt: number }>();

/** Clean up expired pending keys every 30s (TTL = 60s) */
const PENDING_KEY_TTL_MS = 60_000;
setInterval(() => {
  const cutoff = Date.now() - PENDING_KEY_TTL_MS;
  for (const [nonce, entry] of pendingKeys) {
    if (entry.createdAt < cutoff) pendingKeys.delete(nonce);
  }
}, 30_000);

// ── Helpers ──────────────────────────────────

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    // Some deployments may inject PEMs with replacement characters instead of line breaks.
    .replace(/[^A-Za-z0-9+/=]/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Key management ───────────────────────────

async function fetchRsaPublicKey(): Promise<CryptoKey> {
  const sharedState = getSharedRsaState();
  if (sharedState.publicKey) return sharedState.publicKey;
  if (sharedState.fetchPromise) return sharedState.fetchPromise;

  const storedPem = readStoredPublicKeyPem();
  if (storedPem) {
    sharedState.fetchPromise = importRsaPublicKey(storedPem)
      .then((key) => {
        sharedState.publicKey = key;
        return key;
      })
      .catch(() => {
        clearStoredPublicKeyPem();
        throw new Error('Stored RSA public key is invalid');
      });

    return sharedState.fetchPromise.finally(() => {
      sharedState.fetchPromise = null;
    });
  }

  sharedState.fetchPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    let res: Response;
    try {
      res = await fetch(buildApiUrl('/auth/public-key'), {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`Failed to fetch RSA public key (${res.status})`);
    const { publicKey } = await res.json();
    writeStoredPublicKeyPem(publicKey);
    const key = await importRsaPublicKey(publicKey);
    sharedState.publicKey = key;
    return key;
  })().catch((err) => {
    const fallbackPem = readStoredPublicKeyPem();
    if (fallbackPem) {
      return importRsaPublicKey(fallbackPem).then((key) => {
        sharedState.publicKey = key;
        return key;
      });
    }
    sharedState.fetchPromise = null;
    throw err;
  });

  return sharedState.fetchPromise.finally(() => {
    sharedState.fetchPromise = null;
  });
}

/** Force re-fetch of the RSA public key (e.g. after backend restart). */
export function resetRsaKey(): void {
  const sharedState = getSharedRsaState();
  sharedState.publicKey = null;
  sharedState.fetchPromise = null;
  clearStoredPublicKeyPem();
}

/** Pre-fetch the RSA key as early as possible. */
export function prefetchPublicKey(): void {
  fetchRsaPublicKey().catch(() => {});
}

// ── Encryption status ────────────────────────

export function isEncryptionEnabled(): boolean {
  // Only allow disabling encryption in development mode
  if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_ENCRYPTION === 'true') {
    return false;
  }
  return true;
}

// ── Nonce generation ─────────────────────────

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Encrypt request body (POST / PUT / PATCH) ──

export interface EncryptedPayload {
  data: string;
  key: string;
  iv: string;
}

export async function encryptRequestBody(
  plaintext: string,
  nonce: string,
): Promise<EncryptedPayload> {
  const rsaPubKey = await fetchRsaPublicKey();

  // Generate per-request AES-256 key + IV
  const aesKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true, // extractable for RSA wrapping
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt payload with AES-256-GCM
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: AES_ALGORITHM, iv, tagLength: TAG_BITS },
      aesKey,
      encoded,
    ),
  );

  // Wrap AES key with RSA-OAEP
  const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey);
  const wrappedKey = await crypto.subtle.encrypt(RSA_ALGORITHM, rsaPubKey, aesKeyRaw);

  // Store key for response decryption
  pendingKeys.set(nonce, { key: aesKey, createdAt: Date.now() });

  return {
    data: toBase64(encrypted),
    key: toBase64(wrappedKey),
    iv: toBase64(iv),
  };
}

// ── Encrypt AES key for GET / DELETE (header-based) ──

export async function encryptKeyForHeaders(
  nonce: string,
): Promise<string> {
  const rsaPubKey = await fetchRsaPublicKey();

  const aesKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey);
  const wrappedKey = await crypto.subtle.encrypt(RSA_ALGORITHM, rsaPubKey, aesKeyRaw);

  pendingKeys.set(nonce, { key: aesKey, createdAt: Date.now() });
  return toBase64(wrappedKey);
}

// ── Decrypt response ─────────────────────────

export async function decryptResponse(
  nonce: string,
  encrypted: { data: string; iv: string },
): Promise<string> {
  const entry = pendingKeys.get(nonce);
  if (!entry) throw new Error('No AES key found for this nonce');
  const aesKey = entry.key;
  pendingKeys.delete(nonce);

  const iv = fromBase64(encrypted.iv);
  const dataBuf = fromBase64(encrypted.data);

  // dataBuf = ciphertext || authTag  (AES-GCM output)
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv, tagLength: TAG_BITS },
    aesKey,
    dataBuf,
  );

  return new TextDecoder().decode(decrypted);
}

// ── Cleanup ──────────────────────────────────

export function cleanupPendingKey(nonce: string): void {
  pendingKeys.delete(nonce);
}
