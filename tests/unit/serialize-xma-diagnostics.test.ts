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

  it('diagnoses a diagram object with incomplete geometry (missing width/height)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({ id: 'do1', viewId: 'v1', archimateElementId: 'a', bounds: { x: 1, y: 2, width: null, height: 4 } });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'missing-bounds' && d.entityId === 'do1')).toBe(true);
  });

  it('does not diagnose a diagram object with an omitted x/y (Archi omits a bounds coordinate when it is 0)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({ id: 'do1', viewId: 'v1', archimateElementId: 'a', bounds: { x: 1, y: null, width: 3, height: 4 } });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'missing-bounds')).toBe(false);
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

  it('omits the graphical connector for a relationship between a diagram object and its own visual parent, but keeps the semantic relationship', () => {
    // Confirmed against agile-manifesto.xma: every nested-parent-child pair
    // that also has a CompositionRelationship between them (12 instances,
    // spanning both a plain exact-triple form and the generic
    // Grouping-endpoint form) has zero MM_DirectedRel graphics, while the
    // semantic relationship element is still present. A non-nested pair with
    // the same relationship type is unaffected — the omission is about
    // nesting, not the relationship type.
    const vs1 = makeElement({ id: 'vs1', type: 'ValueStream' });
    const vs2 = makeElement({ id: 'vs2', type: 'ValueStream' });
    const vs3 = makeElement({ id: 'vs3', type: 'ValueStream' });
    const nestedRel = makeRelationship({ id: 'nestedRel', type: 'CompositionRelationship', sourceId: 'vs1', targetId: 'vs2' });
    const siblingRel = makeRelationship({ id: 'siblingRel', type: 'CompositionRelationship', sourceId: 'vs1', targetId: 'vs3' });
    const parent = makeDiagramObject({
      id: 'parentObj',
      viewId: 'v1',
      archimateElementId: 'vs1',
      bounds: makeBounds(0, 0, 100, 100),
      childrenIds: ['childObj'],
    });
    const child = makeDiagramObject({
      id: 'childObj',
      viewId: 'v1',
      archimateElementId: 'vs2',
      parentId: 'parentObj',
      bounds: makeBounds(10, 10, 20, 20),
    });
    const sibling = makeDiagramObject({ id: 'siblingObj', viewId: 'v1', archimateElementId: 'vs3', bounds: makeBounds(200, 0, 20, 20) });
    const nestedConn = makeDiagramConnection({ id: 'nestedConn', viewId: 'v1', sourceId: 'parentObj', targetId: 'childObj', archimateRelationshipId: 'nestedRel' });
    const siblingConn = makeDiagramConnection({ id: 'siblingConn', viewId: 'v1', sourceId: 'parentObj', targetId: 'siblingObj', archimateRelationshipId: 'siblingRel' });
    const view = makeView({
      id: 'v1',
      diagramObjectIds: ['parentObj', 'siblingObj'],
      diagramConnectionIds: ['nestedConn', 'siblingConn'],
    });
    const model = makeModel({
      elements: [vs1, vs2, vs3],
      relationships: [nestedRel, siblingRel],
      views: [view],
      diagramObjects: [parent, child, sibling],
      diagramConnections: [nestedConn, siblingConn],
    });

    const xma = serializeXma(model);
    // Both relationships are still present semantically.
    expect(xma.match(/StrategyValueStreamStrategyValueStreamComposition id=/g) ?? []).toHaveLength(2);
    // Only the non-nested (sibling) one gets a graphical connector.
    expect(xma.match(/MM_DirectedRel /g) ?? []).toHaveLength(1);
  });

  it('represents a purely visual connection (no underlying relationship) between two drawable objects as an ArchiMate:ViewEdge, not a diagnostic', () => {
    // Corrected: this was previously diagnosed as unsupported. Confirmed
    // against two independent real fixtures (agile-manifesto, sabsa) that
    // Archi's own XMA export represents this as an ArchiMate:ViewEdge whose
    // from/to are each endpoint's own semantic id — see view-writer.ts's
    // resolveObjectSemanticId and tests/fixtures/README.md.
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const objA = makeDiagramObject({ id: 'oa', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    const objP = makeDiagramObject({ id: 'op', viewId: 'v1', archimateElementId: 'p', bounds: makeBounds(20, 0, 10, 10) });
    const conn = makeDiagramConnection({ id: 'c1', viewId: 'v1', sourceId: 'oa', targetId: 'op', archimateRelationshipId: null });
    const view = makeView({ id: 'v1', diagramObjectIds: [objA.id, objP.id], diagramConnectionIds: [conn.id] });
    const model = makeModel({ elements: [actor, process], views: [view], diagramObjects: [objA, objP], diagramConnections: [conn] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-connection-no-relationship')).toBe(false);
    const xma = serializeXma(model);
    expect(xma).toMatch(/<ArchiMate:ViewEdge id="\d+" from="\d+" to="\d+"\/>/);
    expect(xma).toContain('mm_concept="ViewEdge"');
  });

  it('still diagnoses a purely visual connection when an endpoint is not itself a drawable object', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const objA = makeDiagramObject({ id: 'oa', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    // Connects to an object id that doesn't exist in the model at all — the endpoint can never resolve to a semantic id.
    const conn = makeDiagramConnection({ id: 'c1', viewId: 'v1', sourceId: 'oa', targetId: 'does-not-exist', archimateRelationshipId: null });
    const view = makeView({ id: 'v1', diagramObjectIds: [objA.id], diagramConnectionIds: [conn.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [objA], diagramConnections: [conn] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-connection-no-relationship')).toBe(true);
  });

  it('serializes element properties as string profile values', () => {
    const actor = makeElement({
      id: 'a',
      type: 'BusinessActor',
      properties: [
        { key: 'k', value: 'v' },
        { key: 'a&b', value: '<v>&' },
      ],
    });
    const model = makeModel({ elements: [actor] });
    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'unsupported-properties')).toBe(false);
    expect(serializeXma(model)).toContain('<MM_Value name="k" type="string">v</MM_Value>');
    expect(serializeXma(model)).toContain('<MM_Value name="a&amp;b" type="string">&lt;v&gt;&amp;</MM_Value>');
  });

  it('diagnoses a cyclic diagram-object parent/child chain instead of recursing forever', () => {
    const actorA = makeElement({ id: 'a', type: 'BusinessActor' });
    const actorB = makeElement({ id: 'b', type: 'BusinessActor' });
    const objA = makeDiagramObject({
      id: 'objA',
      viewId: 'v1',
      archimateElementId: 'a',
      bounds: makeBounds(0, 0, 10, 10),
      childrenIds: ['objB'],
    });
    const objB = makeDiagramObject({
      id: 'objB',
      viewId: 'v1',
      archimateElementId: 'b',
      parentId: 'objA',
      bounds: makeBounds(0, 0, 10, 10),
      childrenIds: ['objA'], // cycle: objA -> objB -> objA
    });
    const view = makeView({ id: 'v1', diagramObjectIds: ['objA'] });
    const model = makeModel({ elements: [actorA, actorB], views: [view], diagramObjects: [objA, objB] });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'cyclic-diagram-object-nesting')).toBe(true);
    expect(() => serializeXma(model)).toThrow(XmaSerializationError);
  });

  it('warns when a Junction has an unrecognized native type value silently defaulted to AND (m5)', () => {
    // archi-semantic-core already defaults an unrecognized junctionType to
    // 'And' rather than guessing, but preserves the original string in
    // rawJunctionType specifically so this can be told apart from a truly
    // empty/absent value (also defaulted to 'And', but not unrecognized).
    const junction = makeElement({ id: 'j1', type: 'Junction', junctionType: 'And', rawJunctionType: 'xor' });
    const model = makeModel({ elements: [junction] });
    const diagnostics = inspectXmaSupport(model);
    const diag = diagnostics.find((d) => d.code === 'unrecognized-junction-type');
    expect(diag?.severity).toBe('warning');
    expect(diag?.entityId).toBe('j1');
    expect(() => serializeXma(model)).not.toThrow();
  });

  it('does not warn for a Junction with a truly empty/absent native type value (the documented default, not a guess)', () => {
    const junction = makeElement({ id: 'j1', type: 'Junction', junctionType: 'And', rawJunctionType: '' });
    const model = makeModel({ elements: [junction] });
    expect(inspectXmaSupport(model).some((d) => d.code === 'unrecognized-junction-type')).toBe(false);
  });

  it('does not warn for a Junction correctly resolved to Or', () => {
    const junction = makeElement({ id: 'j1', type: 'Junction', junctionType: 'Or', rawJunctionType: 'or' });
    const model = makeModel({ elements: [junction] });
    expect(inspectXmaSupport(model).some((d) => d.code === 'unrecognized-junction-type')).toBe(false);
  });

  it('a model with zero views still serializes successfully (semantic-only)', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor', name: 'Solo' });
    const model = makeModel({ elements: [actor] });
    const xml = serializeXma(model);
    expect(xml).toContain('ArchiMate:BusinessActor');
    expect(xml).not.toContain('GraphicalModule');
  });
});
