import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import {
  makeModel,
  makeElement,
  makeRelationship,
  makeView,
  makeDiagramObject,
  makeDiagramConnection,
  makeBounds,
  makeStyle,
} from '../helpers/model-builder.js';

describe('graphical-writer: Junction style overrides (m6)', () => {
  it('warns when a Junction diagram object has an explicit style override, instead of silently discarding it', () => {
    const junction = makeElement({ id: 'j1', type: 'Junction', junctionType: 'And' });
    const obj = makeDiagramObject({
      id: 'o1',
      viewId: 'v1',
      archimateElementId: 'j1',
      bounds: makeBounds(0, 0, 10, 10),
      style: makeStyle({ fillColor: '#ff0000' }),
    });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [junction], views: [view], diagramObjects: [obj] });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-style-junction' && d.severity === 'warning' && d.entityId === 'o1')).toBe(true);
    expect(() => serializeXma(model)).not.toThrow();
  });

  it('does not warn for a Junction with no style at all', () => {
    const junction = makeElement({ id: 'j1', type: 'Junction', junctionType: 'And' });
    const obj = makeDiagramObject({ id: 'o1', viewId: 'v1', archimateElementId: 'j1', bounds: makeBounds(0, 0, 10, 10) });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [junction], views: [view], diagramObjects: [obj] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-style-junction')).toBe(false);
  });
});

/**
 * Covers three style-resolution fixes derived from re-verifying the
 * assessment's M2/M3/M4 findings directly against fixture bytes (not just
 * the assessment's prose):
 *  - M2: an explicit connection lineColor is applied, not just diagnosed.
 *  - M3: an explicit fontSize is applied via floor(pt)*20, not just diagnosed.
 *  - M4: alpha is diagnosed and NOT applied (0 fixture evidence for a
 *    mapping) — previously it was applied silently with no evidence at all,
 *    a direct inversion of this library's "never guess" policy.
 */
describe('graphical-writer: style resolution (M2/M3/M4)', () => {
  it('applies an explicit connection lineColor, in the same omit-zero-channel shape confirmed by the sabsa fixture', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'p' });
    const objA = makeDiagramObject({ id: 'oa', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    const objP = makeDiagramObject({ id: 'op', viewId: 'v1', archimateElementId: 'p', bounds: makeBounds(20, 0, 10, 10) });
    const conn = makeDiagramConnection({
      id: 'c1',
      viewId: 'v1',
      sourceId: 'oa',
      targetId: 'op',
      archimateRelationshipId: 'rel',
      style: makeStyle({ lineColor: '#ff0000' }),
    });
    const view = makeView({ id: 'v1', diagramObjectIds: [objA.id, objP.id], diagramConnectionIds: [conn.id] });
    const model = makeModel({ elements: [actor, process], relationships: [rel], views: [view], diagramObjects: [objA, objP], diagramConnections: [conn] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-style-connection-line-color')).toBe(false);
    const xma = serializeXma(model);
    const directedRel = xma.slice(xma.indexOf('MM_DirectedRel'));
    // Confirmed shape (sabsa fixture, one explicit #ff0000 connection lineColor):
    // mm_r="255" alone — g/b are 0 and therefore omitted entirely, not written as "0".
    expect(directedRel).toMatch(/<MM_Diagram:MM_Color id="\d+" name="mm_lineColor" mm_r="255"\/>/);
    expect(directedRel).not.toContain('mm_g=');
    expect(directedRel).not.toContain('mm_b=');
  });

  it('still diagnoses (and drops) an unparseable connection lineColor', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'p' });
    const objA = makeDiagramObject({ id: 'oa', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    const objP = makeDiagramObject({ id: 'op', viewId: 'v1', archimateElementId: 'p', bounds: makeBounds(20, 0, 10, 10) });
    const conn = makeDiagramConnection({
      id: 'c1',
      viewId: 'v1',
      sourceId: 'oa',
      targetId: 'op',
      archimateRelationshipId: 'rel',
      style: makeStyle({ lineColor: 'not-a-color' }),
    });
    const view = makeView({ id: 'v1', diagramObjectIds: [objA.id, objP.id], diagramConnectionIds: [conn.id] });
    const model = makeModel({ elements: [actor, process], relationships: [rel], views: [view], diagramObjects: [objA, objP], diagramConnections: [conn] });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-style-connection-line-color' && d.severity === 'warning')).toBe(true);
  });

  it('applies an explicit node fontSize via floor(pt)*20, matching both confirmed fixture data points', () => {
    const actor11 = makeElement({ id: 'a11', type: 'BusinessActor' });
    const actor14 = makeElement({ id: 'a14', type: 'BusinessActor' });
    const obj11 = makeDiagramObject({
      id: 'o11',
      viewId: 'v1',
      archimateElementId: 'a11',
      bounds: makeBounds(0, 0, 10, 10),
      style: makeStyle({ fontSize: 11.25 }),
    });
    const obj14 = makeDiagramObject({
      id: 'o14',
      viewId: 'v1',
      archimateElementId: 'a14',
      bounds: makeBounds(20, 0, 10, 10),
      style: makeStyle({ fontSize: 14.25 }),
    });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj11.id, obj14.id] });
    const model = makeModel({ elements: [actor11, actor14], views: [view], diagramObjects: [obj11, obj14] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-style-font-size')).toBe(false);
    const xma = serializeXma(model);
    expect(xma).toContain('mm_fontSize="220"'); // floor(11.25) * 20
    expect(xma).toContain('mm_fontSize="280"'); // floor(14.25) * 20
  });

  it('never applies alpha (fillOpacity) silently — diagnoses it as unsupported and keeps the default', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({
      id: 'o1',
      viewId: 'v1',
      archimateElementId: 'a',
      bounds: makeBounds(0, 0, 10, 10),
      style: makeStyle({ alpha: 128 }),
    });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj] });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-style-alpha' && d.severity === 'warning')).toBe(true);
    const xma = serializeXma(model);
    expect(xma).not.toContain('mm_fillOpacity="128"');
    expect(xma).toContain('mm_fillOpacity="255"'); // DEFAULT_OPACITY, unchanged
  });
});
