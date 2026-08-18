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
  if (el.properties.length > 0) {
    diagnostics.warning({
      code: 'unsupported-properties',
      message: `Element "${el.name ?? el.id}" has ${el.properties.length} propert${el.properties.length === 1 ? 'y' : 'ies'} not represented in XMA v0.1.`,
      entityId: el.id,
      entityType: 'ArchiElement',
    });
  }
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

  for (const el of model.elements) {
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
      [buildProfileValues(language, el.name ?? '', el.documentation)],
    );
    collection.children.push(concept);
  }

  return { schemeBuilds, mappedElements };
}

/**
 * Renders a `SchemeBuild`'s children (an optional `nm` profile, then each
 * populated collection in confirmed order, then `Relations` last) — the
 * caller wraps these in the actual `<ArchiMate:{schemeTag} id="...">`
 * element, since only the caller (`document-writer`) knows the scheme's
 * allocated id.
 */
export function renderSchemeChildren(build: SchemeBuild, nameProfile: XmlElement | null): XmlElement[] {
  const children: XmlElement[] = [];
  if (nameProfile) {
    children.push(nameProfile);
  }
  for (const { tag, name } of getSchemeCollectionOrder(build.tag)) {
    const collection = build.collections.get(tag);
    if (!collection || collection.children.length === 0) {
      continue;
    }
    children.push(element(`ArchiMate:${tag}`, [['name', name]], collection.children));
  }
  if (build.relations.length > 0) {
    children.push(element('ArchiMate:Relations', [['name', 'relations']], build.relations));
  }
  return children;
}
