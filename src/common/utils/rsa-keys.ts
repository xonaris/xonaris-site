/**
 * RSA-4096 key pair management for hybrid encryption.
 * Keys can be provided via env vars (multi-instance / production)
 * or generated in-memory at startup (single-instance / dev).
 */
import { generateKeyPairSync, privateDecrypt, constants } from 'crypto';

interface RsaKeyPair {
  publicKey: string;
  privateKey: string;
}

let keyPair: RsaKeyPair | null = null;

/**
 * Initialise (or re-init) the RSA key pair.
 * Call once at bootstrap — before any request is handled.
 */
export function initRsaKeyPair(): void {
  const envPublic = process.env.RSA_PUBLIC_KEY;
  const envPrivate = process.env.RSA_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    keyPair = {
      publicKey: envPublic.replace(/\\n/g, '\n'),
      privateKey: envPrivate.replace(/\\n/g, '\n'),
    };
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'RSA_PUBLIC_KEY and RSA_PRIVATE_KEY environment variables are required in production. '
      + 'Generate a pair with: openssl genrsa -out private.pem 4096 && openssl rsa -in private.pem -pubout -out public.pem',
    );
  }

  // Generate ephemeral key pair (acceptable for single-instance dev setups)
  const generated = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  keyPair = {
    publicKey: generated.publicKey as string,
    privateKey: generated.privateKey as string,
  };
  console.warn(
    '⚠️  RSA key pair generated in-memory. Set RSA_PUBLIC_KEY / RSA_PRIVATE_KEY env vars for production.',
  );
}

/** Return the PEM-encoded RSA public key (SPKI). */
export function getRsaPublicKeyPem(): string {
  if (!keyPair) initRsaKeyPair();
  return keyPair!.publicKey;
}

/**
 * Decrypt a buffer that was encrypted with RSA-OAEP (SHA-256).
 * @param encryptedBase64 base64-encoded ciphertext
 */
export function rsaDecryptOaep(encryptedBase64: string): Buffer {
  if (!keyPair) initRsaKeyPair();
  return privateDecrypt(
    {
      key: keyPair!.privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedBase64, 'base64'),
  );
}
