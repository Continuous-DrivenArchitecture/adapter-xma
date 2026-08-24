#!/usr/bin/env node
/**
 * Scans available `.archimate` sources through `@cda/archi-semantic-core` and
 * reports every (relationship type, source Archi type, target Archi type)
 * triple that currently resolves to NO confirmed exact-triple mapping
 * (`src/mapping/relationship-mapping.ts`) and NO confirmed generic form
 * (`src/mapping/generic-relationship-mapping.ts`).
 *
 * This is the evidence-gathering tool behind
 * `docs/relationship-mapping-backlog.md`. It never modifies anything: it
 * reads model files, mirrors the resolution logic of
 * `src/serializer/relationship-writer.ts`, and prints findings to stdout.
 *
 * Usage (from this repository root):
 *
 *   node scripts/scan-relationship-backlog.mjs [path ...]
 *
 * Default paths when none are given: `../private-examples` and
 * `./tests/fixtures` (the private local corpus plus the committed fixtures).
 * Compressed (zip-format) `.archimate` files are detected via the `PK`
 * magic and skipped with a notice — extract `model.xml` from them first if
 * you need their data.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArchiModel } from '@cda/archi-semantic-core';
import { lookupRelationshipMapping } from '../dist/esm/mapping/relationship-mapping.js';
import { lookupGenericRelationshipMapping } from '../dist/esm/mapping/generic-relationship-mapping.js';
import {
  lookupElementMapping,
  ELEMENT_MAPPINGS,
} from '../dist/esm/mapping/element-mapping.js';

const XMA_NAME_BY_ARCHI_TYPE = new Map(
  ELEMENT_MAPPINGS.map((e) => [e.archiType, e.xmaType]),
);

// Naming convention observed across every confirmed entry so far. Used ONLY
// for the unconfirmed "expected tag" hypothesis column in the backlog doc.
const VERB_SUFFIX = {
  ServingRelationship: 'Use',
  AssignmentRelationship: 'Assignment',
  RealizationRelationship: 'Realisation',
  FlowRelationship: 'Flow',
  TriggeringRelationship: 'Triggering',
  AccessRelationship: 'Access',
  CompositionRelationship: 'Composition',
  AggregationRelationship: 'Aggregation',
  SpecializationRelationship: 'Specialization',
  InfluenceRelationship: 'Influence',
};

/**
 * Junction/OrJunction have no ELEMENT_MAPPINGS entry — the serializer gives
 * them a dedicated mapping in semantic-writer.ts (scheme 'root') — so they
 * must count as mapped endpoints here, mirroring relationship-writer.ts.
 */
function isMappedElementType(archiType) {
  return archiType === 'Junction' || lookupElementMapping(archiType) !== undefined;
}

function collectArchimateFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...collectArchimateFiles(p));
    else if (name.name.toLowerCase().endsWith('.archimate')) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const roots =
  args.length > 0 ? args : ['../private-examples', './tests/fixtures'];
const files = roots.flatMap((r) => collectArchimateFiles(r)).sort();

const unmapped = new Map();
const dangling = [];
let scannedFiles = 0;
let skippedZip = 0;
let totalRels = 0;

function record(key, init, fileId) {
  let entry = unmapped.get(key);
  if (!entry) {
    entry = { ...init, total: 0, files: new Set() };
    unmapped.set(key, entry);
  }
  entry.total += 1;
  entry.files.add(fileId);
}

for (const file of files) {
  const raw = readFileSync(file);
  // .archimate can be plain XML or a zip archive (PK magic).
  if (raw.length > 2 && raw[0] === 0x50 && raw[1] === 0x4b) {
    console.error(`SKIP (compressed .archimate; extract its model.xml): ${file}`);
    skippedZip += 1;
    continue;
  }
  let model;
  try {
    model = parseArchiModel(raw.toString('utf8'));
  } catch (e) {
    console.error(`PARSE FAILED: ${file}: ${e.message}`);
    continue;
  }
  scannedFiles += 1;
  const elementIndex = new Map(model.elements.map((el) => [el.id, el]));

  for (const rel of model.relationships) {
    totalRels += 1;
    const src = elementIndex.get(rel.sourceId);
    const tgt = elementIndex.get(rel.targetId);
    // Mirror relationship-writer.ts: dangling refs and endpoint elements with
    // no element mapping produce different diagnostics — not backlog rows.
    if (!src || !tgt) {
      dangling.push(`${rel.type} (${rel.id}) in ${file}`);
      continue;
    }
    if (!isMappedElementType(src.type) || !isMappedElementType(tgt.type)) {
      continue;
    }
    if (
      lookupRelationshipMapping(rel.type, src.type, tgt.type) !== undefined ||
      lookupGenericRelationshipMapping(rel.type, src.type, tgt.type) !== undefined
    ) {
      continue;
    }
    const expected =
      `${XMA_NAME_BY_ARCHI_TYPE.get(src.type)}` +
      `${XMA_NAME_BY_ARCHI_TYPE.get(tgt.type)}` +
      `${VERB_SUFFIX[rel.type] ?? '???'}`;
    record(`${rel.type}|${src.type}|${tgt.type}`, {
      type: rel.type,
      source: src.type,
      target: tgt.type,
      expected,
    }, file.replace(/\\/g, '/'));
  }
}

const rows = [...unmapped.values()].sort((a, b) => b.total - a.total);

console.log(JSON.stringify(
  {
    scannedFiles,
    skippedCompressedFiles: skippedZip,
    totalRelationshipsScanned: totalRels,
    distinctUnmappedTriples: rows.length,
    unmappedInstances: rows.reduce((s, r) => s + r.total, 0),
    danglingReferences: dangling.length,
  },
  null,
  2,
));
console.log('=== UNMAPPED TRIPLES (type|source|target) ===');
for (const r of rows) {
  console.log(
    `${r.total}\t${r.files.size}\t${r.type} | ${r.source} -> ${r.target}\texpected: ${r.expected}`,
  );
}
