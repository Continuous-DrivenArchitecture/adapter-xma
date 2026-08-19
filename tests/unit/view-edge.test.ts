import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import { makeModel, makeElement, makeView, makeDiagramObject, makeDiagramConnection, makeNote, makeBounds } from '../helpers/model-builder.js';

/**
 * ArchiMate:ViewEdge — a purely-visual connection (no underlying ArchiMate
 * relationship). Confirmed against two independent real instances in two
 * fixtures: agile-manifesto (between two DiagramModelReferences — see
 * view-reference.test.ts) and sabsa (between a Note/Group and a
 * BusinessRole element). This file covers the second pattern: an endpoint
 * whose "own semantic id" comes from a different resolution path
 * (ids.get(note.id) directly, vs. an element's refIds-mediated id).
 */
describe('ArchiMate:ViewEdge (Note <-> element endpoint)', () => {
  it('draws a ViewEdge between a Note and an element, each side using its own already-established semantic id', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const obj = makeDiagramObject({ id: 'obj-a', viewId: 'v1', archimateElementId: 'a', bounds: makeBounds(0, 0, 10, 10) });
    const note = makeNote({ id: 'note-1', viewId: 'v1', content: 'A note', bounds: makeBounds(20, 0, 10, 10) });
    const connection = makeDiagramConnection({ id: 'c1', viewId: 'v1', sourceId: note.id, targetId: obj.id, archimateRelationshipId: null });
    const view = makeView({ id: 'v1', diagramObjectIds: [obj.id], noteIds: [note.id], diagramConnectionIds: [connection.id] });
    const model = makeModel({ elements: [actor], views: [view], diagramObjects: [obj], notes: [note], diagramConnections: [connection] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-connection-no-relationship')).toBe(false);
    const xma = serializeXma(model);

    const edgeMatch = xma.match(/<ArchiMate:ViewEdge id="(\d+)" from="(\d+)" to="(\d+)"\/>/);
    expect(edgeMatch).not.toBeNull();
    const [, viewEdgeId, fromId, toId] = edgeMatch as RegExpMatchArray;

    // "from" (the note) must equal the note's own ViewGraphic id.
    const noteViewGraphicMatch = xma.match(/<ArchiMate:ViewGraphic id="(\d+)">/);
    expect(noteViewGraphicMatch).not.toBeNull();
    expect(fromId).toBe((noteViewGraphicMatch as RegExpMatchArray)[1]);

    // "to" (the actor) must equal the BusinessActorRef id used as the actor's own node's mm_semanticObject.
    const refMatch = xma.match(/<ArchiMate:BusinessActorRef id="(\d+)" to="\d+"\/>/);
    expect(refMatch).not.toBeNull();
    expect(toId).toBe((refMatch as RegExpMatchArray)[1]);

    // The graphical DirectedRel's mm_semanticObject points at the ViewEdge's own id, directly (no further Ref layer).
    const directedRelMatch = xma.match(/<MM_Diagram:MM_DirectedRel[^>]*mm_concept="ViewEdge"[^>]*mm_semanticObject="(\d+)"/);
    expect(directedRelMatch).not.toBeNull();
    expect((directedRelMatch as RegExpMatchArray)[1]).toBe(viewEdgeId);
  });
});
