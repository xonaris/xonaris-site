import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  decryptHybridPayload,
  encryptResponsePayload,
} from '../utils/payload-encryption';
import { rsaDecryptOaep } from '../utils/rsa-keys';
import { globalNonceStore } from '../utils/nonce-store';
import { SKIP_ENCRYPTION_KEY } from '../decorators/skip-encryption.decorator';

/**
 * Hybrid RSA + AES-256-GCM encryption interceptor.
 *
 * Request body format:  { data, key, iv }   (key = RSA-wrapped AES key)
 * Response format:      { data, iv }         (encrypted with same AES key)
 *
 * For GET / DELETE (no body), the AES key travels in X-Encryption-Key header.
 * Anti-replay: X-Nonce + X-Timestamp validated per request.
 *
 * Handlers decorated with @SkipEncryption() bypass all processing.
 */
@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase?.() ?? 'GET';

    // ── Skip if decorator present ──
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_ENCRYPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return next.handle();

    const isEncrypted = request.headers['x-encrypted'] === 'true';
    const requireEncryptionEnv = process.env.REQUIRE_ENCRYPTION;
    const requireEncryption =
      requireEncryptionEnv === 'true' ||
      (requireEncryptionEnv !== 'false' && process.env.NODE_ENV === 'production');

    // Enforce transport encryption on every non-public API route.
    if (requireEncryption && method !== 'OPTIONS' && !isEncrypted) {
      throw new BadRequestException('Encrypted request required');
    }

    let aesKey: Buffer | null = null;

    if (isEncrypted) {
      // ── Anti-replay ──
      const nonce = request.headers['x-nonce'] as string;
      const timestampStr = request.headers['x-timestamp'] as string;
      const timestamp = parseInt(timestampStr, 10);

      if (!nonce || !timestampStr || isNaN(timestamp)) {
        throw new BadRequestException('Missing anti-replay headers (X-Nonce, X-Timestamp)');
      }
      if (!globalNonceStore.isTimestampValid(timestamp)) {
        throw new BadRequestException('Request expired');
      }
      if (globalNonceStore.check(nonce)) {
        throw new BadRequestException('Replay detected');
      }

      // ── Decrypt request body (POST / PUT / PATCH) ──
      if (
        request.body &&
        request.body.data &&
        request.body.key &&
        request.body.iv
      ) {
        try {
          const result = decryptHybridPayload(
            request.body.data,
            request.body.key,
            request.body.iv,
          );
          request.body = JSON.parse(result.plaintext);
          aesKey = result.aesKey;
        } catch {
          throw new BadRequestException('Invalid encrypted payload');
        }
      }

      // ── For GET / DELETE: extract AES key from header ──
      if (!aesKey && request.headers['x-encryption-key']) {
        try {
          aesKey = rsaDecryptOaep(
            request.headers['x-encryption-key'] as string,
          );
        } catch {
          throw new BadRequestException('Invalid X-Encryption-Key header');
        }
      }

      // Attach key to request so the response can be encrypted
      (request as any)._aesKey = aesKey;
    }

    if (isEncrypted && method !== 'OPTIONS' && !aesKey) {
      throw new BadRequestException('Missing encrypted session key');
    }

    // ── Encrypt outgoing response ──
    return next.handle().pipe(
      map((data) => {
        const key: Buffer | null = (request as any)._aesKey;
        if (!isEncrypted || !key || data === undefined || data === null) {
          return data;
        }
        try {
          return encryptResponsePayload(JSON.stringify(data), key);
        } catch {
          return data; // Fallback: return plaintext if encryption fails
        }
      }),
    );
  }
}
