import type { ArchiModel, ArchiElement, ArchiRelationship } from '@cda/archi-semantic-core';
import { element } from '../infrastructure/xml-writer.js';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import type { XmaIdRegistry } from '../infrastructure/id-allocator.js';
import type { DiagnosticCollector } from '../diagnostics/diagnostics.js';
import { lookupRelationshipMapping } from '../mapping/relationship-mapping.js';
import { lookupGenericRelationshipMapping } from '../mapping/generic-relationship-mapping.js';
import type { ElementMappingEntry } from '../mapping/element-mapping.js';
import type { SchemeBuild } from './semantic-writer.js';

/** What downstream (view-writer, graphical-writer) actually needs from a resolved relationship mapping. */
export interface ResolvedRelationshipMapping {
  xmaType: string;
}

function getOrCreateScheme(schemeBuilds: Map<string, SchemeBuild>, tag: string): SchemeBuild {
  let build = schemeBuilds.get(tag);
  if (!build) {
    build = { tag, collections: new Map(), relations: [] };
    schemeBuilds.set(tag, build);
  }
  return build;
}

export interface SemanticRelationshipsResult {
  mappedRelationships: Map<string, ResolvedRelationshipMapping>;
  /**
   * Generic-form relations (`AssociationRelationship`, or a `Grouping`/`Junction`
   * endpoint) — these live in a root-level `<ArchiMate:Relations>` container
   * (a sibling of `AbstractSchemes`), never inside a layer scheme. Confirmed
   * directly in both fixtures; see `mapping/generic-relationship-mapping.ts`.
   */
  rootRelationsXml: XmlElement[];
}

/**
 * Builds the semantic `<ArchiMate:{RelationshipType} from="..." to="..."/>`
 * elements for every `ArchiRelationship` that resolves either to a confirmed
 * exact-triple mapping (appended to its scheme's `Relations` collection) or
 * a confirmed generic form (appended to the root-level `Relations`
 * container). Everything else is diagnosed, never guessed — see
 * `mapping/relationship-mapping.ts` and `mapping/generic-relationship-mapping.ts`.
 */
export function buildSemanticRelationships(
  model: ArchiModel,
  ids: XmaIdRegistry,
  elementIndex: ReadonlyMap<string, ArchiElement>,
  relationshipIndex: ReadonlyMap<string, ArchiRelationship>,
  mappedElements: ReadonlyMap<string, ElementMappingEntry>,
  schemeBuilds: Map<string, SchemeBuild>,
  diagnostics: DiagnosticCollector,
): SemanticRelationshipsResult {
  const mappedRelationships = new Map<string, ResolvedRelationshipMapping>();
  const rootRelationsXml: XmlElement[] = [];

  for (const rel of model.relationships) {
    const sourceEl = elementIndex.get(rel.sourceId);
    const targetEl = elementIndex.get(rel.targetId);

    if (!sourceEl || !targetEl) {
      const endpointIsRelationship =
        (!sourceEl && relationshipIndex.has(rel.sourceId)) || (!targetEl && relationshipIndex.has(rel.targetId));
      diagnostics.error({
        code: endpointIsRelationship ? 'unsupported-relationship-endpoint' : 'dangling-relationship-reference',
        message: endpointIsRelationship
          ? `Relationship "${rel.type}" (${rel.id}) has another relationship as an endpoint — relationship-to-relationship endpoints are not supported in XMA v0.1.`
          : `Relationship "${rel.type}" (${rel.id}) references a source/target id not found among the model's elements.`,
        entityId: rel.id,
        entityType: 'ArchiRelationship',
      });
      continue;
    }

    if (!mappedElements.has(sourceEl.id) || !mappedElements.has(targetEl.id)) {
      // The endpoint element itself already produced an unsupported-element-type
      // diagnostic; this is the knock-on effect on the relationship.
      diagnostics.error({
        code: 'unsupported-relationship-endpoint-type',
        message: `Relationship "${rel.type}" (${rel.id}) has an endpoint whose element type has no XMA mapping.`,
        entityId: rel.id,
        entityType: 'ArchiRelationship',
      });
      continue;
    }

    const exactMapping = lookupRelationshipMapping(rel.type, sourceEl.type, targetEl.type);
    const genericMapping = exactMapping ? undefined : lookupGenericRelationshipMapping(rel.type, sourceEl.type, targetEl.type);
    const mapping: ResolvedRelationshipMapping | undefined = exactMapping ?? genericMapping;
    if (!mapping) {
      diagnostics.error({
        code: 'unsupported-relationship',
        message: `Relationship "${rel.type}" from ${sourceEl.type} to ${targetEl.type} has no confirmed XMA mapping.`,
        entityId: rel.id,
        entityType: 'ArchiRelationship',
      });
      continue;
    }

    if (rel.properties.length > 0) {
      diagnostics.warning({
        code: 'unsupported-properties',
        message: `Relationship "${rel.name ?? rel.id}" has ${rel.properties.length} propert${rel.properties.length === 1 ? 'y' : 'ies'} not represented in XMA v0.1.`,
        entityId: rel.id,
        entityType: 'ArchiRelationship',
      });
    }
    if (rel.profiles.length > 0) {
      diagnostics.warning({
        code: 'unsupported-profile',
        message: `Relationship "${rel.name ?? rel.id}" references ${rel.profiles.length} profile(s)/specialization(s) not represented in XMA v0.1.`,
        entityId: rel.id,
        entityType: 'ArchiRelationship',
      });
    }

    mappedRelationships.set(rel.id, mapping);

    const xmaId = ids.idFor(rel.id);
    const relationXml = element(`ArchiMate:${mapping.xmaType}`, [
      ['id', String(xmaId)],
      ['from', String(ids.idFor(sourceEl.id))],
      ['to', String(ids.idFor(targetEl.id))],
    ]);

    if (exactMapping) {
      const scheme = getOrCreateScheme(schemeBuilds, exactMapping.scheme);
      scheme.relations.push(relationXml);
    } else {
      rootRelationsXml.push(relationXml);
    }
  }

  return { mappedRelationships, rootRelationsXml };
}
