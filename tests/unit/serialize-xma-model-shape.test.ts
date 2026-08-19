import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import { makeModel } from '../helpers/model-builder.js';

describe('serializeXma / inspectXmaSupport: malformed model argument', () => {
  it('rejects null with a clear TypeError, not an internal "Cannot read properties" crash', () => {
    expect(() => serializeXma(null as never)).toThrow(TypeError);
    expect(() => serializeXma(null as never)).toThrow(/expected an ArchiModel/);
  });

  it('rejects undefined with a clear TypeError', () => {
    expect(() => serializeXma(undefined as never)).toThrow(TypeError);
  });

  it('rejects a non-object model', () => {
    expect(() => serializeXma('not a model' as never)).toThrow(TypeError);
  });

  it('rejects a model missing required array fields', () => {
    const { elements: _elements, ...rest } = makeModel();
    expect(() => serializeXma(rest as never)).toThrow(/model\.elements/);
  });

  it('rejects a model with a non-array field', () => {
    const model = { ...makeModel(), views: 'nope' };
    expect(() => serializeXma(model as never)).toThrow(/model\.views/);
  });

  it('inspectXmaSupport applies the same guard', () => {
    expect(() => inspectXmaSupport(null as never)).toThrow(TypeError);
  });

  it('still accepts a well-formed empty model', () => {
    expect(() => serializeXma(makeModel())).not.toThrow();
  });
});
