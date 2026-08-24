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
 * independent reference export; cross-referenced by element name between the
 * source `.archimate` and its BizzDesign-generated `.xma` re-export, same
 * method as every other entry here, just not backed by a fixture pair in
 * this repo), and `AccessRelationship` (`AccessRelation` — five instances
 * across all four endpoint orderings/type pairings of the backlog round-trip
 * model, four with the junction as target and one with it as source; the
 * junction-sourced instance sat in the root-level Relations container, the
 * others in the source element's own scheme, matching the placement rule).
 * Not extended to other verbs without evidence for that specific verb — a
 * relationship type absent from this set is still reported unsupported.
 */
const JUNCTION_CONFIRMED_VERBS = new Set(['Realisation', 'Influence', 'Use', 'Access']);

/**
 * Verbs confirmed to produce the `{Grouping|Element}{Grouping|Element}{Verb}`
 * generic form when *exactly one* endpoint is a `Grouping` (the other a
 * regular element): `CompositionRelationship`, `SpecializationRelationship`,
 * `InfluenceRelationship`, `ServingRelationship` (sabsa + agile-manifesto),
 * `RealizationRelationship` (`ElementGroupingRealisation` — two independent
 * confirmed instances), `AccessRelationship` (`ElementGroupingAccess` —
 * one confirmed instance), `TriggeringRelationship` (`ElementGroupingTriggering` —
 * repeated in an independent reference export), and `AssignmentRelationship`
 * (`GroupingElementAssignment` — backlog round-trip, Grouping sourced).
 * The last four came from independent
 * models; same cross-reference method as every other entry here, just not
 * backed by a fixture pair in this repo. Same "no evidence, no guess" rule
 * as Junction above.
 */
const GROUPING_ELEMENT_CONFIRMED_VERBS = new Set(['Composition', 'Specialization', 'Influence', 'Use', 'Realisation', 'Access', 'Triggering', 'Assignment']);

/**
 * Verbs confirmed for the *both-endpoints-Grouping* case specifically —
 * deliberately a separate, independently-confirmed set from the
 * mixed-endpoint one above (the two endpoint shapes are never assumed to
 * share evidence, even for the same verb — see `Composition` below).
 * `Use` and `Influence` confirmed in `sabsa.xma`
 * (`GroupingGroupingUse`/`GroupingGroupingInfluence`); `Specialization`,
 * `Realisation`, and `Access` confirmed via a dedicated, isolated
 * Enterprise Studio round-trip (3 separate Grouping/Grouping pairs, one
 * verb each); `Triggering` confirmed via the backlog round-trip model —
 * all six follow the plain `GroupingGrouping{Verb}` form.
 */
const GROUPING_GROUPING_CONFIRMED_VERBS = new Set(['Use', 'Influence', 'Specialization', 'Realisation', 'Access', 'Triggering']);

/**
 * `CompositionRelationship` is the one exception: even with both endpoints
 * `Grouping`, it does NOT produce `GroupingGroupingComposition` — a real
 * round-trip against an independent reference model proved that tag doesn't exist
 * (Enterprise Studio rejected the whole document, "could not generate the
 * object: unknown type"). A second, dedicated, isolated round-trip (two
 * `CompositeGrouping` elements connected by `Composition`, cross-checked in
 * both the semantic `<ArchiMate:Relations>` entry and the graphical
 * `MM_DirectedRel`'s `mm_concept`) confirmed the real, asymmetric form:
 * `GroupingElementComposition` — the target side is always labeled
 * `Element` for this verb specifically, regardless of its actual type.
 */
const GROUPING_GROUPING_COMPOSITION_XMA_TYPE = 'GroupingElementComposition';

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
  if (sourceIsGrouping && targetIsGrouping) {
    if (verb === 'Composition') {
      return { xmaType: GROUPING_GROUPING_COMPOSITION_XMA_TYPE };
    }
    if (GROUPING_GROUPING_CONFIRMED_VERBS.has(verb)) {
      return { xmaType: `GroupingGrouping${verb}` };
    }
    return undefined;
  }
  if ((sourceIsGrouping || targetIsGrouping) && GROUPING_ELEMENT_CONFIRMED_VERBS.has(verb)) {
    const sourcePart = sourceIsGrouping ? 'Grouping' : 'Element';
    const targetPart = targetIsGrouping ? 'Grouping' : 'Element';
    return { xmaType: `${sourcePart}${targetPart}${verb}` };
  }

  return undefined;
}
