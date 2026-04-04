import { SetMetadata } from '@nestjs/common';

export const SKIP_ENCRYPTION_KEY = 'skipEncryption';

/**
 * Decorator to skip payload encryption/decryption for specific handlers.
 * Use on endpoints that MUST return plaintext (e.g. public-key exchange, health checks).
 */
export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_KEY, true);
