import type { ArchiModel, ArchiElement } from '@cda/archi-semantic-core';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element } from '../infrastructure/xml-writer.js';
import type { XmaIdRegistry } from '../infrastructure/id-allocator.js';
import type { DiagnosticCollector } from '../diagnostics/diagnostics.js';
import { getSchemeCollectionOrder, lookupElementMapping, type ElementMappingEntry } from '../mapping/element-mapping.js';
import { buildProfileValues } from './profile-values.js';

export interface SchemeBuild {
  tag: string;
  /** Ordered per {@link getSchemeCollectionOrder}; only collections that received at least one element are populated. */
  collections: Map<string, { name: string; children: XmlElement[] }>;
  /** `<ArchiMate:Relations name="relations">` children — filled in by `relationship-writer`. */
  relations: XmlElement[];
}

export interface SemanticBuildResult {
  schemeBuilds: Map<string, SchemeBuild>;
  /** Archi element id -> its resolved mapping, for elements that mapped successfully (feeds view/graphical writers). */
  mappedElements: Map<string, ElementMappingEntry>;
  /**
   * `<ArchiMate:Junction>`/`<ArchiMate:OrJunction>` elements — these live in a
   * root-level `<ArchiMate:Connectors>` container (a sibling of
   * `AbstractSchemes` under `ArchiMateComponent`), never inside a layer
   * scheme's element collections. Confirmed directly in both fixtures; see
   * `tests/fixtures/README.md`.
   */
  rootConnectorsXml: XmlElement[];
}

/**
 * `ArchiElement.type` is always the literal string `"Junction"` for both
 * AND and OR junctions — the And/Or distinction lives in the separate
 * `junctionType` field. Confirmed directly in both fixtures: XMA has two
 * distinct element tags for this, `Junction` (AND) and `OrJunction` (OR),
 * each living in the root `Connectors` container. This resolves the XMA tag
 * for a Junction element; unlike every other type, it can't be a static
 * `ELEMENT_MAPPINGS` table entry keyed by `archiType` alone.
 */
function junctionXmaType(el: ArchiElement): 'Junction' | 'OrJunction' {
  return el.junctionType === 'Or' ? 'OrJunction' : 'Junction';
}

/**
 * `archi-semantic-core` already defaults an unrecognized native junction
 * `type` attribute to `'And'` rather than guessing (see its `junctionType`
 * doc comment) — but it also preserves the original value verbatim in
 * `rawJunctionType` specifically so a downstream consumer can tell "really
 * absent/empty, the documented default" apart from "an unrecognized value
 * that got silently defaulted". This reports the latter as a warning
 * instead of drawing an `And` Junction with no indication anything was
 * guessed.
 */
function reportUnrecognizedJunctionType(el: ArchiElement, diagnostics: DiagnosticCollector): void {
  if (el.junctionType !== 'And') return;
  const raw = el.rawJunctionType ?? '';
  if (raw === '' || raw === 'or') return;
  diagnostics.warning({
    code: 'unrecognized-junction-type',
    message: `Junction "${el.name ?? el.id}" has an unrecognized native type value ("${raw}") — treated as AND (Archi's documented default for an unrecognized value), not necessarily what was intended.`,
    entityId: el.id,
    entityType: 'ArchiElement',
  });
}

/**
 * A `Junction`'s own `category`/`hasIcon` are never read: `graphical-writer`
 * draws Junctions via a dedicated, colorless node form (confirmed in both
 * fixtures — no `MM_Color`/`MM_Colors`, `mm_graphicType="3"` instead of the
 * usual `"5"`) before ever consulting `CATEGORY_FILL_COLOR`. `category`
 * still needs *some* valid value to satisfy `ElementMappingEntry`'s type;
 * `'Grouping'` is used as an inert placeholder, not a claim about Junction's
 * real presentation category.
 */
function junctionMappingEntry(el: ArchiElement): ElementMappingEntry {
  const xmaType = junctionXmaType(el);
  return {
    archiType: 'Junction',
    xmaType,
    scheme: 'root',
    collectionTag: 'Connectors',
    collectionName: 'connectors',
    category: 'Grouping',
    hasIcon: false,
  };
}

function getOrCreateScheme(schemeBuilds: Map<string, SchemeBuild>, tag: string): SchemeBuild {
  let build = schemeBuilds.get(tag);
  if (!build) {
    build = { tag, collections: new Map(), relations: [] };
    schemeBuilds.set(tag, build);
  }
  return build;
}

