import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel, type ArchiModel } from '@cda/archi-semantic-core';
import { inspectXmaSupport, type XmaDiagnostic } from '../../src/index.js';
import { RELATIONSHIP_MAPPINGS } from '../../src/mapping/relationship-mapping.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/agile-manifesto/', import.meta.url));

/**
 * Like tests/integration/sabsa.test.ts: this model (73 elements, 104
 * relationships, 3 views) has more than the one view v0.1 supports, so this
 * doesn't assert a clean serializeXma round-trip. It proves the 20
 * mappings derived from this fixture (see relationship-mapping.ts) are
 * recognized as supported, and specifically that a `BusinessCollaboration`
 * endpoint — confirmed to collapse to `BusinessRole` for relationship
 * naming, not modeled in relationship-mapping.ts — is still correctly
 * diagnosed as unsupported rather than silently mismapped.
 */
describe('integration: agile-manifesto fixture', () => {
  let model: ArchiModel;
  let diagnostics: XmaDiagnostic[];
  let unsupportedRelationshipIds: Set<string>;

  beforeAll(() => {
    const archimateXml = readFileSync(`${FIXTURE_DIR}agile-manifesto.archimate`, 'utf-8');
    model = parseArchiModel(archimateXml);
    diagnostics = inspectXmaSupport(model, { language: 'en' });
    unsupportedRelationshipIds = new Set(
      diagnostics.filter((d) => d.code === 'unsupported-relationship' && d.entityId !== undefined).map((d) => d.entityId!),
    );
  });

  it('parses the full model', () => {
    expect(model.elements.length).toBe(73);
    expect(model.relationships.length).toBe(104);
    expect(model.views.length).toBe(3);
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
    expect(checkedCount).toBeGreaterThan(20);
  });

  it('still reports a BusinessCollaboration-endpoint relationship as unsupported (the Collaboration-collapse form is not modeled)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const collaborationRel = model.relationships.find((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return src?.type === 'BusinessCollaboration' || tgt?.type === 'BusinessCollaboration';
    });
    expect(collaborationRel).toBeDefined();
    expect(unsupportedRelationshipIds.has(collaborationRel!.id)).toBe(true);
  });
});
