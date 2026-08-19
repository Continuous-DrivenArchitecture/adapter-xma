import { describe, expect, it } from 'vitest';
import { scaleValue, scaleRect, scalePoint, centerOf, hasCompleteBounds, toRect, XMA_SCALE } from '../../src/geometry/geometry.js';

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

  it('hasCompleteBounds requires width/height, but allows x/y to be null (Archi omits a bounds coordinate when it is 0 — confirmed across all fixtures)', () => {
    expect(hasCompleteBounds({ x: 1, y: 2, width: 3, height: 4 })).toBe(true);
    expect(hasCompleteBounds(null)).toBe(false);
    expect(hasCompleteBounds({ x: 1, y: null, width: 3, height: 4 })).toBe(true);
    expect(hasCompleteBounds({ x: null, y: null, width: 3, height: 4 })).toBe(true);
    expect(hasCompleteBounds({ x: 1, y: 2, width: null, height: 4 })).toBe(false);
    expect(hasCompleteBounds({ x: 1, y: 2, width: 3, height: null })).toBe(false);
  });

  it('toRect applies the null-omitted-coordinate-means-0 convention explicitly (M5: no more unchecked "as Rect" casts)', () => {
    expect(toRect({ x: null, y: null, width: 3, height: 4 })).toEqual({ x: 0, y: 0, width: 3, height: 4 });
    expect(toRect({ x: 1, y: 2, width: 3, height: 4 })).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it('hasCompleteBounds rejects non-finite values (NaN/Infinity) instead of letting them flow into the output', () => {
    expect(hasCompleteBounds({ x: 1, y: 2, width: Number.NaN, height: 4 })).toBe(false);
    expect(hasCompleteBounds({ x: 1, y: 2, width: 3, height: Number.POSITIVE_INFINITY })).toBe(false);
    expect(hasCompleteBounds({ x: Number.NaN, y: 2, width: 3, height: 4 })).toBe(false);
    expect(hasCompleteBounds({ x: 1, y: Number.NEGATIVE_INFINITY, width: 3, height: 4 })).toBe(false);
  });

  it('treats an omitted x/y as 0 via JS null-coercion when scaling/centering (no explicit substitution needed)', () => {
    expect(scaleRect({ x: null, y: 84, width: 120, height: 55 } as unknown as Parameters<typeof scaleRect>[0])).toEqual({
      x: 0,
      y: 252,
      width: 360,
      height: 165,
    });
    expect(centerOf({ x: null, y: 180, width: 120, height: 55 } as unknown as Parameters<typeof centerOf>[0])).toEqual({
      x: 60,
      y: 207,
    });
  });
});
