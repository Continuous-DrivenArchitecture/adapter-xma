import { describe, expect, it } from 'vitest';
import { XmaIdAllocator, XmaIdRegistry } from '../../src/infrastructure/id-allocator.js';

describe('XmaIdAllocator', () => {
  it('hands out strictly increasing ids starting from 1', () => {
    const allocator = new XmaIdAllocator();
    expect(allocator.next()).toBe(1);
    expect(allocator.next()).toBe(2);
    expect(allocator.next()).toBe(3);
  });

  it('is deterministic across independent instances given the same call sequence', () => {
    const a = new XmaIdAllocator();
    const b = new XmaIdAllocator();
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });
});

describe('XmaIdRegistry', () => {
  it('returns the same id for the same key (reference-consistent reuse)', () => {
    const registry = new XmaIdRegistry(new XmaIdAllocator());
    const first = registry.idFor('archi-id-1');
    const second = registry.idFor('archi-id-1');
    expect(first).toBe(second);
  });

  it('returns distinct ids for distinct keys', () => {
    const registry = new XmaIdRegistry(new XmaIdAllocator());
    expect(registry.idFor('a')).not.toBe(registry.idFor('b'));
  });

  it('shares the counter across registries built on the same allocator (globally unique ids)', () => {
    const allocator = new XmaIdAllocator();
    const elements = new XmaIdRegistry(allocator);
    const refs = new XmaIdRegistry(allocator);
    const elementId = elements.idFor('el-1');
    const refId = refs.idFor('el-1');
    expect(elementId).not.toBe(refId);
  });

  it('fresh() always allocates a new id, never reusing a key', () => {
    const registry = new XmaIdRegistry(new XmaIdAllocator());
    const a = registry.fresh();
    const b = registry.fresh();
    expect(a).not.toBe(b);
  });

  it('has()/get() reflect only keys allocated via idFor()', () => {
    const registry = new XmaIdRegistry(new XmaIdAllocator());
    expect(registry.has('x')).toBe(false);
    const id = registry.idFor('x');
    expect(registry.has('x')).toBe(true);
    expect(registry.get('x')).toBe(id);
  });
});
