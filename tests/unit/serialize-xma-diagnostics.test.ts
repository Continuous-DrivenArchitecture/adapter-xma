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
    const model = makeModel({ elements: [makeElement({ id: 'j1', type: 'Junction' })] });
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
    const model = makeModel({ elements: [makeElement({ id: 'j1', type: 'Junction' })] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-element-type')).toBe(true);
  });

  it('diagnoses an unsupported relationship (type/source/target combination not in the confirmed 3)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const role = makeElement({ id: 'r', type: 'BusinessRole' });
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'r' });
    const model = makeModel({ elements: [actor, role], relationships: [rel] });
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

  it('diagnoses more than one view instead of silently serializing only the first', () => {
    const model = makeModel({ views: [makeView({ id: 'v1' }), makeView({ id: 'v2' })] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-multiple-views')).toBe(true);
  });

  it('diagnoses a diagram object with incomplete geometry', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({ id: 'do1', viewId: 'v1', archimateElementId: 'a', bounds: { x: 1, y: null, width: 3, height: 4 } });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'missing-bounds' && d.entityId === 'do1')).toBe(true);
  });

  it('diagnoses a nested diagram object', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const parent = makeDiagramObject({ id: 'parent', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10), childrenIds: ['child'] });
    const child = makeDiagramObject({ id: 'child', viewId: 'v1', archimateElementId: 'a', parentId: 'parent', bounds: makeBounds(0, 0, 10, 10) });
    const view = makeView({ id: 'v1', diagramObjectIds: [parent.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [parent, child] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-nested-diagram-object')).toBe(true);
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
