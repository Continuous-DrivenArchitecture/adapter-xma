import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel, type ArchiModel } from '@cda/archi-semantic-core';
import { inspectXmaSupport, type XmaDiagnostic } from '../../src/index.js';
import { RELATIONSHIP_MAPPINGS } from '../../src/mapping/relationship-mapping.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/sabsa/', import.meta.url));

/**
 * SABSA is a large, real-world model (463 elements, 551 relationships, 38
 * views). Unlike the `relaciones`/`catalogo` fixtures, this integration test
 * does not assert a clean `serializeXma` round-trip — the model still has
 * plenty of genuinely unconfirmed constructs (arbitrary model properties,
 * for one). Its purpose is narrower: prove every relationship-mapping entry
 * and generic form derived from this fixture is actually recognized as
 * supported by `inspectXmaSupport` against the real fixture it was derived
 * from.
 */
describe('integration: sabsa fixture', () => {
  let model: ArchiModel;
  let diagnostics: XmaDiagnostic[];
  let unsupportedRelationshipIds: Set<string>;

  beforeAll(() => {
    const archimateXml = readFileSync(`${FIXTURE_DIR}sabsa.archimate`, 'utf-8');
    model = parseArchiModel(archimateXml);
    diagnostics = inspectXmaSupport(model, { language: 'en' });
    unsupportedRelationshipIds = new Set(
      diagnostics.filter((d) => d.code === 'unsupported-relationship' && d.entityId !== undefined).map((d) => d.entityId!),
    );
  });

  it('parses the full real-world model', () => {
    expect(model.elements.length).toBe(463);
    expect(model.relationships.length).toBe(551);
    expect(model.views.length).toBe(38);
  });

  it('reports every relationship matching a confirmed exact-triple mapping as supported', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const confirmedKeys = new Set(
      RELATIONSHIP_MAPPINGS.map((m) => `${m.archiRelationshipType}|${m.sourceArchiType}|${m.targetArchiType}`),
    );

    let checkedCount = 0;
    for (const rel of model.relationships) {
      const src = elementById.get(rel.sourceId);
      const tgt = elementById.get(rel.targetId);
      if (!src || !tgt) continue;
      const key = `${rel.type}|${src.type}|${tgt.type}`;
      if (!confirmedKeys.has(key)) continue;
      checkedCount += 1;
      expect(unsupportedRelationshipIds.has(rel.id)).toBe(false);
    }
    expect(checkedCount).toBeGreaterThan(300);
  });

  it('now reports AssociationRelationship as supported (the generic ElementElementAssociation form)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const associationRel = model.relationships.find((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return r.type === 'AssociationRelationship' && src && tgt && src.type !== 'Grouping' && tgt.type !== 'Grouping';
    });
    expect(associationRel).toBeDefined();
    expect(unsupportedRelationshipIds.has(associationRel!.id)).toBe(false);
  });

  it('now reports a CompositionRelationship with a Grouping endpoint as supported (the generic GroupingElementComposition form)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const groupingRel = model.relationships.find((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return r.type === 'CompositionRelationship' && (src?.type === 'Grouping' || tgt?.type === 'Grouping');
    });
    expect(groupingRel).toBeDefined();
    expect(unsupportedRelationshipIds.has(groupingRel!.id)).toBe(false);
  });

  it('now reports a RealizationRelationship with a Junction endpoint as supported (the generic RealisationRelation form)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const junctionRel = model.relationships.find((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return r.type === 'RealizationRelationship' && (src?.type === 'Junction' || tgt?.type === 'Junction');
    });
    expect(junctionRel).toBeDefined();
    expect(unsupportedRelationshipIds.has(junctionRel!.id)).toBe(false);
  });

  it('no longer reports the model as having an unsupported element type for Junction', () => {
    expect(diagnostics.some((d) => d.code === 'unsupported-element-type')).toBe(false);
  });

  it('no longer reports multiple views as unsupported (all 38 are serialized)', () => {
    expect(diagnostics.some((d) => d.code === 'unsupported-multiple-views')).toBe(false);
  });

  it('now reports nested diagram objects (up to 3 levels deep) as supported, drawn inside their parent', () => {
    const nestedObjectDiagnostics = diagnostics.filter(
      (d) => d.code === 'unsupported-nested-diagram-object' && d.entityType === 'ArchiDiagramObject',
    );
    expect(nestedObjectDiagnostics).toEqual([]);
    const nested = model.diagramObjects.filter((o) => o.parentId !== null || o.childrenIds.length > 0);
    expect(nested.length).toBe(283);
  });

  it('still reports a nested Note as unsupported (no fixture evidence for that, unlike nested diagram objects)', () => {
    const nestedNoteDiagnostics = diagnostics.filter(
      (d) => d.code === 'unsupported-nested-diagram-object' && d.entityType === 'ArchiNote',
    );
    expect(nestedNoteDiagnostics.length).toBe(1);
  });

  it('no longer diagnoses the one explicit connection lineColor override in this fixture (now applied, confirmed against the real fixture)', () => {
    // sabsa.archimate has exactly one connection with an explicit lineColor
    // (#ff0000, on a MotivationRequirement-to-MotivationRequirement
    // SpecializationRelationship connector). The real sabsa.xma represents
    // it as `<MM_Diagram:MM_Color name="mm_lineColor" mm_r="255"/>` (g/b
    // omitted because they're 0) — confirmed by direct byte inspection.
    // Before this fix it was always reported unsupported and dropped;
    // now it parses and applies, so the diagnostic must be gone.
    expect(diagnostics.some((d) => d.code === 'unsupported-style-connection-line-color')).toBe(false);
  });

  it('never silently applies alpha/fillOpacity — zero fixtures have an explicit alpha override to confirm a mapping', () => {
    expect(diagnostics.some((d) => d.code === 'unsupported-style-alpha')).toBe(false);
  });
});
