import { describe, expect, it } from 'vitest';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import { makeModel, makeView, makeDiagramObject, makeBounds } from '../helpers/model-builder.js';

/**
 * DiagramModelReference ("insert view as reference" — Archi's shape that
 * links to another view). A prior version of this codebase claimed "no
 * fixture evidence" for this construct's XMA representation, based on
 * grepping the real agile-manifesto.xma for Archi's own string id — which
 * can never match anything, since XMA never reuses Archi's ids. Re-verified
 * directly: both DiagramModelReference instances in that fixture ARE drawn,
 * as an mm_concept="AllView"/mm_graphicType="3" node whose semantic object
 * resolves (via an ArchiMate:AllViewRef) to the *referenced view's own*
 * ArchiMate:AllView id.
 */
describe('DiagramModelReference (view-reference shape)', () => {
  it('draws a view-reference pointing at another view in the same model, with the confirmed fixed fill/line color and no diagnostic', () => {
    const referencedView = makeView({ id: 'target-view', name: 'Target' });
    const refObj = makeDiagramObject({
      id: 'ref-obj',
      viewId: 'host-view',
      referencedModelId: 'target-view',
      bounds: makeBounds(10, 20, 100, 50),
    });
    const hostView = makeView({ id: 'host-view', name: 'Host', diagramObjectIds: [refObj.id] });
    const model = makeModel({ views: [hostView, referencedView], diagramObjects: [refObj] });

    expect(inspectXmaSupport(model).some((d) => d.code === 'unsupported-diagram-model-reference')).toBe(false);

    const xma = serializeXma(model);
    const nodeMatch = xma.match(/<MM_Diagram:MM_Node[^>]*mm_concept="AllView"[^>]*>[\s\S]*?<\/MM_Diagram:MM_Node>/);
    expect(nodeMatch).not.toBeNull();
    const node = (nodeMatch as RegExpMatchArray)[0];
    expect(node).toContain('mm_graphicType="3"');
    expect(node).toContain('mm_concept="icon"'); // has an icon decoration, unlike Junction
    expect(node).toMatch(/mm_r="92" mm_g="92" mm_b="92"/); // fixed line color
    expect(node).toMatch(/mm_r="220" mm_g="235" mm_b="235"/); // fixed fill color

    // semanticObject resolves through an AllViewRef to the target view's own AllView.
    const semanticObjectMatch = node.match(/mm_semanticObject="(\d+)"/);
    expect(semanticObjectMatch).not.toBeNull();
    const refId = (semanticObjectMatch as RegExpMatchArray)[1];
    const refEntryMatch = xma.match(new RegExp(`<ArchiMate:AllViewRef id="${refId}" to="(\\d+)"/>`));
    expect(refEntryMatch).not.toBeNull();
    const targetSemanticId = (refEntryMatch as RegExpMatchArray)[1];
    expect(xma).toMatch(new RegExp(`<ArchiMate:AllView id="${targetSemanticId}">`));
  });

  it('still diagnoses (and omits) a reference to something outside this model\'s own views (e.g. a Sketch/Canvas)', () => {
    const refObj = makeDiagramObject({
      id: 'ref-obj',
      viewId: 'host-view',
      referencedModelId: 'some-sketch-not-in-model-views',
      bounds: makeBounds(10, 20, 100, 50),
    });
    const hostView = makeView({ id: 'host-view', diagramObjectIds: [refObj.id] });
    const model = makeModel({ views: [hostView], diagramObjects: [refObj] });

    const diagnostics = inspectXmaSupport(model);
    const diag = diagnostics.find((d) => d.code === 'unsupported-diagram-model-reference');
    expect(diag?.severity).toBe('warning');
    expect(diag?.entityId).toBe('ref-obj');
    expect(() => serializeXma(model)).not.toThrow();
    expect(serializeXma(model)).not.toContain('mm_concept="AllView"');
  });

  it('diagnoses a view-reference with incomplete geometry, like any other diagram object', () => {
    const referencedView = makeView({ id: 'target-view' });
    const refObj = makeDiagramObject({
      id: 'ref-obj',
      viewId: 'host-view',
      referencedModelId: 'target-view',
      bounds: { x: 1, y: 2, width: null, height: 4 },
    });
    const hostView = makeView({ id: 'host-view', diagramObjectIds: [refObj.id] });
    const model = makeModel({ views: [hostView, referencedView], diagramObjects: [refObj] });

    const diagnostics = inspectXmaSupport(model);
    expect(diagnostics.some((d) => d.code === 'missing-bounds' && d.entityId === 'ref-obj')).toBe(true);
  });

  it('reuses the same ref id for a view referenced twice within one view', () => {
    const referencedView = makeView({ id: 'target-view' });
    const refObjA = makeDiagramObject({ id: 'ref-a', viewId: 'host-view', referencedModelId: 'target-view', bounds: makeBounds(0, 0, 10, 10) });
    const refObjB = makeDiagramObject({ id: 'ref-b', viewId: 'host-view', referencedModelId: 'target-view', bounds: makeBounds(20, 0, 10, 10) });
    const hostView = makeView({ id: 'host-view', diagramObjectIds: [refObjA.id, refObjB.id] });
    const model = makeModel({ views: [hostView, referencedView], diagramObjects: [refObjA, refObjB] });

    const xma = serializeXma(model);
    expect(xma.match(/<ArchiMate:AllViewRef /g) ?? []).toHaveLength(1);
    expect(xma.match(/mm_concept="AllView"/g) ?? []).toHaveLength(2); // still one node each
  });
});
