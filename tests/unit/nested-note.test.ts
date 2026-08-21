import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import { makeModel, makeElement, makeView, makeDiagramObject, makeNote, makeBounds } from '../helpers/model-builder.js';

/**
 * A nested Note (note.parentId !== null). Corrected: previously diagnosed
 * as unsupported ("only one instance across all four fixtures, not enough
 * to confirm"). Confirmed against an independent reference model instead: 90
 * nested-Note instances across two views, an exact 1:1 count match against
 * the real XMA's nested ViewGraphic nodes (unambiguous — neither source
 * view has any Group, which shares the same ViewGraphic concept, so every
 * nested ViewGraphic node found there had to be a Note). Structurally
 * identical to a top-level Note — same MM_Node shape, just relocated in
 * the tree, exactly like nested ArchiDiagramObjects/Groups.
 */
describe('nested Note (note.parentId !== null)', () => {
  it('draws a Note nested inside a diagram object as a child MM_Node, not a diagnostic', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const parent = makeDiagramObject({ id: 'parent', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 100, 100) });
    const note = makeNote({ id: 'note-1', viewId: 'v1', parentId: 'parent', content: 'nested note text', bounds: makeBounds(10, 10, 30, 20) });
    const view = makeView({ id: 'v1', diagramObjectIds: [parent.id], noteIds: [note.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [parent], notes: [note] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-nested-diagram-object')).toBe(false);

    const xma = serializeXma(model);
    // The Note's MM_Node (mm_concept="ViewGraphic") must appear nested
    // inside the parent's MM_Node, before its closing </MM_Diagram:MM_Graphics>.
    const parentNodeIdx = xma.indexOf('mm_concept="BusinessActor"');
    const noteNodeIdx = xma.indexOf('mm_concept="ViewGraphic"', parentNodeIdx);
    expect(noteNodeIdx).toBeGreaterThan(parentNodeIdx);
    const parentGraphicsCloseIdx = xma.indexOf('</MM_Diagram:MM_Graphics>', parentNodeIdx);
    expect(noteNodeIdx).toBeLessThan(parentGraphicsCloseIdx);
  });

  it('a nested Note is not also drawn at the top level of the canvas', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const parent = makeDiagramObject({ id: 'parent', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 100, 100) });
    const note = makeNote({ id: 'note-1', viewId: 'v1', parentId: 'parent', bounds: makeBounds(10, 10, 30, 20) });
    const view = makeView({ id: 'v1', diagramObjectIds: [parent.id], noteIds: [note.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [parent], notes: [note] });

    const xma = serializeXma(model);
    expect(xma.match(/mm_concept="ViewGraphic"/g) ?? []).toHaveLength(1);
  });

  it('still diagnoses a nested Note with incomplete geometry, like any other drawable object', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const parent = makeDiagramObject({ id: 'parent', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 100, 100) });
    const note = makeNote({ id: 'note-1', viewId: 'v1', parentId: 'parent', bounds: { x: 1, y: 2, width: null, height: 4 } });
    const view = makeView({ id: 'v1', diagramObjectIds: [parent.id], noteIds: [note.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [parent], notes: [note] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'missing-bounds' && d.entityId === 'note-1')).toBe(true);
  });
});
