import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import { serializeXma } from '../../src/index.js';
import {
  makeModel,
  makeElement,
  makeRelationship,
  makeView,
  makeDiagramObject,
  makeDiagramConnection,
  makeNote,
  makeBounds,
} from '../helpers/model-builder.js';

function buildSyntheticModel() {
  const actor = makeElement({ id: 'el-actor', type: 'BusinessActor', name: 'Actor Uno' });
  const process = makeElement({
    id: 'el-process',
    type: 'BusinessProcess',
    name: 'Proceso',
    documentation: 'Documentación con ñ y "comillas"',
  });
  const relationship = makeRelationship({
    id: 'rel-1',
    type: 'AssignmentRelationship',
    sourceId: actor.id,
    targetId: process.id,
  });

  const actorObj = makeDiagramObject({
    id: 'do-actor',
    viewId: 'view-1',
    archimateElementId: actor.id,
    bounds: makeBounds(48, 84, 120, 55),
  });
  const processObj = makeDiagramObject({
    id: 'do-process',
    viewId: 'view-1',
    archimateElementId: process.id,
    bounds: makeBounds(216, 84, 120, 55),
  });
  const groupObj = makeDiagramObject({
    id: 'do-group',
    viewId: 'view-1',
    xsiType: 'archimate:Group',
    name: 'Grupo',
    documentation: 'Doc del grupo',
    bounds: makeBounds(48, 200, 200, 100),
  });
  const connection = makeDiagramConnection({
    id: 'conn-1',
    viewId: 'view-1',
    sourceId: actorObj.id,
    targetId: processObj.id,
    archimateRelationshipId: relationship.id,
  });
  const note = makeNote({ id: 'note-1', viewId: 'view-1', content: 'Nota de ejemplo', bounds: makeBounds(300, 300, 150, 60) });

  const view = makeView({
    id: 'view-1',
    name: 'Vista de prueba',
    diagramObjectIds: [actorObj.id, processObj.id, groupObj.id],
    diagramConnectionIds: [connection.id],
    noteIds: [note.id],
  });

  return makeModel({
    elements: [actor, process],
    relationships: [relationship],
    views: [view],
    diagramObjects: [actorObj, processObj, groupObj],
    diagramConnections: [connection],
    notes: [note],
  });
}

describe('serializeXma (synthetic model, end-to-end)', () => {
  it('produces a well-formed XML declaration and is parseable by a standards-compliant parser', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'es' });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: true });
    expect(() => parser.parse(xml)).not.toThrow();
  });

  it('is deterministic: serializing the same model twice yields byte-identical output', () => {
    const model = buildSyntheticModel();
    const first = serializeXma(model, { language: 'es' });
    const second = serializeXma(model, { language: 'es' });
    expect(first).toBe(second);
  });

  it('applies the configured language consistently to every xml:lang and the default MM_Language', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'es' });
    const langAttrs = [...xml.matchAll(/xml:lang="([^"]+)"/g)].map((m) => m[1]);
    expect(langAttrs.length).toBeGreaterThan(0);
    expect(langAttrs.every((l) => l === 'es')).toBe(true);
    expect(xml).toContain('<MM_ModelPackage:MM_Language id="');
    expect(xml).toMatch(/isDefault="true"><nm>es<\/nm>/);
  });

  it('defaults language to "en" and never translates or infers locale from content', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model);
    expect(xml).toContain('xml:lang="en"');
    expect(xml).not.toContain('xml:lang="es"');
  });

  it('graphical mm_from/mm_to reference MM_Node ids, not semantic element ids', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'en' });

    const directedRelMatch = xml.match(/<MM_Diagram:MM_DirectedRel[^>]*mm_from="(\d+)"[^>]*mm_to="(\d+)"/);
    expect(directedRelMatch).not.toBeNull();
    const [, mmFrom, mmTo] = directedRelMatch as RegExpMatchArray;

    const nodeIds = [...xml.matchAll(/<MM_Diagram:MM_Node[^>]*\sid="(\d+)"/g)].map((m) => m[1]);
    expect(nodeIds).toContain(mmFrom);
    expect(nodeIds).toContain(mmTo);

    // And they must NOT equal the semantic element's own id (used as `to=` in the Ref layer).
    const refMatch = xml.match(/<ArchiMate:BusinessActorRef id="(\d+)" to="(\d+)"\/>/);
    expect(refMatch).not.toBeNull();
    const semanticActorId = (refMatch as RegExpMatchArray)[2];
    expect(mmFrom).not.toBe(semanticActorId);
  });

  it('converts a Note to a ViewGraphic node without mm_symbolName', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'en' });
    expect(xml).toContain('Nota de ejemplo');
    const noteNodeMatch = xml.match(/<MM_Diagram:MM_Node id="\d+" mm_graphicType="5" mm_concept="ViewGraphic" mm_lineOpacity/);
    expect(noteNodeMatch).not.toBeNull();
  });

  it('converts a Group to a ViewGraphic node with mm_symbolName="group" and its documentation as RTF', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'en' });
    expect(xml).toContain('mm_symbolName="group"');
    expect(xml).toContain('Grupo');
    expect(xml).toContain('{\\rtf1');
  });

  it('escapes RTF and XML-unsafe documentation text without corrupting the document', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'es' });
    const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: true });
    expect(() => parser.parse(xml)).not.toThrow();
    expect(xml).toContain('\\u241?'); // ñ
  });

  it('the relationship endpoint semantic refs resolve to the correct source/target', () => {
    const model = buildSyntheticModel();
    const xml = serializeXma(model, { language: 'en' });
    expect(xml).toMatch(/<ArchiMate:BusinessActorBusinessProcessAssignment id="\d+" from="\d+" to="\d+"\/>/);
  });
});
