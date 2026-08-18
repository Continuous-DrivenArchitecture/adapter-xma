import { describe, expect, it } from 'vitest';
import { scaleValue, scaleRect, scalePoint, centerOf, hasCompleteBounds, XMA_SCALE } from '../../src/geometry/geometry.js';

describe('geometry', () => {
  it('scales by exactly 3', () => {
    expect(XMA_SCALE).toBe(3);
    expect(scaleValue(48)).toBe(144);
  });

  it('scales the confirmed catalogue rect: x=48,y=84,w=120,h=55 -> x=144,y=252,w=360,h=165', () => {
    expect(scaleRect({ x: 48, y: 84, width: 120, height: 55 })).toEqual({ x: 144, y: 252, width: 360, height: 165 });
  });

  it('scales an odd, non-round-number width exactly (no rounding): w=121 -> 363', () => {
    expect(scaleRect({ x: 34, y: 250, width: 121, height: 55 })).toEqual({ x: 102, y: 750, width: 363, height: 165 });
  });

  it('scales points', () => {
    expect(scalePoint({ x: 96, y: 300 })).toEqual({ x: 288, y: 900 });
  });

  it('computes rect center, floored to a whole pixel (confirmed by the bendpoint fixture)', () => {
    expect(centerOf({ x: 48, y: 180, width: 120, height: 55 })).toEqual({ x: 108, y: 207 });
  });

  it('hasCompleteBounds narrows only when every field is set', () => {
    expect(hasCompleteBounds({ x: 1, y: 2, width: 3, height: 4 })).toBe(true);
    expect(hasCompleteBounds(null)).toBe(false);
    expect(hasCompleteBounds({ x: 1, y: null, width: 3, height: 4 })).toBe(false);
  });
});
