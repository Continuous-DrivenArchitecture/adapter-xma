import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';
import { parseArchiModel } from '@cda/archi-semantic-core';
import { XMLParser } from 'fast-xml-parser';
import { serializeXma, inspectXmaSupport } from '../../src/index.js';
import { ELEMENT_MAPPINGS } from '../../src/mapping/element-mapping.js';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/catalog/', import.meta.url));

describe('integration: catalogue fixture (60 element types, one view, Note + Group)', () => {
  let archimateXml: string;
  let xma: string;
  let parsed: any;

  beforeAll(() => {
    archimateXml = readFileSync(`${FIXTURE_DIR}catalogo.archimate`, 'utf-8');
    const model = parseArchiModel(archimateXml);
    // The golden fixture must convert with zero diagnostics — it is exactly
    // the evidence the mapping tables were built from.
    expect(inspectXmaSupport(model)).toEqual([]);
    xma = serializeXma(model, { language: 'en' });
    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    parsed = xmlParser.parse(xma);
  });

  it('is well-formed, parseable XML', () => {
    expect(parsed).toBeTruthy();
  });

  it('is deterministic across repeated serialization', () => {
    const model = parseArchiModel(archimateXml);
    expect(serializeXma(model, { language: 'en' })).toBe(xma);
  });

  it('contains every one of the 60 confirmed XMA semantic type tags', () => {
    for (const mapping of ELEMENT_MAPPINGS) {
      expect(xma, `expected to find ArchiMate:${mapping.xmaType}`).toContain(`ArchiMate:${mapping.xmaType}`);
    }
  });

  it('preserves every element name as an nm profile value', () => {
    const names = [
      'Business Actor',
      'Business Process',
      'Application Component',
      'Node',
      'Stakeholder',
      'Work Package',
      'Location',
      'Grouping',
    ];
    for (const name of names) {
      expect(xma).toContain(`>${name}<`);
    }
  });

  it('preserves documentation as RTF profile values', () => {
    expect(xma).toContain('{\\rtf1 Esto es un Resource}');
    expect(xma).toContain('{\\rtf1 Esto es un Location}');
  });

  it('scales every node rect by exactly 3', () => {
    // Resource diagram object: x=34,y=34,w=120,h=55 -> x=102,y=102,w=360,h=165 (confirmed fixture value)
    expect(xma).toMatch(/<MM_Rect name="mm_rect" x="102" y="102" w="360" h="165"\/>/);
  });

  it('applies the confirmed category fill colors', () => {
    expect(xma).toMatch(/mm_r="245" mm_g="222" mm_b="170"/); // Strategy
    expect(xma).toMatch(/mm_r="255" mm_g="255" mm_b="181"/); // Business
    expect(xma).toMatch(/mm_r="181" mm_g="255" mm_b="255"/); // Application
    expect(xma).toMatch(/mm_r="201" mm_g="231" mm_b="183"/); // Technology/Physical
    expect(xma).toMatch(/mm_r="204" mm_g="204" mm_b="255"/); // Motivation
    expect(xma).toMatch(/mm_r="255" mm_g="224" mm_b="224"/); // Implementation & Migration
    expect(xma).toMatch(/mm_r="237" mm_g="207" mm_b="226"/); // Location
  });

  it('applies the confirmed Note and Group fill colors and Group symbol name', () => {
    expect(xma).toMatch(/mm_r="255" mm_g="255" mm_b="255"/); // Note (and CompositeGrouping, which shares this color)
    expect(xma).toMatch(/mm_r="210" mm_g="215" mm_b="215"/); // Group
    expect(xma).toContain('mm_symbolName="group"');
  });

  it('omits icon decoration for the 19 confirmed no-icon concepts and includes it for others', () => {
    // Icon decoration, when present, is a child appearing AFTER mm_concept="{Type}" on the node's own MM_Graphics.
    const noIconIndex = xma.indexOf('mm_concept="TechnologyNode"');
    const nodeFragment = xma.slice(noIconIndex, noIconIndex + 400);
    expect(nodeFragment).not.toContain('mm_concept="icon"');

    const iconIndex = xma.indexOf('mm_concept="BusinessActor"');
    const actorFragment = xma.slice(iconIndex, iconIndex + 400);
    expect(actorFragment).toContain('mm_concept="icon"');
  });

  it('every RefObjects entry has a corresponding graphical node referencing it as mm_semanticObject', () => {
    const refIds = [...xma.matchAll(/<ArchiMate:\w+Ref id="(\d+)" to="\d+"\/>/g)].map((m) => m[1]);
    expect(refIds.length).toBeGreaterThan(50);
    const semanticObjectIds = new Set([...xma.matchAll(/mm_semanticObject="(\d+)"/g)].map((m) => m[1]));
    for (const refId of refIds) {
      expect(semanticObjectIds.has(refId), `Ref id ${refId} should be referenced by a graphical node`).toBe(true);
    }
  });

  it('has exactly one AllView and one Canvas node (single-view v0.1 scope)', () => {
    expect((xma.match(/<ArchiMate:AllView /g) ?? []).length).toBe(1);
    expect((xma.match(/mm_concept="Canvas"/g) ?? []).length).toBe(1);
  });

  it('nests Technology and Physical schemes under a "Technology & Physical" AbstractFolder', () => {
    const folderIdx = xma.indexOf('Technology &amp; Physical');
    const technologyIdx = xma.indexOf('ArchiMate:TechnologyScheme');
    const physicalIdx = xma.indexOf('ArchiMate:PhysicalScheme');
    const viewsFolderIdx = xma.indexOf('<nm>Views</nm>');
    expect(folderIdx).toBeGreaterThan(-1);
    expect(technologyIdx).toBeGreaterThan(folderIdx);
    expect(physicalIdx).toBeGreaterThan(technologyIdx);
    expect(viewsFolderIdx).toBeGreaterThan(physicalIdx);
  });
});
