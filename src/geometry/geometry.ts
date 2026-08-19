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
 * A bounds with confirmed `width`/`height`, but `x`/`y` still possibly
 * `null` (Archi's own convention for "this coordinate is 0" — see
 * `hasCompleteBounds`). Deliberately distinct from `Rect`: unlike the old
 * `bounds is Rect` guard, this doesn't claim `x`/`y` are numbers when they
 * might not be, so a caller can't reach for `bounds.x` arithmetic without
 * going through `toRect` first and getting the null-to-0 substitution
 * explicitly, instead of relying on it happening implicitly via JS
 * coercion behind an unchecked cast.
 */
export interface CompleteBounds {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
}

/**
 * Type guard: true when a bounds has usable width/height (`x`/`y` may
 * still be `null` — see `CompleteBounds`).
 *
 * `width`/`height` must be set — there is no fixture evidence of Archi ever
 * omitting either. `x`/`y` are allowed to be `null`: confirmed across all
 * four fixtures (three omitted-`x` cases in sabsa, one omitted-`y` case in
 * agile-manifesto — always alone, never alongside a missing `width`/
 * `height`) that Archi omits a bounds coordinate specifically when its value
 * is `0`, per the ArchiMate Exchange Format convention. Use `toRect` to
 * apply that default explicitly before doing numeric work with `x`/`y`.
 *
 * Every non-null field must also be a finite number: a `NaN`/`Infinity`
 * value (e.g. from an upstream parser's failed arithmetic on garbled
 * geometry text) would otherwise pass this check and flow silently into the
 * rendered XML as a literal `"NaN"`/`"Infinity"` attribute — invalid output
 * produced with no diagnostic. Treating it as incomplete instead routes it
 * through the same `missing-bounds` diagnostic as an actually-missing value.
 */
export function hasCompleteBounds(bounds: NullableBounds | null): bounds is CompleteBounds {
  if (bounds === null) return false;
  for (const value of [bounds.x, bounds.y, bounds.width, bounds.height]) {
    if (value !== null && !Number.isFinite(value)) return false;
  }
  return bounds.width !== null && bounds.height !== null;
}

/**
 * Applies Archi's "omitted coordinate means 0" convention explicitly (see
 * `hasCompleteBounds`), turning a `CompleteBounds` into a real `Rect`.
 */
export function toRect(bounds: CompleteBounds): Rect {
  return { x: bounds.x ?? 0, y: bounds.y ?? 0, width: bounds.width, height: bounds.height };
}
