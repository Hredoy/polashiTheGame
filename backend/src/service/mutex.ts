// Minimal keyed async mutex. Serializes all actions for a given room id so the
// load -> reduce -> save cycle is atomic within this process. Combined with the
// optimistic version check in the store, this guards against lost updates.

export class KeyedMutex {
  private chains = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    this.chains.set(
      key,
      prev.then(() => gate),
    );
    try {
      await prev.catch(() => undefined); // wait our turn; ignore predecessor errors
      return await fn();
    } finally {
      release();
      // Clean up if no one queued behind us.
      if (this.chains.get(key) === prev.then(() => gate)) this.chains.delete(key);
    }
  }
}
