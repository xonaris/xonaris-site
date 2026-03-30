/**
 * In-memory nonce store for anti-replay protection.
 * Stores seen nonces with timestamps and rejects duplicates.
 * For multi-instance deployments, replace with Redis-backed store.
 */
export class NonceStore {
  private store = new Map<string, number>();
  private readonly maxAgeMs: number;
  private timer: ReturnType<typeof setInterval>;

  constructor(maxAgeMs = 5 * 60 * 1000) {
    this.maxAgeMs = maxAgeMs;
    this.timer = setInterval(() => this.cleanup(), 60_000);
    this.timer.unref(); // Don't block process exit
  }

  /**
   * Check whether a nonce was already seen.
   * - Returns `true` if the nonce is a replay (already exists).
   * - Otherwise records it and returns `false`.
   */
  check(nonce: string): boolean {
    if (this.store.has(nonce)) return true;
    this.store.set(nonce, Date.now());
    return false;
  }

  /** Verify that the timestamp is within the acceptable window. */
  isTimestampValid(timestamp: number): boolean {
    const diff = Math.abs(Date.now() - timestamp);
    return diff <= this.maxAgeMs;
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.maxAgeMs;
    for (const [key, ts] of this.store) {
      if (ts < cutoff) this.store.delete(key);
    }
  }

  destroy(): void {
    clearInterval(this.timer);
    this.store.clear();
  }
}

/** Singleton instance shared by the application. */
export const globalNonceStore = new NonceStore();
