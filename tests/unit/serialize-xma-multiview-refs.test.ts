import { describe, expect, it } from 'vitest';
import { serializeXma } from '../../src/index.js';
import { makeModel, makeElement, makeView, makeDiagramObject, makeBounds } from '../helpers/model-builder.js';

/**
 * M1 (assessment finding): RefObjects must be scoped per view, not
 * deduplicated globally across the whole model. Confirmed by direct byte
 * count against tests/fixtures/sabsa/sabsa.xma (38 views): 840 total Ref
 * elements for only 735 distinct semantic targets — meaning an element
 * referenced from multiple views gets its own fresh ref id in each view,
 * never a ref id reused across two views' RefObjects. A shared registry
 * (the previous behavior) left every view after the first missing a Ref
 * entry for any element first seen in an earlier view.
 */
describe('serializeXma: RefObjects are scoped per view (M1)', () => {
  it('emits a distinct Ref entry per view for an element shared across two views, wired to that view\'s own graphical node', () => {
    const actor = makeElement({ id: 'shared-actor', type: 'BusinessActor', name: 'Shared' });
    const obj1 = makeDiagramObject({ id: 'obj-v1', viewId: 'view-1', archimateElementId: 'shared-actor', bounds: makeBounds(0, 0, 10, 10) });
    const obj2 = makeDiagramObject({ id: 'obj-v2', viewId: 'view-2', archimateElementId: 'shared-actor', bounds: makeBounds(0, 0, 10, 10) });
    const view1 = makeView({ id: 'view-1', diagramObjectIds: [obj1.id] });
    const view2 = makeView({ id: 'view-2', diagramObjectIds: [obj2.id] });
    const model = makeModel({ elements: [actor], views: [view1, view2], diagramObjects: [obj1, obj2] });

    const xma = serializeXma(model);

    const allViewBlocks = [...xma.matchAll(/<ArchiMate:AllView id="\d+">[\s\S]*?<\/ArchiMate:AllView>/g)].map((m) => m[0]);
    expect(allViewBlocks).toHaveLength(2);

    const refIds = allViewBlocks.map((block) => {
      const match = block.match(/<ArchiMate:BusinessActorRef id="(\d+)" to="(\d+)"\/>/);
      expect(match).not.toBeNull();
      return match as RegExpMatchArray;
    });

    // Same semantic target ("to=") in both views...
    expect(refIds[0][2]).toBe(refIds[1][2]);
    // ...but each view has its OWN ref id, never reused across views.
    expect(refIds[0][1]).not.toBe(refIds[1][1]);

    // Each view's own graphical node must reference its own view's ref id,
    // not the other view's — a stale/foreign ref id would be a dangling
    // mm_semanticObject in the target tool.
    const graphicalModuleBlocks = [...xma.matchAll(/nm="GraphicalModule"[\s\S]*?<\/MM_ModelPackage:MM_Module>/g)].map((m) => m[0]);
    expect(graphicalModuleBlocks).toHaveLength(2);
    graphicalModuleBlocks.forEach((block, i) => {
      const nodeMatch = block.match(/mm_concept="BusinessActor" [^>]*mm_semanticObject="(\d+)"/);
      expect(nodeMatch).not.toBeNull();
      expect((nodeMatch as RegExpMatchArray)[1]).toBe(refIds[i][1]);
    });
  });

  it('still deduplicates within a single view (an element referenced twice in the same view gets one Ref, not two)', () => {
    const actor = makeElement({ id: 'shared-actor', type: 'BusinessActor' });
    const objA = makeDiagramObject({ id: 'obj-a', viewId: 'view-1', archimateElementId: 'shared-actor', bounds: makeBounds(0, 0, 10, 10) });
    const objB = makeDiagramObject({ id: 'obj-b', viewId: 'view-1', archimateElementId: 'shared-actor', bounds: makeBounds(20, 0, 10, 10) });
    const view = makeView({ id: 'view-1', diagramObjectIds: [objA.id, objB.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [objA, objB] });

    const xma = serializeXma(model);
    expect(xma.match(/<ArchiMate:BusinessActorRef /g) ?? []).toHaveLength(1);
  });
});
