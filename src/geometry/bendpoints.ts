import type { Point, Rect } from './geometry.js';
import { centerOf } from './geometry.js';

const AGREEMENT_EPSILON = 0.01;

export type BendpointAgreement = 'both' | 'source-only' | 'target-only';

export interface BendpointResolution {
  /** Resolved absolute point, in Archi (pre-scale) coordinate space. */
  point: Point;
  agreement: BendpointAgreement;
  /** Present only when both source- and target-relative forms were available but disagreed materially. */
  mismatch?: {
    fromSource: Point;
    fromTarget: Point;
  };
}

/**
 * Resolves a single Archi bendpoint (stored as offsets from the source and
 * target diagram-object centers) to an absolute point in Archi coordinate
 * space.
 *
 * Confirmed fixture: source bounds x=48,y=180,w=120,h=55 (center 108,207),
 * target bounds x=204,y=276,w=120,h=55 (center 264,303), bendpoint
 * startX=-12,startY=93,endX=-168,endY=-3 resolves to absolute (96, 300) via
 * either offset.
 *
 * When both offsets are present, they are cross-checked against each other;
 * a material disagreement is reported via `mismatch` rather than silently
 * resolved, so the caller can surface a diagnostic instead of guessing.
 */
export function resolveBendpoint(
  bendpoint: { startX: number | null; startY: number | null; endX: number | null; endY: number | null },
  sourceBounds: Rect,
  targetBounds: Rect,
): BendpointResolution | null {
  // A NaN/Infinity offset (e.g. from an upstream parser's failed arithmetic)
  // is treated as absent rather than propagated into a nonsensical resolved
  // point — this falls through to the existing "neither offset usable"
  // diagnostic below instead of silently producing invalid geometry.
  const hasSourceOffset = Number.isFinite(bendpoint.startX) && Number.isFinite(bendpoint.startY);
  const hasTargetOffset = Number.isFinite(bendpoint.endX) && Number.isFinite(bendpoint.endY);

  if (!hasSourceOffset && !hasTargetOffset) {
    return null;
  }

  const sourceCenter = centerOf(sourceBounds);
  const targetCenter = centerOf(targetBounds);

  const fromSource: Point | null = hasSourceOffset
    ? { x: sourceCenter.x + (bendpoint.startX as number), y: sourceCenter.y + (bendpoint.startY as number) }
    : null;
  const fromTarget: Point | null = hasTargetOffset
    ? { x: targetCenter.x + (bendpoint.endX as number), y: targetCenter.y + (bendpoint.endY as number) }
    : null;

  if (fromSource && fromTarget) {
    const deltaX = Math.abs(fromSource.x - fromTarget.x);
    const deltaY = Math.abs(fromSource.y - fromTarget.y);
    if (deltaX > AGREEMENT_EPSILON || deltaY > AGREEMENT_EPSILON) {
      return { point: fromSource, agreement: 'both', mismatch: { fromSource, fromTarget } };
    }
    return { point: fromSource, agreement: 'both' };
  }

  if (fromSource) {
    return { point: fromSource, agreement: 'source-only' };
  }

  return { point: fromTarget as Point, agreement: 'target-only' };
}
