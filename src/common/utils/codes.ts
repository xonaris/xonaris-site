import { randomBytes } from 'crypto';

/**
 * Cryptographically secure random character from charset.
 */
function secureRandomChar(charset: string): string {
  const max = 256 - (256 % charset.length); // Avoid modulo bias
  let byte: number;
  do {
    byte = randomBytes(1)[0];
  } while (byte >= max);
  return charset[byte % charset.length];
}

/**
 * Generate a referral code in format XONA-XXXX-X
 * where X are alphanumeric uppercase characters
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => secureRandomChar(chars)).join('');
  const part2 = secureRandomChar(chars);
  return `XONA-${part1}-${part2}`;
}

/**
 * Generate a premium code in format XONA-XXXX-XXXX-XXXX
 * Uses crypto.randomBytes for CSPRNG — no Math.random().
 */
export function generatePremiumCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genPart = (len: number) =>
    Array.from({ length: len }, () => secureRandomChar(chars)).join('');
  return `XONA-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
}
