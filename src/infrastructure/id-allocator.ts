/**
 * Deterministic numeric XMA id allocator.
 *
 * XMA reference documents use small sequential integer ids. We do not (and
 * cannot) reproduce Archi's string ids — instead we hand out ids in strictly
 * increasing order, starting from 1, driven entirely by serializer traversal
 * order. As long as the traversal order over a given `ArchiModel` is stable
 * (it is: every `ArchiModel` collection preserves source document order),
 * the same input always yields the same ids.
 *
 * Never uses Math.random(), Date.now(), or any other non-deterministic or
 * environment-specific source.
 */
export class XmaIdAllocator {
  private counter = 0;

  next(): number {
    this.counter += 1;
    return this.counter;
  }
}

/**
 * A registry mapping arbitrary string keys (Archi ids, or synthetic
 * composite keys) to allocated XMA numeric ids, with reference-consistent
 * reuse: asking for the same key twice returns the same id.
 */
export class XmaIdRegistry {
  private readonly ids = new Map<string, number>();

  constructor(private readonly allocator: XmaIdAllocator) {}

  /** Allocates (or returns the previously allocated) id for `key`. */
  idFor(key: string): number {
    const existing = this.ids.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.allocator.next();
    this.ids.set(key, id);
    return id;
  }

  /** Allocates a fresh id not tied to any lookup key (e.g. structural scaffolding elements). */
  fresh(): number {
    return this.allocator.next();
  }

  has(key: string): boolean {
    return this.ids.has(key);
  }

  get(key: string): number | undefined {
    return this.ids.get(key);
  }
}
