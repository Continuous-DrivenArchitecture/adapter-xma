/**
 * Archi relationship mapping, resolved by (relationship type, source
 * semantic type, target semantic type) — never by relationship type alone.
 *
 * Only THREE mappings are proven, all confirmed directly against
 * `tests/fixtures/relationships/relaciones.{archimate,xma}`. Every other
 * relationship type/source/target combination is unsupported for v0.1 and
 * must be diagnosed, never guessed (see `serializer/relationship-writer.ts`).
 */

export interface RelationshipMappingEntry {
  archiRelationshipType: string;
  sourceArchiType: string;
  targetArchiType: string;
  /** XMA semantic relationship type, e.g. "BusinessActorBusinessProcessAssignment". */
  xmaType: string;
  /** Scheme the relationship's `<ArchiMate:Relations>` collection lives in, e.g. "BusinessScheme". */
  scheme: string;
}

export const RELATIONSHIP_MAPPINGS: readonly RelationshipMappingEntry[] = [
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessActorBusinessProcessAssignment',
    scheme: 'BusinessScheme',
  },
  {
    // Archi calls this a ServingRelationship; the XMA metamodel's own name for
    // it is "...Use", not "...Serving" — do not rename it back.
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'BusinessProcess',
    xmaType: 'ApplicationServiceBusinessProcessUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessProcessBusinessProcessFlow',
    scheme: 'BusinessScheme',
  },
];

function relationshipKey(relationshipType: string, sourceType: string, targetType: string): string {
  return `${relationshipType}|${sourceType}|${targetType}`;
}

const BY_KEY = new Map(
  RELATIONSHIP_MAPPINGS.map((entry) => [
    relationshipKey(entry.archiRelationshipType, entry.sourceArchiType, entry.targetArchiType),
    entry,
  ]),
);

export function lookupRelationshipMapping(
  relationshipType: string,
  sourceArchiType: string,
  targetArchiType: string,
): RelationshipMappingEntry | undefined {
  return BY_KEY.get(relationshipKey(relationshipType, sourceArchiType, targetArchiType));
}
