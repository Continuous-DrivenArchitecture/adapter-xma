/**
 * Confirmed across all catalogue shapes and the relationship fixture: XMA
 * geometry is Archi geometry uniformly scaled by 3 (x, y, width, height,
 * and bendpoint coordinates alike).
 */
export const XMA_SCALE = 3;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function scaleValue(archiValue: number): number {
  return archiValue * XMA_SCALE;
}

export function scaleRect(bounds: Rect): Rect {
  return {
    x: scaleValue(bounds.x),
    y: scaleValue(bounds.y),
    width: scaleValue(bounds.width),
    height: scaleValue(bounds.height),
  };
}

export interface Point {
  x: number;
  y: number;
}

export function scalePoint(point: Point): Point {
  return { x: scaleValue(point.x), y: scaleValue(point.y) };
}

/**
 * Rect center, floored to a whole pixel — confirmed against the proven
 * bendpoint fixture: a 55px-tall shape's center is Archi's own `180 + 55/2`
 * truncated to `207`, not `207.5`. Using the exact fraction here would
 * throw off every bendpoint resolved against an odd-height/width shape.
 */
export function centerOf(bounds: Rect): Point {
  return {
    x: Math.floor(bounds.x + bounds.width / 2),
    y: Math.floor(bounds.y + bounds.height / 2),
  };
}

interface NullableBounds {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Type guard: true when a bounds is usable as a `Rect`.
 *
 * `width`/`height` must be set — there is no fixture evidence of Archi ever
 * omitting either. `x`/`y` are allowed to be `null`: confirmed across all
 * four fixtures (three omitted-`x` cases in sabsa, one omitted-`y` case in
 * agile-manifesto — always alone, never alongside a missing `width`/
 * `height`) that Archi omits a bounds coordinate specifically when its value
 * is `0`, per the ArchiMate Exchange Format convention. Downstream numeric
 * use of `bounds.x`/`bounds.y` (scaling, center-of) relies on JS's
 * null-coerces-to-0 arithmetic to apply that default — no explicit
 * substitution needed here.
 */
export function hasCompleteBounds(bounds: NullableBounds | null): bounds is Rect {
  return bounds !== null && bounds.width !== null && bounds.height !== null;
}
