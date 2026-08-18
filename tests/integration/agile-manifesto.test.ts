import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel, type ArchiModel } from '@cda/archi-semantic-core';
import { inspectXmaSupport, type XmaDiagnostic } from '../../src/index.js';
import { RELATIONSHIP_MAPPINGS } from '../../src/mapping/relationship-mapping.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/agile-manifesto/', import.meta.url));

/**
 * Like tests/integration/sabsa.test.ts: this model (73 elements, 104
 * relationships, 3 views) has more than the one view v0.1 originally
 * supported. It proves the 20 exact-triple mappings derived from this
 * fixture are recognized as supported, and specifically that
 * `BusinessCollaboration` — confirmed to collapse to `BusinessRole` for
 * relationship naming — is now correctly mapped rather than diagnosed.
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
    expect(checkedCount).toBeGreaterThan(20);
  });

  it('now reports every BusinessCollaboration-endpoint relationship as supported (the confirmed Collaboration-collapse mapping)', () => {
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const collaborationRels = model.relationships.filter((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return src?.type === 'BusinessCollaboration' || tgt?.type === 'BusinessCollaboration';
    });
    expect(collaborationRels.length).toBeGreaterThan(0);
    for (const rel of collaborationRels) {
      expect(unsupportedRelationshipIds.has(rel.id)).toBe(false);
    }
  });

  it('now reports the Junction element and its InfluenceRelationship endpoints as supported', () => {
    expect(diagnostics.some((d) => d.code === 'unsupported-element-type')).toBe(false);
    const elementById = new Map(model.elements.map((e) => [e.id, e]));
    const junctionRels = model.relationships.filter((r) => {
      const src = elementById.get(r.sourceId);
      const tgt = elementById.get(r.targetId);
      return src?.type === 'Junction' || tgt?.type === 'Junction';
    });
    expect(junctionRels.length).toBeGreaterThan(0);
    for (const rel of junctionRels) {
      expect(unsupportedRelationshipIds.has(rel.id)).toBe(false);
    }
  });

  it('now reports every nested diagram object as supported', () => {
    // The exact graphical nesting structure (child MM_Node inside parent's
    // MM_Graphics) is verified against a controlled synthetic model in
    // tests/unit/serialize-xma-diagnostics.test.ts; this fixture (which still
    // has a few genuinely unrelated diagnostics — DiagramModelReference,
    // incomplete Note geometry, bendpoint mismatches — that block a full
    // serializeXma call) only re-confirms the diagnostic no longer fires here.
    expect(diagnostics.some((d) => d.code === 'unsupported-nested-diagram-object')).toBe(false);
    const nested = model.diagramObjects.filter((o) => o.parentId !== null || o.childrenIds.length > 0);
    expect(nested.length).toBe(15);
  });

  it('no longer reports diagnostics for anything this session set out to fix (Junction, Association, Grouping, Collaboration-collapse, multi-view, nested diagram objects)', () => {
    // The model still has diagnostics unrelated to this session's scope (a
    // DiagramModelReference, incomplete geometry on a Note, explicit font
    // style/size overrides, inconsistent bendpoints) — those are real,
    // pre-existing limitations, not something this session's fixes were meant
    // to address.
    const inScope = new Set([
      'unsupported-element-type',
      'unsupported-relationship',
      'unsupported-relationship-endpoint-type',
      'unsupported-multiple-views',
      'unsupported-nested-diagram-object',
    ]);
    expect(diagnostics.filter((d) => inScope.has(d.code) && d.entityType !== 'ArchiNote')).toEqual([]);
  });
});
