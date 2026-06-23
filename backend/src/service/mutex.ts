// Minimal keyed async mutex. Serializes all actions for a given room id so the
// load -> reduce -> save cycle is atomic within this process. Combined with the
// optimistic version check in the store, this guards against lost updates.

export class KeyedMutex {
  private chains = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    // The chain tail others will wait on; keep a stable reference for cleanup.
    const mine = prev.then(() => gate);
    this.chains.set(key, mine);
    try {
      await prev.catch(() => undefined); // wait our turn; ignore predecessor errors
      return await fn();
    } finally {
      release();
      // Clean up only if no one queued behind us (tail is still ours).
      if (this.chains.get(key) === mine) this.chains.delete(key);
    }
  }
}
