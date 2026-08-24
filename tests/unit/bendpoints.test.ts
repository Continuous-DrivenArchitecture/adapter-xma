import { describe, expect, it } from 'vitest';
import { resolveBendpoint } from '../../src/geometry/bendpoints.js';
import { scalePoint } from '../../src/geometry/geometry.js';
import { inspectXmaSupport, serializeXma } from '../../src/index.js';
import { makeBendpoint, makeBounds, makeDiagramConnection, makeDiagramObject, makeElement, makeModel, makeRelationship, makeView } from '../helpers/model-builder.js';

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

  it('treats a non-finite offset as absent per axis, not as poisoning the whole frame', () => {
    // startX is NaN (absent) but startY=93 is genuinely usable -- per-axis
    // defaulting means the source frame still contributes (x defaults to
    // its own center, 108; y uses the real offset, 300), so this resolves
    // via the same averaging path as any other both-sides-have-something
    // case, not as a pure target-only reading that silently discards the
    // still-valid startY.
    const resolution = resolveBendpoint(
      { startX: Number.NaN, startY: 93, endX: -168, endY: -3 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution?.agreement).toBe('both');
    expect(resolution?.mismatch?.fromSource).toEqual({ x: 108, y: 300 });
    expect(resolution?.mismatch?.fromTarget).toEqual({ x: 96, y: 300 });
    expect(resolution?.point).toEqual({ x: 102, y: 300 });
  });

  it('returns null when both offsets are non-finite', () => {
    expect(
      resolveBendpoint(
        { startX: Number.NaN, startY: Number.POSITIVE_INFINITY, endX: Number.NaN, endY: Number.NaN },
        SOURCE_BOUNDS,
        TARGET_BOUNDS,
      ),
    ).toBeNull();
  });

  it('averages disagreeing offsets instead of preferring the source side (confirmed via a real BizzDesign round-trip, see docs/relationship-mapping-backlog.md)', () => {
    // Exact reproduction of private-examples/bendpoint-fidelity-probe.archimate's
    // B->C connection: source center (510,75), target center (510,357),
    // deliberate 40px divergence on X. BizzDesign's real exported point for
    // this exact bendpoint was (580,216) in Archi space -- the arithmetic
    // mean of the two candidates, not the source-relative candidate this
    // adapter used to prefer.
    const sourceBounds = { x: 450, y: 48, width: 120, height: 54 };
    const targetBounds = { x: 450, y: 330, width: 120, height: 54 };
    const resolution = resolveBendpoint({ startX: 50, startY: 141, endX: 90, endY: -141 }, sourceBounds, targetBounds);
    expect(resolution?.point).toEqual({ x: 580, y: 216 });
    expect(resolution?.mismatch?.fromSource).toEqual({ x: 560, y: 216 });
    expect(resolution?.mismatch?.fromTarget).toEqual({ x: 600, y: 216 });
  });

  it("defaults a missing axis to that frame's own element center before averaging, rather than treating it as unresolvable (confirmed via the same BizzDesign round-trip)", () => {
    // Exact reproduction of the probe's D->A connection: no X data on
    // either frame at all -- the same real-world shape as the original
    // CIAM Biometrics model's `<bendpoint startY="242" endY="-335"/>`
    // (different numbers, same construct). BizzDesign's real exported
    // point was (108,216) in Archi space, not a skipped waypoint.
    const sourceBounds = { x: 48, y: 330, width: 120, height: 54 };
    const targetBounds = { x: 48, y: 48, width: 120, height: 54 };
    const resolution = resolveBendpoint({ startX: null, startY: 120, endX: null, endY: -120 }, sourceBounds, targetBounds);
    expect(resolution?.point).toEqual({ x: 108, y: 216 });
    expect(resolution?.agreement).toBe('both');
  });

  it('does not flag negligible floating-point differences as a mismatch', () => {
    const resolution = resolveBendpoint(
      { startX: -12, startY: 93, endX: -168.0000001, endY: -3 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution?.mismatch).toBeUndefined();
  });

  it('resolves bendpoints against absolute bounds for nested endpoints', () => {
    const parent = makeDiagramObject({
      id: 'parent',
      viewId: 'view',
      archimateElementId: 'parent-element',
      bounds: makeBounds(100, 200, 400, 300),
      childrenIds: ['nested-target'],
    });
    const source = makeDiagramObject({
      id: 'source-object',
      viewId: 'view',
      archimateElementId: 'source-element',
      bounds: makeBounds(400, 100, 120, 55),
    });
    const nestedTarget = makeDiagramObject({
      id: 'nested-target',
      viewId: 'view',
      parentId: parent.id,
      archimateElementId: 'target-element',
      bounds: makeBounds(50, 60, 120, 55),
    });
    const relationship = makeRelationship({
      id: 'relationship',
      type: 'AssignmentRelationship',
      sourceId: 'source-element',
      targetId: 'target-element',
    });
    const connection = makeDiagramConnection({
      id: 'connection',
      viewId: 'view',
      sourceId: source.id,
      targetId: nestedTarget.id,
      archimateRelationshipId: relationship.id,
      bendpoints: [makeBendpoint({ startX: -160, startY: 73, endX: 90, endY: -87 })],
    });
    const model = makeModel({
      elements: [
        makeElement({ id: 'parent-element', type: 'BusinessActor' }),
        makeElement({ id: 'source-element', type: 'BusinessActor' }),
        makeElement({ id: 'target-element', type: 'BusinessProcess' }),
      ],
      relationships: [relationship],
      views: [makeView({ id: 'view', diagramObjectIds: [parent.id, source.id], diagramConnectionIds: [connection.id] })],
      diagramObjects: [parent, source, nestedTarget],
      diagramConnections: [connection],
    });

    expect(inspectXmaSupport(model).some((d) => d.code === 'bendpoint-endpoint-mismatch')).toBe(false);
    expect(serializeXma(model)).toContain('mm_x="900" mm_y="600"');
  });

  it('preserves locally agreed offsets for nested endpoints with different parents', () => {
    const sourceParent = makeDiagramObject({
      id: 'source-parent',
      viewId: 'view',
      xsiType: 'archimate:Group',
      bounds: makeBounds(100, 100, 300, 200),
      childrenIds: ['nested-source'],
    });
    const targetParent = makeDiagramObject({
      id: 'target-parent',
      viewId: 'view',
      xsiType: 'archimate:Group',
      bounds: makeBounds(500, 100, 300, 200),
      childrenIds: ['nested-target'],
    });
    const source = makeDiagramObject({
      id: 'nested-source',
      viewId: 'view',
      parentId: sourceParent.id,
      archimateElementId: 'source-element',
      bounds: makeBounds(50, 50, 120, 55),
    });
    const target = makeDiagramObject({
      id: 'nested-target',
      viewId: 'view',
      parentId: targetParent.id,
      archimateElementId: 'target-element',
      bounds: makeBounds(50, 50, 120, 55),
    });
    const relationship = makeRelationship({
      id: 'relationship',
      type: 'AssignmentRelationship',
      sourceId: 'source-element',
      targetId: 'target-element',
    });
    const connection = makeDiagramConnection({
      id: 'connection',
      viewId: 'view',
      sourceId: source.id,
      targetId: target.id,
      archimateRelationshipId: relationship.id,
      bendpoints: [makeBendpoint({ startX: 90, startY: 23, endX: 90, endY: 23 })],
    });
    const model = makeModel({
      elements: [
        makeElement({ id: 'source-element', type: 'BusinessActor' }),
        makeElement({ id: 'target-element', type: 'BusinessProcess' }),
      ],
      relationships: [relationship],
      views: [makeView({ id: 'view', diagramObjectIds: [sourceParent.id, targetParent.id], diagramConnectionIds: [connection.id] })],
      diagramObjects: [sourceParent, targetParent, source, target],
      diagramConnections: [connection],
    });

    expect(inspectXmaSupport(model).some((d) => d.code === 'bendpoint-endpoint-mismatch')).toBe(false);
    expect(serializeXma(model)).toContain('mm_x="900" mm_y="600"');
  });

  it('resolves a bendpoint missing an entire axis on both frames instead of skipping it (real-world shape, sabsa fixture / CIAM Biometrics)', () => {
    const source = makeDiagramObject({
      id: 'source-object',
      viewId: 'view',
      archimateElementId: 'source-element',
      bounds: makeBounds(48, 180, 120, 55),
    });
    const target = makeDiagramObject({
      id: 'target-object',
      viewId: 'view',
      archimateElementId: 'target-element',
      bounds: makeBounds(204, 276, 120, 55),
    });
    const relationship = makeRelationship({
      id: 'relationship',
      type: 'AssignmentRelationship',
      sourceId: 'source-element',
      targetId: 'target-element',
    });
    // The real-world shape (sabsa fixture, CIAM Biometrics): one coordinate
    // per reference frame, no complete pair on either side. Previously
    // unresolvable; now resolves via per-axis center-defaulting + averaging
    // (confirmed against a real BizzDesign round-trip, see
    // docs/relationship-mapping-backlog.md).
    const connection = makeDiagramConnection({
      id: 'connection',
      viewId: 'view',
      sourceId: source.id,
      targetId: target.id,
      archimateRelationshipId: relationship.id,
      bendpoints: [makeBendpoint({ startY: 242, endY: -335 })],
    });
    const model = makeModel({
      elements: [
        makeElement({ id: 'source-element', type: 'BusinessActor' }),
        makeElement({ id: 'target-element', type: 'BusinessProcess' }),
      ],
      relationships: [relationship],
      views: [makeView({ id: 'view', diagramObjectIds: [source.id, target.id], diagramConnectionIds: [connection.id] })],
      diagramObjects: [source, target],
      diagramConnections: [connection],
    });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(false);
    expect(diagnostics.some((d) => d.code === 'unresolvable-bendpoint')).toBe(false);
    const warning = diagnostics.find((d) => d.code === 'bendpoint-endpoint-mismatch');
    expect(warning?.severity).toBe('warning');

    const xma = serializeXma(model);
    expect(xma).toContain('ArchiMate:BusinessActorBusinessProcessAssignment');
    // Source frame defaults x to its own center (108) and uses the real
    // startY (207+242=449); target frame defaults x to its own center
    // (264) and uses the real endY (303-335=-32); averaged: (186, 209
    // -- 208.5 rounded), scaled x3.
    expect(xma).toContain('mm_x="558" mm_y="627"');
  });

  it('resolves every waypoint of a multi-bendpoint connection, including a partially-specified one, via the same averaging rule', () => {
    const source = makeDiagramObject({
      id: 'source-object',
      viewId: 'view',
      archimateElementId: 'source-element',
      bounds: makeBounds(48, 180, 120, 55),
    });
    const target = makeDiagramObject({
      id: 'target-object',
      viewId: 'view',
      archimateElementId: 'target-element',
      bounds: makeBounds(204, 276, 120, 55),
    });
    const relationship = makeRelationship({
      id: 'relationship',
      type: 'AssignmentRelationship',
      sourceId: 'source-element',
      targetId: 'target-element',
    });
    const connection = makeDiagramConnection({
      id: 'connection',
      viewId: 'view',
      sourceId: source.id,
      targetId: target.id,
      archimateRelationshipId: relationship.id,
      bendpoints: [
        makeBendpoint({ startX: -12, startY: 93, endX: -168, endY: -3 }),
        makeBendpoint({ startX: 210, endY: -159 }),
      ],
    });
    const model = makeModel({
      elements: [
        makeElement({ id: 'source-element', type: 'BusinessActor' }),
        makeElement({ id: 'target-element', type: 'BusinessProcess' }),
      ],
      relationships: [relationship],
      views: [makeView({ id: 'view', diagramObjectIds: [source.id, target.id], diagramConnectionIds: [connection.id] })],
      diagramObjects: [source, target],
      diagramConnections: [connection],
    });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(false);
    expect(diagnostics.filter((d) => d.code === 'unresolvable-bendpoint')).toHaveLength(0);
    expect(diagnostics.filter((d) => d.code === 'bendpoint-endpoint-mismatch')).toHaveLength(1);

    const xma = serializeXma(model);
    // Both waypoints survive: the fully-agreeing first one (unchanged,
    // 288,900), and the partially-specified second one, now resolved
    // instead of skipped -- source defaults x to its own center (108+210=318
    // uses the real startX; y defaults to 207 since startY is absent),
    // target defaults x to its own center (264, endX absent; y=303-159=144
    // uses the real endY), averaged: (291, 176 -- 175.5 rounded), scaled x3.
    expect(xma.match(/MM_Diagram:MM_Point/g)?.length ?? 0).toBe(2);
    expect(xma).toContain('mm_x="288" mm_y="900"');
    expect(xma).toContain('mm_x="873" mm_y="528"');
  });
});