function reportUnsupportedElement(element: ArchiElement, diagnostics: DiagnosticCollector): void {
  diagnostics.error({
    code: 'unsupported-element-type',
    message: `Archi element type "${element.type}" has no confirmed XMA mapping and would be silently lost.`,
    entityId: element.id,
    entityType: 'ArchiElement',
  });
}

function reportAncillaryLossWarnings(el: ArchiElement, diagnostics: DiagnosticCollector): void {
  if (el.profiles.length > 0) {
    diagnostics.warning({
      code: 'unsupported-profile',
      message: `Element "${el.name ?? el.id}" references ${el.profiles.length} profile(s)/specialization(s) not represented in XMA v0.1.`,
      entityId: el.id,
      entityType: 'ArchiElement',
    });
  }
}

/**
 * Builds the per-scheme element collections (`<ArchiMate:BusinessActors>`
 * etc.) for every `ArchiElement` in the model, regardless of whether it
 * appears in the (single supported) view — semantic elements are model-wide,
 * not view-scoped.
 */
export function buildSemanticElements(
  model: ArchiModel,
  ids: XmaIdRegistry,
  diagnostics: DiagnosticCollector,
  language: string,
): SemanticBuildResult {
  const schemeBuilds = new Map<string, SchemeBuild>();
  const mappedElements = new Map<string, ElementMappingEntry>();
  const rootConnectorsXml: XmlElement[] = [];

  for (const el of model.elements) {
    if (el.type === 'Junction') {
      const mapping = junctionMappingEntry(el);
      mappedElements.set(el.id, mapping);
      reportAncillaryLossWarnings(el, diagnostics);
      reportUnrecognizedJunctionType(el, diagnostics);
      const xmaId = ids.idFor(el.id);
      rootConnectorsXml.push(
        element(`ArchiMate:${mapping.xmaType}`, [['id', String(xmaId)]], [
          buildProfileValues(language, el.name ?? '', el.documentation),
        ]),
      );
      continue;
    }

    const mapping = lookupElementMapping(el.type);
    if (!mapping) {
      reportUnsupportedElement(el, diagnostics);
      continue;
    }
    mappedElements.set(el.id, mapping);
    reportAncillaryLossWarnings(el, diagnostics);

    const scheme = getOrCreateScheme(schemeBuilds, mapping.scheme);
    let collection = scheme.collections.get(mapping.collectionTag);
    if (!collection) {
      collection = { name: mapping.collectionName, children: [] };
      scheme.collections.set(mapping.collectionTag, collection);
    }

    const xmaId = ids.idFor(el.id);
    const concept = element(
      `ArchiMate:${mapping.xmaType}`,
      [['id', String(xmaId)]],
      [buildProfileValues(language, el.name ?? '', el.documentation, el.properties)],
    );
    collection.children.push(concept);
  }

  return { schemeBuilds, mappedElements, rootConnectorsXml };
}

/**
 * Renders a `SchemeBuild`'s children (an optional `nm` profile, then each
 * populated collection in confirmed order, then `Relations` last) — the
 * caller wraps these in the actual `<ArchiMate:{schemeTag} id="...">`
 * element, since only the caller (`document-writer`) knows the scheme's
 * allocated id.
 *
 * Every collection element (including `Relations`) carries its own `id` —
 * confirmed against the real fixture (e.g. `ApplicationComponents id="222"`,
 * `Relations id="72"`), unlike a bare element concept which doesn't need one
 * beyond its own. Previously omitted here; Enterprise Studio rejected the
 * resulting document outright ("could not generate the object: unknown
 * type") rather than merely losing content.
 */
export function renderSchemeChildren(build: SchemeBuild, nameProfile: XmlElement | null, ids: XmaIdRegistry): XmlElement[] {
  const children: XmlElement[] = [];
  if (nameProfile) {
    children.push(nameProfile);
  }
  for (const { tag, name } of getSchemeCollectionOrder(build.tag)) {
    const collection = build.collections.get(tag);
    if (!collection || collection.children.length === 0) {
      continue;
    }
    children.push(element(`ArchiMate:${tag}`, [['name', name], ['id', String(ids.fresh())]], collection.children));
  }
  if (build.relations.length > 0) {
    children.push(element('ArchiMate:Relations', [['name', 'relations'], ['id', String(ids.fresh())]], build.relations));
  }
  return children;
}
