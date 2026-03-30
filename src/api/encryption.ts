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

// ── State ────────────────────────────────────

let _rsaPublicKey: CryptoKey | null = null;
let _rsaFetchPromise: Promise<CryptoKey> | null = null;

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
    .replace(/\s/g, '');
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
  if (_rsaPublicKey) return _rsaPublicKey;
  if (_rsaFetchPromise) return _rsaFetchPromise;

  _rsaFetchPromise = (async () => {
    const res = await fetch('/api/auth/public-key');
    if (!res.ok) throw new Error('Failed to fetch RSA public key');
    const { publicKey } = await res.json();
    const keyData = pemToArrayBuffer(publicKey);
    const key = await crypto.subtle.importKey(
      'spki',
      keyData,
      RSA_ALGORITHM,
      false,
      ['encrypt'],
    );
    _rsaPublicKey = key;
    return key;
  })();

  return _rsaFetchPromise;
}

/** Force re-fetch of the RSA public key (e.g. after backend restart). */
export function resetRsaKey(): void {
  _rsaPublicKey = null;
  _rsaFetchPromise = null;
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
