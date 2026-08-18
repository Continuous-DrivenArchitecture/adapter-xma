import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel } from '@cda/archi-semantic-core';
import { XMLParser } from 'fast-xml-parser';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/relationships/', import.meta.url));

describe('integration: relationships fixture (Assignment, Serving->Use, Flow, bendpoint)', () => {
  let xma: string;

  beforeAll(() => {
    const archimateXml = readFileSync(`${FIXTURE_DIR}relaciones.archimate`, 'utf-8');
    const model = parseArchiModel(archimateXml);
    expect(inspectXmaSupport(model)).toEqual([]);
    xma = serializeXma(model, { language: 'es' });
    const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: true });
    expect(() => parser.parse(xma)).not.toThrow();
  });

  it('emits all three confirmed semantic relationship types with correct XMA names', () => {
    expect(xma).toContain('ArchiMate:BusinessActorBusinessProcessAssignment');
    expect(xma).toContain('ArchiMate:ApplicationServiceBusinessProcessUse');
    expect(xma).not.toContain('ApplicationServiceBusinessProcessServing');
    expect(xma).toContain('ArchiMate:BusinessProcessBusinessProcessFlow');
  });

  it('places relationships in their confirmed scheme Relations collections', () => {
    const businessSchemeIdx = xma.indexOf('ArchiMate:BusinessScheme');
    const applicationSchemeIdx = xma.indexOf('ArchiMate:ApplicationScheme');
    const assignmentIdx = xma.indexOf('ArchiMate:BusinessActorBusinessProcessAssignment id=');
    const flowIdx = xma.indexOf('ArchiMate:BusinessProcessBusinessProcessFlow id=');
    const useIdx = xma.indexOf('ArchiMate:ApplicationServiceBusinessProcessUse id=');

    expect(assignmentIdx).toBeGreaterThan(businessSchemeIdx);
    expect(flowIdx).toBeGreaterThan(businessSchemeIdx);
    expect(useIdx).toBeGreaterThan(applicationSchemeIdx);
  });

  it('each semantic relationship has structurally valid from/to referencing real semantic element ids', () => {
    const semanticIds = new Set([...xma.matchAll(/<ArchiMate:(?:BusinessActor|BusinessProcess|ApplicationService) id="(\d+)"/g)].map((m) => m[1]));
    const relMatches = [
      ...xma.matchAll(/<ArchiMate:(?:BusinessActorBusinessProcessAssignment|ApplicationServiceBusinessProcessUse|BusinessProcessBusinessProcessFlow) id="\d+" from="(\d+)" to="(\d+)"\/>/g),
    ];
    expect(relMatches.length).toBe(3);
    for (const [, from, to] of relMatches) {
      expect(semanticIds.has(from)).toBe(true);
      expect(semanticIds.has(to)).toBe(true);
    }
  });

  it('emits three graphical MM_DirectedRel elements referencing MM_Node ids', () => {
    const directedRels = [...xma.matchAll(/<MM_Diagram:MM_DirectedRel id="\d+" mm_from="(\d+)" mm_to="(\d+)"[^>]*mm_concept="(\w+)"/g)];
    expect(directedRels.length).toBe(3);
    const nodeIds = new Set([...xma.matchAll(/<MM_Diagram:MM_Node[^>]*\sid="(\d+)"/g)].map((m) => m[1]));
    for (const [, from, to] of directedRels) {
      expect(nodeIds.has(from)).toBe(true);
      expect(nodeIds.has(to)).toBe(true);
    }
    const concepts = directedRels.map((m) => m[3]).sort();
    expect(concepts).toEqual(
      ['ApplicationServiceBusinessProcessUse', 'BusinessActorBusinessProcessAssignment', 'BusinessProcessBusinessProcessFlow'].sort(),
    );
  });

  it('preserves the proven manual bendpoint as absolute point (288, 900)', () => {
    expect(xma).toMatch(/<MM_Diagram:MM_Point id="\d+" mm_x="288" mm_y="900"\/>/);
  });

  it('does not omit mm_fromx/mm_fromy/mm_tox/mm_toy (unresolved anchor metadata is deliberately never emitted)', () => {
    expect(xma).not.toContain('mm_fromx');
    expect(xma).not.toContain('mm_toy');
  });

  it('relationship line color is emitted as a bare default (no r/g/b), matching the reference fixture', () => {
    const match = xma.match(/<MM_Diagram:MM_DirectedRel[\s\S]*?<MM_Diagram:MM_Color id="\d+" name="mm_lineColor"\/>/);
    expect(match).not.toBeNull();
  });

  it('applies the configured Spanish language consistently', () => {
    expect(xma).toContain('xml:lang="es"');
    expect(xma).not.toContain('xml:lang="en"');
  });
});
