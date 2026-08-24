import type { Point, Rect } from './geometry.js';
import { centerOf } from './geometry.js';

/**
 * Floating-point-noise threshold only, not an evidence-based tolerance —
 * gates whether the `bendpoint-endpoint-mismatch` diagnostic fires and
 * whether `mismatch` is populated, never which point is used (source/target
 * are always averaged once both frames have any data — see
 * `resolveBendpoint`'s own doc comment). Whether BizzDesign itself treats a
 * genuinely small (sub-pixel/1-2px) real-world delta any differently from a
 * large one is untested — see docs/relationship-mapping-backlog.md, "Q3 —
 * tolerance: still open".
 */
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
 * DISAGREEMENT ARBITRATION AND PER-AXIS DEFAULTING (confirmed via a real
 * BizzDesign Enterprise Studio round-trip, 2026-08-24 — see
 * docs/relationship-mapping-backlog.md, "Resolved: bendpoint disagreement
 * arbitration"): when the two frames resolve to materially different
 * absolute points, BizzDesign does not prefer either side — it exports the
 * arithmetic MEAN of the two candidates (confirmed: a deliberate 40px
 * divergence on one axis resolved to exactly the midpoint, `580` between
 * candidates `560`/`600`). This also governs a bendpoint missing an entire
 * axis on BOTH frames (e.g. `<bendpoint startY="120" endY="-120"/>`, no X
 * anywhere — a real construct seen in production models, previously treated
 * as unresolvable): each frame's missing axis defaults to that SAME frame's
 * own element center on that axis, and the two now-complete candidate points
 * are averaged exactly as in the disagreeing case (confirmed: this
 * reproduces BizzDesign's real exported point exactly). This subsumes what
 * was previously a separate "unresolvable, skip the waypoint" path into the
 * same mechanism as ordinary disagreement — a point exists whenever EITHER
 * frame has ANY usable coordinate, not only when at least one frame has a
 * complete X+Y pair.
 *
 * This per-axis-default-then-average rule is confirmed for: (a) both frames
 * fully specified and agreeing, (b) both frames fully specified and
 * disagreeing on one axis, (c) neither frame specifying one axis at all. It
 * is NOT independently confirmed for every asymmetric partial combination
 * (e.g. one frame fully specified, the other missing only one axis) — those
 * are covered by the same unified mechanism as a reasoned generalization,
 * not a separately tested case; see the backlog doc's "Q4" for the one
 * combination (multiple waypoints per connection, mixed agreement) that
 * remains genuinely untested.
 *
 * The one path this evidence does NOT touch, and which keeps its
 * pre-existing, separately-established behavior unchanged: a bendpoint
 * where one entire frame (both its X and Y) is completely absent and the
 * other frame is fully specified. That case still resolves to the fully
 * specified frame's point directly (`source-only`/`target-only`) — no
 * averaging against a same-frame center default the way there is when BOTH
 * frames have at least some data.
 */
export function resolveBendpoint(
  bendpoint: { startX: number | null; startY: number | null; endX: number | null; endY: number | null },
  sourceBounds: Rect,
  targetBounds: Rect,
): BendpointResolution | null {
  // A NaN/Infinity offset (e.g. from an upstream parser's failed arithmetic)
  // is treated as absent rather than propagated into a nonsensical resolved
  // point — this falls through to the existing "neither frame usable"
  // diagnostic below instead of silently producing invalid geometry.
  const hasSourceX = Number.isFinite(bendpoint.startX);
  const hasSourceY = Number.isFinite(bendpoint.startY);
  const hasTargetX = Number.isFinite(bendpoint.endX);
  const hasTargetY = Number.isFinite(bendpoint.endY);

  const hasAnySource = hasSourceX || hasSourceY;
  const hasAnyTarget = hasTargetX || hasTargetY;

  if (!hasAnySource && !hasAnyTarget) {
    return null;
  }

  const sourceCenter = centerOf(sourceBounds);
  const targetCenter = centerOf(targetBounds);

  if (hasAnySource && hasAnyTarget) {
    const fromSource: Point = {
      x: hasSourceX ? sourceCenter.x + (bendpoint.startX as number) : sourceCenter.x,
      y: hasSourceY ? sourceCenter.y + (bendpoint.startY as number) : sourceCenter.y,
    };
    const fromTarget: Point = {
      x: hasTargetX ? targetCenter.x + (bendpoint.endX as number) : targetCenter.x,
      y: hasTargetY ? targetCenter.y + (bendpoint.endY as number) : targetCenter.y,
    };
    // Rounded to the nearest whole pixel: Archi's own bendpoint/bounds
    // attributes are always integers, and every confirmed real average
    // (580, 216, 108 — see the doc comment above) happened to land on one
    // exactly, so this rounding is never exercised by the confirmed cases.
    // It exists only to keep an odd-parity combination (e.g. a 55px-tall
    // shape's floored center averaged against another) from emitting a
    // literal ".5" into the XMA output — an assumption, not itself
    // confirmed against a real half-pixel case.
    const point: Point = { x: Math.round((fromSource.x + fromTarget.x) / 2), y: Math.round((fromSource.y + fromTarget.y) / 2) };
    const deltaX = Math.abs(fromSource.x - fromTarget.x);
    const deltaY = Math.abs(fromSource.y - fromTarget.y);
    if (deltaX > AGREEMENT_EPSILON || deltaY > AGREEMENT_EPSILON) {
      return { point, agreement: 'both', mismatch: { fromSource, fromTarget } };
    }
    return { point, agreement: 'both' };
  }

  // Exactly one frame has any data at all, and the other is completely
  // absent — unchanged, pre-existing, separately-confirmed behavior. Only a
  // frame that is itself FULLY specified resolves directly; a frame that is
  // only partially specified with the other frame entirely empty has no
  // confirmed resolution rule either way and remains unresolvable, exactly
  // as before this change.
  if (hasAnySource) {
    if (hasSourceX && hasSourceY) {
      return {
        point: { x: sourceCenter.x + (bendpoint.startX as number), y: sourceCenter.y + (bendpoint.startY as number) },
        agreement: 'source-only',
      };
    }
    return null;
  }

  if (hasTargetX && hasTargetY) {
    return {
      point: { x: targetCenter.x + (bendpoint.endX as number), y: targetCenter.y + (bendpoint.endY as number) },
      agreement: 'target-only',
    };
  }
  return null;
}
