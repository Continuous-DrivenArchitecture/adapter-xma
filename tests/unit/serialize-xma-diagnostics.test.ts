import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport, XmaSerializationError } from '../../src/index.js';
import {
  makeModel,
  makeElement,
  makeRelationship,
  makeView,
  makeDiagramObject,
  makeDiagramConnection,
  makeBounds,
} from '../helpers/model-builder.js';

describe('strict-by-default diagnostics', () => {
  it('throws XmaSerializationError for an unknown element type, without silently dropping it', () => {
    const model = makeModel({ elements: [makeElement({ id: 'j1', type: 'NotARealArchiMateType' })] });
    expect(() => serializeXma(model)).toThrow(XmaSerializationError);
    try {
      serializeXma(model);
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(XmaSerializationError);
      const diagnostics = (err as XmaSerializationError).diagnostics;
      expect(diagnostics.some((d) => d.code === 'unsupported-element-type' && d.entityId === 'j1')).toBe(true);
      expect(diagnostics.every((d) => d.severity === 'error' || d.severity === 'warning')).toBe(true);
    }
  });

  it('inspectXmaSupport reports the same diagnostics without throwing', () => {
    const model = makeModel({ elements: [makeElement({ id: 'j1', type: 'NotARealArchiMateType' })] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-element-type')).toBe(true);
  });

  it('diagnoses an unsupported relationship (type/source/target combination not in the confirmed set)', () => {
    const role = makeElement({ id: 'r', type: 'BusinessRole' });
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    // Reversed direction of a confirmed mapping (BusinessActor -> BusinessRole is confirmed; the reverse isn't).
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'r', targetId: 'a' });
    const model = makeModel({ elements: [role, actor], relationships: [rel] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-relationship' && d.entityId === 'rel')).toBe(true);
  });

  it('diagnoses a relationship with a dangling source/target reference', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'does-not-exist' });
    const model = makeModel({ elements: [actor], relationships: [rel] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'dangling-relationship-reference')).toBe(true);
  });

  it('diagnoses a relationship-to-relationship endpoint', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const inner = makeRelationship({ id: 'inner', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'p' });
    const outer = makeRelationship({ id: 'outer', type: 'AssignmentRelationship', sourceId: 'inner', targetId: 'p' });
    const model = makeModel({ elements: [actor, process], relationships: [inner, outer] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-relationship-endpoint' && d.entityId === 'outer')).toBe(true);
  });

  it('serializes multiple views, each as its own AllView and its own GraphicalModule (not a diagnostic)', () => {
    const model = makeModel({ views: [makeView({ id: 'v1' }), makeView({ id: 'v2' }), makeView({ id: 'v3' })] });
    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-multiple-views')).toBe(false);
    const xma = serializeXma(model);
    expect([...xma.matchAll(/<ArchiMate:AllView /g)]).toHaveLength(3);
    expect([...xma.matchAll(/nm="GraphicalModule"/g)]).toHaveLength(3);
  });

  it('diagnoses a diagram object with incomplete geometry', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({ id: 'do1', viewId: 'v1', archimateElementId: 'a', bounds: { x: 1, y: null, width: 3, height: 4 } });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'missing-bounds' && d.entityId === 'do1')).toBe(true);
  });

  it('serializes a nested diagram object as a child MM_Node inside its parent (not a diagnostic)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const parent = makeDiagramObject({ id: 'parent', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10), childrenIds: ['child'] });
    const child = makeDiagramObject({ id: 'child', viewId: 'v1', archimateElementId: 'a', parentId: 'parent', bounds: makeBounds(0, 0, 10, 10) });
    const view = makeView({ id: 'v1', diagramObjectIds: [parent.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [parent, child] });
    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-nested-diagram-object')).toBe(false);
    const xma = serializeXma(model);
    // Two BusinessActor MM_Nodes, one nested inside the other's MM_Graphics.
    const parentIdx = xma.indexOf('mm_concept="BusinessActor"');
    const childIdx = xma.indexOf('mm_concept="BusinessActor"', parentIdx + 1);
    expect(childIdx).toBeGreaterThan(parentIdx);
    const closingParentGraphicsIdx = xma.indexOf('</MM_Diagram:MM_Graphics>', parentIdx);
    expect(childIdx).toBeLessThan(closingParentGraphicsIdx);
  });

  it('diagnoses a purely visual connection with no underlying semantic relationship', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const objA = makeDiagramObject({ id: 'oa', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    const objP = makeDiagramObject({ id: 'op', viewId: 'v1', archimateElementId: 'p', bounds: makeBounds(20, 0, 10, 10) });
    const conn = makeDiagramConnection({ id: 'c1', viewId: 'v1', sourceId: 'oa', targetId: 'op', archimateRelationshipId: null });
    const view = makeView({ id: 'v1', diagramObjectIds: [objA.id, objP.id], diagramConnectionIds: [conn.id] });
    const model = makeModel({ elements: [actor, process], views: [view], diagramObjects: [objA, objP], diagramConnections: [conn] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-connection-no-relationship')).toBe(true);
  });

  it('warns (does not error) on unrepresented element properties/profiles', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor', properties: [{ key: 'k', value: 'v' }] });
    const model = makeModel({ elements: [actor] });
    const diagnostics = inspectXmaSupport(model);
    const propDiag = diagnostics.find((d) => d.code === 'unsupported-properties');
    expect(propDiag?.severity).toBe('warning');
    // A warning alone must not block serialization.
    expect(() => serializeXma(model)).not.toThrow();
  });

  it('a model with zero views still serializes successfully (semantic-only)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor', name: 'Solo' });
    const model = makeModel({ elements: [actor] });
    const xml = serializeXma(model);
    expect(xml).toContain('ArchiMate:BusinessActor');
    expect(xml).not.toContain('GraphicalModule');
  });
});
