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

  it('treats a non-finite offset as absent rather than propagating NaN/Infinity into the resolved point', () => {
    const resolution = resolveBendpoint(
      { startX: Number.NaN, startY: 93, endX: -168, endY: -3 },
      SOURCE_BOUNDS,
      TARGET_BOUNDS,
    );
    expect(resolution).toEqual({ point: { x: 96, y: 300 }, agreement: 'target-only' });
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

  it('downgrades a partially-specified bendpoint to a warning and still serializes the connection', () => {
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
    // per reference frame, no complete pair on either side.
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
    const warning = diagnostics.find((d) => d.code === 'unresolvable-bendpoint');
    expect(warning?.severity).toBe('warning');

    const xma = serializeXma(model);
    expect(xma).toContain('ArchiMate:BusinessActorBusinessProcessAssignment');
    // The unresolvable waypoint is skipped; the connector is drawn straight.
    expect(xma).not.toContain('MM_Diagram:MM_Point');
  });

  it('keeps the resolvable waypoints of a connection and skips only the partial one', () => {
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
    expect(diagnostics.filter((d) => d.code === 'unresolvable-bendpoint')).toHaveLength(1);

    const xma = serializeXma(model);
    // Exactly one MM_Point survives: the resolvable first waypoint.
    expect(xma.match(/MM_Diagram:MM_Point/g)?.length ?? 0).toBe(1);
    expect(xma).toContain('mm_x="288" mm_y="900"');
  });
});
