import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel, type ArchiModel } from '@cda/archi-semantic-core';
import { inspectXmaSupport, serializeXma, type XmaDiagnostic } from '../../src/index.js';
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
    // tests/unit/serialize-xma-diagnostics.test.ts.
    expect(diagnostics.some((d) => d.code === 'unsupported-nested-diagram-object')).toBe(false);
    const nested = model.diagramObjects.filter((o) => o.parentId !== null || o.childrenIds.length > 0);
    expect(nested.length).toBe(15);
  });

  it('no longer reports diagnostics for anything this session set out to fix (Junction, Association, Grouping, Collaboration-collapse, multi-view, nested diagram objects)', () => {
    const inScope = new Set([
      'unsupported-element-type',
      'unsupported-relationship',
      'unsupported-relationship-endpoint-type',
      'unsupported-multiple-views',
      'unsupported-nested-diagram-object',
    ]);
    expect(diagnostics.filter((d) => inScope.has(d.code) && d.entityType !== 'ArchiNote')).toEqual([]);
  });

  it('reports no errors at all, only warnings, and serializes end to end', () => {
    // DiagramModelReference (confirmed: Archi's own XMA export omits these
    // nodes entirely), an omitted-x/y bounds coordinate (confirmed: Archi
    // omits a bounds coordinate that equals 0, across all fixtures), and a
    // bendpoint whose source-/target-relative offsets disagree (a resolvable
    // fallback, not data loss) are all warnings now, not blocking errors —
    // see geometry.ts, view-writer.ts, graphical-writer.ts. Only explicit
    // font size/color overrides remain as (separately unconfirmed, also
    // non-blocking) warnings.
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(() => serializeXma(model, { language: 'en' })).not.toThrow();
  });

  it('gives every ArchiMate collection element (including a Relations collection) its own id, like the real fixture', () => {
    // Regression: renderSchemeChildren previously omitted `id` on both the
    // per-category collection tag (e.g. ApplicationComponents) and the
    // per-scheme Relations collection. Enterprise Studio rejected the whole
    // document outright for this ("could not generate the object: unknown
    // type") rather than merely losing content — reported against a real
    // generated file, reproduced, and confirmed against the ground-truth
    // fixture (every collection there carries an id, e.g.
    // `ApplicationComponents id="222"`, `Relations id="72"`).
    const xma = serializeXma(model, { language: 'en' });
    const collectionsWithoutId = [...xma.matchAll(/<ArchiMate:(\w+) name="[^"]+"(?![^>]*\bid=)[^>]*>/g)].map((m) => m[1]);
    expect(collectionsWithoutId).toEqual([]);
  });

  it('places generic-form relations in their source element\'s own scheme, not a single flat root container', () => {
    // Regression: every AssociationRelationship/Grouping-endpoint relation
    // was being dumped into one root-level <ArchiMate:Relations>, contrary
    // to the real fixture (confirmed by cross-referencing three generic-form
    // relations' `from` id against their defining element: an
    // ApplicationComponent-sourced ElementElementAssociation sits in
    // ApplicationScheme's Relations, a Grouping-sourced
    // GroupingElementComposition sits in CompositeScheme's, and only a
    // Junction-sourced relation — Junction has no scheme — sits at the root).
    const xma = serializeXma(model, { language: 'en' });
    const rootBody = xma.slice(xma.indexOf('DomainDataSet'), xma.indexOf('AbstractCommandContainers'));
    const rootRelationTags = [...rootBody.matchAll(/<ArchiMate:Relations[^>]*>([\s\S]*?)<\/ArchiMate:Relations>/g)]
      .flatMap((m) => [...m[1].matchAll(/<ArchiMate:(\w+)\s/g)])
      .map((m) => m[1]);
    // Only the Junction's own relation(s) may appear at the root.
    expect(rootRelationTags.every((tag) => tag === 'InfluenceRelation')).toBe(true);
    // The generic Association form must appear elsewhere (inside a real scheme), not only at the root.
    expect(xma.includes('ElementElementAssociation')).toBe(true);
    const rootAssociationCount = (rootBody.match(/ElementElementAssociation/g) ?? []).length;
    const totalAssociationCount = (xma.match(/ElementElementAssociation/g) ?? []).length;
    expect(rootAssociationCount).toBeLessThan(totalAssociationCount);
  });

  it('applies an explicit font-size override via the confirmed floor(pt)*20 formula, matching the real fixture byte-for-byte', () => {
    // agile-manifesto.archimate has exactly two distinct explicit font
    // overrides: 11.25pt (Arial Rounded MT Bold) and 14.25pt (Roboto/Roboto
    // Slab), each used twice. The real agile-manifesto.xma has exactly 2
    // occurrences of mm_fontSize="220" (floor(11.25)*20) and 2 of
    // mm_fontSize="280" (floor(14.25)*20) — confirmed by direct byte count
    // against the fixture.
    const xma = serializeXma(model, { language: 'en' });
    expect(xma.match(/mm_fontSize="220"/g) ?? []).toHaveLength(2);
    expect(xma.match(/mm_fontSize="280"/g) ?? []).toHaveLength(2);
  });

  it('omits the graphical connector for a nested-parent-child relationship, matching the real fixture', () => {
    // Reported against a real converted file (opened in Enterprise Studio,
    // "cosas que mejorar... un elemento dentro de otro ya tiene una relación
    // visualmente implícita"). Confirmed directly: this fixture has exactly
    // 12 relationships between a diagram object and its own visual parent
    // (all CompositionRelationship — 10 Grouping-sourced generic-form, 2
    // plain BusinessProcess->BusinessFunction exact-triple), and the real
    // agile-manifesto.xma has zero MM_DirectedRel for any of them (verified
    // by tag: GroupingElementComposition and BusinessProcessBusinessFunction-
    // Composition both appear in the semantic Relations collections at their
    // full count, but neither tag appears among the graphical connectors).
    // The real fixture draws 93 MM_DirectedRel; this implementation
    // produces 92. Traced (by diffing MM_DirectedRel mm_concept counts
    // between this output and the real fixture): the real XMA's 93rd
    // connector is a single mm_concept="ViewEdge" DirectedRel between two
    // mm_concept="AllView" nodes — the graphical form of a purely-visual
    // connection between two DiagramModelReference ("insert view as
    // reference") nodes. This isn't a gap in this library: per the "Purely
    // visual (non-semantic) connections" note in the README, that specific
    // connection isn't even parsed as a diagram connection by
    // @cda/archi-semantic-core (it lacks an xsi:type), so it never reaches
    // adapter-xma's input at all. 92 is the correct, fully-accounted-for
    // count given what the model actually exposes.
    const xma = serializeXma(model, { language: 'en' });
    expect(xma.match(/MM_DirectedRel /g) ?? []).toHaveLength(92);
    // The semantic definition tag specifically (not its "...Ref" RefObjects
    // counterpart, which view-writer emits unconditionally regardless of
    // whether graphical-writer draws a connector for it).
    expect(xma.match(/<ArchiMate:GroupingElementComposition id="/g) ?? []).toHaveLength(10);
    expect(xma.match(/<ArchiMate:BusinessProcessBusinessFunctionComposition id="/g) ?? []).toHaveLength(2);
  });
});
