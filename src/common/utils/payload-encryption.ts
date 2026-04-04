/**
 * Hybrid RSA + AES-256-GCM payload encryption / decryption.
 *
 * Request format:  { data: base64, key: base64(RSA-wrapped AES key), iv: base64 }
 * Response format: { data: base64(ciphertext||tag), iv: base64 }
 *
 * Also keeps legacy symmetric helpers for backward-compat / data-at-rest.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { rsaDecryptOaep } from './rsa-keys';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// ═══════════════════════════════════════════════
// Hybrid RSA + AES  (transport layer)
// ═══════════════════════════════════════════════

/**
 * Decrypt an incoming hybrid-encrypted request body.
 * @returns The plaintext string **and** the raw AES key (kept for response encryption).
 */
export function decryptHybridPayload(
  dataB64: string,
  encryptedKeyB64: string,
  ivB64: string,
): { plaintext: string; aesKey: Buffer } {
  // 1. Unwrap AES-256 key with RSA-OAEP
  const aesKey = rsaDecryptOaep(encryptedKeyB64);
  if (aesKey.length !== 32) {
    throw new Error('Invalid AES-256 key length after RSA unwrap');
  }

  // 2. Decode IV + data
  const iv = Buffer.from(ivB64, 'base64');
  const dataBuf = Buffer.from(dataB64, 'base64');
  if (dataBuf.length < TAG_LENGTH) {
    throw new Error('Encrypted data too short');
  }

  // data = ciphertext || authTag(16)
  const ciphertext = dataBuf.subarray(0, dataBuf.length - TAG_LENGTH);
  const authTag = dataBuf.subarray(dataBuf.length - TAG_LENGTH);

  // 3. AES-256-GCM decrypt
  const decipher = createDecipheriv(ALGORITHM, aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return { plaintext: decrypted.toString('utf8'), aesKey };
}

/**
 * Encrypt an outgoing response with the request's AES key.
 * Returns { data: base64(ciphertext||tag), iv: base64 }.
 */
export function encryptResponsePayload(
  plaintext: string,
  aesKey: Buffer,
): { data: string; iv: string } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, aesKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    data: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

// ═══════════════════════════════════════════════
// Legacy symmetric helpers  (backward-compat)
// ═══════════════════════════════════════════════

function getPayloadKey(): Buffer {
  const key = process.env.PAYLOAD_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('PAYLOAD_ENCRYPTION_KEY must be a 64-character hex string');
  }
  return Buffer.from(key, 'hex');
}

export function encryptPayload(plaintext: string): string {
  const key = getPayloadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptPayload(ciphertext: string): string {
  const key = getPayloadKey();
  const combined = Buffer.from(ciphertext, 'base64url');
  if (combined.length < IV_LENGTH + 16) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = combined.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
