import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel, type ArchiModel } from '@cda/archi-semantic-core';
import { inspectXmaSupport, type XmaDiagnostic } from '../../src/index.js';
import { RELATIONSHIP_MAPPINGS } from '../../src/mapping/relationship-mapping.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/sabsa/', import.meta.url));

/**
 * SABSA is a large, real-world model (463 elements, 551 relationships, 38
 * views) — nowhere near fully convertible in v0.1 (it alone has 38 views;
 * v0.1 supports exactly one). Unlike the `relaciones`/`catalogo` fixtures,
 * this integration test does not assert a clean `serializeXma` round-trip.
 * Its purpose is narrower: prove every relationship-mapping entry derived
 * from this fixture (see relationship-mapping.ts's docstring) is actually
 * recognized as supported by `inspectXmaSupport` against the real fixture
 * it was derived from, and that relationship types deliberately left
 * unmodeled (AssociationRelationship; any Grouping/Junction endpoint) are
 * still reported, not silently accepted.
 */
describe('integration: sabsa fixture (67-mapping relationship coverage)', () => {
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

  it('reports every relationship matching a confirmed mapping triple as supported', () => {
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
    // Sanity check that this test actually exercised a meaningful slice of the model,
    // not zero relationships due to a broken lookup.
    expect(checkedCount).toBeGreaterThan(300);
  });

  it('still reports AssociationRelationship as unsupported (generic-form mapping is deliberately not modeled)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const associationRel = model.relationships.find((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return r.type === 'AssociationRelationship' && src && tgt && src.type !== 'Grouping' && tgt.type !== 'Grouping';
    });
    expect(associationRel).toBeDefined();
    expect(unsupportedRelationshipIds.has(associationRel!.id)).toBe(true);
  });

  it('still reports the model as having more views than v0.1 supports', () => {
    expect(diagnostics.some((d) => d.code === 'unsupported-multiple-views')).toBe(true);
  });
});
