/**
 * Generic (type-independent) relationship forms — confirmed to exist, but
 * structurally different from `relationship-mapping.ts`'s exact-triple
 * table: these apply *regardless* of the concrete source/target type, not
 * for one specific pair. See `tests/fixtures/README.md` for the full
 * derivation evidence.
 *
 * All three forms serialize into the root-level `<ArchiMate:Relations>`
 * container (a sibling of `AbstractSchemes` under `ArchiMateComponent`),
 * never inside a layer scheme — confirmed directly in both fixtures
 * (`sabsa.xma`, `agile-manifesto.xma`): every generic-form relation appears
 * there, never nested in `BusinessScheme`/`ApplicationScheme`/etc.
 */

/** Archi relationship type -> its confirmed "verb" suffix (see relationship-mapping.ts). */
const VERB_BY_ARCHI_TYPE: Readonly<Record<string, string>> = {
  AssignmentRelationship: 'Assignment',
  AccessRelationship: 'Access',
  RealizationRelationship: 'Realisation',
  FlowRelationship: 'Flow',
  TriggeringRelationship: 'Triggering',
  InfluenceRelationship: 'Influence',
  SpecializationRelationship: 'Specialization',
  CompositionRelationship: 'Composition',
  ServingRelationship: 'Use',
};

/**
 * Verbs confirmed (directly, not inferred) to produce the generic
 * `{Verb}Relation` form when a `Junction`/`OrJunction` is an endpoint:
 * `RealizationRelationship` (`RealisationRelation`, sabsa + agile-manifesto),
 * `InfluenceRelationship` (`InfluenceRelation`, agile-manifesto), and
 * `ServingRelationship` (`UseRelation` — a single confirmed instance from a
 * private, non-public model; cross-referenced by element name between the
 * source `.archimate` and its BizzDesign-generated `.xma` re-export, same
 * method as every other entry here, just not backed by a fixture pair in
 * this repo). Not extended to other verbs without evidence for that
 * specific verb — a relationship type absent from this set is still
 * reported unsupported.
 */
const JUNCTION_CONFIRMED_VERBS = new Set(['Realisation', 'Influence', 'Use']);

/**
 * Verbs confirmed to produce the `{Grouping|Element}{Grouping|Element}{Verb}`
 * generic form when a `Grouping` is an endpoint: `CompositionRelationship`,
 * `SpecializationRelationship`, `InfluenceRelationship`, `ServingRelationship`
 * (sabsa + agile-manifesto), `RealizationRelationship`
 * (`ElementGroupingRealisation` — two independent confirmed instances), and
 * `AccessRelationship` (`ElementGroupingAccess` — one confirmed instance).
 * The last two came from a private, non-public model; same cross-reference
 * method as every other entry here, just not backed by a fixture pair in
 * this repo. Same "no evidence, no guess" rule as Junction above.
 */
const GROUPING_CONFIRMED_VERBS = new Set(['Composition', 'Specialization', 'Influence', 'Use', 'Realisation', 'Access']);

export interface GenericRelationshipMapping {
  xmaType: string;
}

export function lookupGenericRelationshipMapping(
  archiRelationshipType: string,
  sourceArchiType: string,
  targetArchiType: string,
): GenericRelationshipMapping | undefined {
  // Confirmed universal: every AssociationRelationship instance across dozens of
  // distinct source/target type pairs (sabsa + agile-manifesto) serializes as this
  // one generic tag — never a type-specific one.
  if (archiRelationshipType === 'AssociationRelationship') {
    return { xmaType: 'ElementElementAssociation' };
  }

  const verb = VERB_BY_ARCHI_TYPE[archiRelationshipType];
  if (!verb) {
    return undefined;
  }

  const sourceIsJunction = sourceArchiType === 'Junction';
  const targetIsJunction = targetArchiType === 'Junction';
  if ((sourceIsJunction || targetIsJunction) && JUNCTION_CONFIRMED_VERBS.has(verb)) {
    return { xmaType: `${verb}Relation` };
  }

  const sourceIsGrouping = sourceArchiType === 'Grouping';
  const targetIsGrouping = targetArchiType === 'Grouping';
  if ((sourceIsGrouping || targetIsGrouping) && GROUPING_CONFIRMED_VERBS.has(verb)) {
    const sourcePart = sourceIsGrouping ? 'Grouping' : 'Element';
    const targetPart = targetIsGrouping ? 'Grouping' : 'Element';
    return { xmaType: `${sourcePart}${targetPart}${verb}` };
  }

  return undefined;
}
