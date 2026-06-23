// Simple in-memory token-bucket rate limiter, keyed (e.g. by socket id). Guards against a
// client flooding the server with events. One bucket per key; refills continuously.

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly capacity = 20, // burst size
    private readonly refillPerSec = 10, // sustained rate
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns true if the action is allowed (a token was available), false if throttled. */
  take(key: string): boolean {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, last: t };
    const elapsed = (t - b.last) / 1000;
    b.tokens = Math.min(this.capacity, b.tokens + elapsed * this.refillPerSec);
    b.last = t;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return true;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
