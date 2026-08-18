import { describe, expect, it } from 'vitest';
import { resolveBendpoint } from '../../src/geometry/bendpoints.js';
import { scalePoint } from '../../src/geometry/geometry.js';

const SOURCE_BOUNDS = { x: 48, y: 180, width: 120, height: 55 };
const TARGET_BOUNDS = { x: 204, y: 276, width: 120, height: 55 };

describe('bendpoints', () => {
  it('resolves the proven fixture bendpoint to absolute (96, 300) -> scaled (288, 900)', () => {
    const resolution = resolveBendpoint(
      { startX: -12, startY: 93, endX: -168, endY: -3 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution).not.toBeNull();
    expect(resolution?.point).toEqual({ x: 96, y: 300 });
    expect(resolution?.agreement).toBe('both');
    expect(resolution?.mismatch).toBeUndefined();
    expect(scalePoint(resolution!.point)).toEqual({ x: 288, y: 900 });
  });

  it('resolves from source-relative offset alone', () => {
    const resolution = resolveBendpoint({ startX: -12, startY: 93, endX: null, endY: null }, SOURCE_BOUNDS, TARGET_BOUNDS);
    expect(resolution).toEqual({ point: { x: 96, y: 300 }, agreement: 'source-only' });
  });

  it('resolves from target-relative offset alone', () => {
    const resolution = resolveBendpoint({ startX: null, startY: null, endX: -168, endY: -3 }, SOURCE_BOUNDS, TARGET_BOUNDS);
    expect(resolution).toEqual({ point: { x: 96, y: 300 }, agreement: 'target-only' });
  });

  it('returns null when neither offset is available', () => {
    expect(resolveBendpoint({ startX: null, startY: null, endX: null, endY: null }, SOURCE_BOUNDS, TARGET_BOUNDS)).toBeNull();
  });

  it('flags a material mismatch instead of silently picking a coordinate', () => {
    const resolution = resolveBendpoint(
      { startX: -12, startY: 93, endX: 0, endY: 0 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution?.mismatch).toBeDefined();
    expect(resolution?.mismatch?.fromSource).toEqual({ x: 96, y: 300 });
    expect(resolution?.mismatch?.fromTarget).toEqual({ x: 264, y: 303 });
  });

  it('does not flag negligible floating-point differences as a mismatch', () => {
    const resolution = resolveBendpoint(
      { startX: -12, startY: 93, endX: -168.0000001, endY: -3 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution?.mismatch).toBeUndefined();
  });
});
