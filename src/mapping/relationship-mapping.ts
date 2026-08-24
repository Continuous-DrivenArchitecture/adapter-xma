/**
 * Archi relationship mapping, resolved by (relationship type, source
 * semantic type, target semantic type) — never by relationship type alone.
 *
 * 170 exact-triple mappings are proven: the original 3 confirmed against
 * `tests/fixtures/relationships/relaciones.{archimate,xma}`, 64 more
 * confirmed against `tests/fixtures/sabsa/sabsa.{archimate,xma}`, 20 more
 * confirmed against `tests/fixtures/agile-manifesto/agile-manifesto.{archimate,xma}`,
 * 3 confirmed "...Collaboration collapses to its singular active-structure
 * counterpart" instances (see below), 23 more confirmed from an independent
 * reference export, 2 more confirmed from single dedicated Serving
 * round-trips (ApplicationComponent/ApplicationInterface and
 * ApplicationFunction/ApplicationComponent — see the comments on those
 * blocks, near the end of this file, for the evidence method), 7 more
 * confirmed by sabsa.archimate -> sabsa.xma semantic id tracing, 21 more
 * from a second independent reference export, and 23 more confirmed via a
 * dedicated backlog round-trip model (one Archi-authored .archimate holding
 * all 31 then-pending triples in a single view, imported into BizzDesign
 * Enterprise Studio and exported to XMA; every relation was matched by its
 * unique T-tag element names — see `docs/relationship-mapping-backlog.md`
 * for the full record) — see each source's entry in
 * `tests/fixtures/README.md` for the derivation methods. Every other
 * relationship type/source/target combination is unsupported for v0.1 and
 * must be diagnosed, never guessed (see
 * `serializer/relationship-writer.ts`).
 *
 * `scheme` is always the scheme of the *source* type (confirmed even across
 * schemes, e.g. `WorkPackage -> BusinessFunction` lives in `IMScheme`, the
 * source's scheme, not `BusinessScheme`).
 *
 * Three "...Collaboration" entries collapse to their singular active-structure
 * counterpart for relationship naming only (their own element mapping is
 * unaffected — see `element-mapping.ts`): `BusinessCollaboration` collapses
 * to `BusinessRole`, `TechnologyCollaboration` collapses to `TechnologyNode`.
 * Verified directly against raw relation instances in both fixtures, not
 * inferred.
 *
 * NOT modeled here as exact triples — genuinely type-independent, so they
 * live in `generic-relationship-mapping.ts` instead:
 *   - `AssociationRelationship` always serializes as the generic
 *     `ElementElementAssociation`, regardless of source/target type.
 *   - A `Grouping` endpoint (for the confirmed verbs Composition,
 *     Specialization, Influence, Use, Realisation, Access) or a `Junction`/
 *     `OrJunction` endpoint (for the confirmed verbs Realisation, Influence,
 *     Use) uses a generic form (e.g. `GroupingElementComposition`,
 *     `RealisationRelation`) instead of a type-specific one.
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

  // StrategyScheme
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'Capability',
    targetArchiType: 'ValueStream',
    xmaType: 'StrategyCapabilityStrategyValueStreamUse',
    scheme: 'StrategyScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ValueStream',
    targetArchiType: 'ValueStream',
    xmaType: 'StrategyValueStreamStrategyValueStreamComposition',
    scheme: 'StrategyScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ValueStream',
    targetArchiType: 'ValueStream',
    xmaType: 'StrategyValueStreamStrategyValueStreamFlow',
    scheme: 'StrategyScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ValueStream',
    targetArchiType: 'CourseOfAction',
    xmaType: 'StrategyValueStreamStrategyCourseOfActionFlow',
    scheme: 'StrategyScheme',
  },

  // BusinessScheme
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessFunction',
    xmaType: 'BusinessProcessBusinessFunctionComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessProcessBusinessProcessComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessRole',
    xmaType: 'BusinessActorBusinessRoleAssignment',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'BusinessRole',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessRoleBusinessProcessAssignment',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'Representation',
    xmaType: 'BusinessProcessBusinessRepresentationAccess',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessObject',
    xmaType: 'BusinessProcessBusinessObjectAccess',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'BusinessRole',
    targetArchiType: 'BusinessRole',
    xmaType: 'BusinessRoleBusinessRoleComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'BusinessEvent',
    targetArchiType: 'BusinessEvent',
    xmaType: 'BusinessEventBusinessEventTriggering',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'BusinessRole',
    targetArchiType: 'BusinessRole',
    xmaType: 'BusinessRoleBusinessRoleSpecialization',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'BusinessEvent',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessEventBusinessProcessTriggering',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessActor',
    xmaType: 'BusinessActorBusinessActorSpecialization',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessEvent',
    xmaType: 'BusinessProcessBusinessEventTriggering',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'Capability',
    xmaType: 'BusinessProcessStrategyCapabilityRealisation',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Representation',
    targetArchiType: 'Requirement',
    xmaType: 'BusinessRepresentationMotivationRequirementRealisation',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessActor',
    xmaType: 'BusinessActorBusinessActorComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Representation',
    targetArchiType: 'Representation',
    xmaType: 'BusinessRepresentationBusinessRepresentationComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessEvent',
    xmaType: 'BusinessActorBusinessEventAssignment',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'BusinessEvent',
    targetArchiType: 'Assessment',
    xmaType: 'BusinessEventMotivationAssessmentInfluence',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'BusinessService',
    targetArchiType: 'Assessment',
    xmaType: 'BusinessServiceMotivationAssessmentInfluence',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'BusinessService',
    targetArchiType: 'Requirement',
    xmaType: 'BusinessServiceMotivationRequirementRealisation',
    scheme: 'BusinessScheme',
  },

  // ApplicationScheme
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationComponentApplicationServiceRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationFunctionApplicationDataObjectAccess',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationComponentApplicationFunctionAssignment',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'DataObject',
    targetArchiType: 'BusinessObject',
    xmaType: 'ApplicationDataObjectBusinessObjectRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'BusinessProcess',
    xmaType: 'ApplicationFunctionBusinessProcessUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessRole',
    xmaType: 'ApplicationComponentBusinessRoleUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationServiceApplicationDataObjectAccess',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'DataObject',
    targetArchiType: 'Requirement',
    xmaType: 'ApplicationDataObjectMotivationRequirementRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationComponentApplicationComponentComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationComponentApplicationComponentUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'Assessment',
    xmaType: 'ApplicationServiceMotivationAssessmentInfluence',
    scheme: 'ApplicationScheme',
  },

  // TechnologyScheme
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'TechnologyServiceApplicationComponentUse',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'Requirement',
    xmaType: 'TechnologyServiceMotivationRequirementRealisation',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'Artifact',
    xmaType: 'TechnologyServiceTechnologyArtifactAccess',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'Artifact',
    xmaType: 'TechnologyNodeTechnologyArtifactAssignment',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Artifact',
    targetArchiType: 'DataObject',
    xmaType: 'TechnologyArtifactApplicationDataObjectRealisation',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'Assessment',
    xmaType: 'TechnologyServiceMotivationAssessmentInfluence',
    scheme: 'TechnologyScheme',
  },

  // PhysicalScheme
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Facility',
    targetArchiType: 'Facility',
    xmaType: 'PhysicalFacilityPhysicalFacilityComposition',
    scheme: 'PhysicalScheme',
  },

  // MotivationScheme
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Principle',
    xmaType: 'MotivationPrincipleMotivationPrincipleSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Principle',
    xmaType: 'MotivationPrincipleMotivationPrincipleInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Goal',
    xmaType: 'MotivationRequirementMotivationGoalRealisation',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Value',
    targetArchiType: 'Value',
    xmaType: 'MotivationValueMotivationValueComposition',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Principle',
    xmaType: 'MotivationRequirementMotivationPrincipleRealisation',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Goal',
    targetArchiType: 'Principle',
    xmaType: 'MotivationGoalMotivationPrincipleInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Assessment',
    targetArchiType: 'Assessment',
    xmaType: 'MotivationAssessmentMotivationAssessmentSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Outcome',
    targetArchiType: 'Outcome',
    xmaType: 'MotivationOutcomeMotivationOutcomeSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Goal',
    xmaType: 'MotivationPrincipleMotivationGoalRealisation',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Value',
    targetArchiType: 'Value',
    xmaType: 'MotivationValueMotivationValueSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Goal',
    targetArchiType: 'Goal',
    xmaType: 'MotivationGoalMotivationGoalSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationRequirementMotivationRequirementComposition',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Outcome',
    xmaType: 'MotivationRequirementMotivationOutcomeRealisation',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Outcome',
    xmaType: 'MotivationPrincipleMotivationOutcomeRealisation',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Assessment',
    targetArchiType: 'Assessment',
    xmaType: 'MotivationAssessmentMotivationAssessmentInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Assessment',
    targetArchiType: 'Goal',
    xmaType: 'MotivationAssessmentMotivationGoalInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Goal',
    targetArchiType: 'Assessment',
    xmaType: 'MotivationGoalMotivationAssessmentInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Outcome',
    targetArchiType: 'Goal',
    xmaType: 'MotivationOutcomeMotivationGoalRealisation',
    scheme: 'MotivationScheme',
  },

  // IMScheme
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'WorkPackage',
    targetArchiType: 'Deliverable',
    xmaType: 'IMWorkpackageIMDeliverableAccess',
    scheme: 'IMScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'WorkPackage',
    targetArchiType: 'BusinessFunction',
    xmaType: 'IMWorkpackageBusinessFunctionRealisation',
    scheme: 'IMScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'WorkPackage',
    targetArchiType: 'BusinessProcess',
    xmaType: 'IMWorkpackageBusinessProcessRealisation',
    scheme: 'IMScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Deliverable',
    targetArchiType: 'Deliverable',
    xmaType: 'IMDeliverableIMDeliverableComposition',
    scheme: 'IMScheme',
  },

  // From tests/fixtures/agile-manifesto/ (20 more, including the first confirmed
  // Driver-involving Influence/Specialization mappings)
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessInteraction',
    xmaType: 'ApplicationComponentBusinessInteractionUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'BusinessFunction',
    targetArchiType: 'BusinessFunction',
    xmaType: 'BusinessFunctionBusinessFunctionUse',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Deliverable',
    targetArchiType: 'BusinessProcess',
    xmaType: 'IMDeliverableBusinessProcessRealisation',
    scheme: 'IMScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Deliverable',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'IMDeliverableApplicationComponentRealisation',
    scheme: 'IMScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessProcess',
    xmaType: 'ApplicationComponentBusinessProcessRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessProcessBusinessProcessSpecialization',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'BusinessActor',
    targetArchiType: 'BusinessInteraction',
    xmaType: 'BusinessActorBusinessInteractionAssignment',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessInteraction',
    xmaType: 'ApplicationComponentBusinessInteractionRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessProcessBusinessProcessUse',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Driver',
    targetArchiType: 'Driver',
    xmaType: 'MotivationDriverMotivationDriverSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Driver',
    xmaType: 'MotivationPrincipleMotivationDriverInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Driver',
    targetArchiType: 'Driver',
    xmaType: 'MotivationDriverMotivationDriverInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Meaning',
    targetArchiType: 'Meaning',
    xmaType: 'MotivationMeaningMotivationMeaningSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Driver',
    xmaType: 'MotivationRequirementMotivationDriverInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationRequirementMotivationRequirementInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationPrincipleMotivationRequirementInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Assessment',
    targetArchiType: 'Driver',
    xmaType: 'MotivationAssessmentMotivationDriverInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Principle',
    targetArchiType: 'Assessment',
    xmaType: 'MotivationPrincipleMotivationAssessmentInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Driver',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationDriverMotivationRequirementInfluence',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'InfluenceRelationship',
    sourceArchiType: 'Assessment',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationAssessmentMotivationRequirementInfluence',
    scheme: 'MotivationScheme',
  },

  // Confirmed "...Collaboration collapses to its singular active-structure counterpart"
  // instances (BusinessCollaboration -> BusinessRole, TechnologyCollaboration ->
  // TechnologyNode) — these are still exact-triple entries keyed by the real Archi
  // type; only the xmaType value reflects the collapse. See tests/fixtures/README.md.
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'BusinessCollaboration',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessRoleBusinessProcessTriggering',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessCollaboration',
    xmaType: 'ApplicationComponentBusinessRoleUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'TechnologyCollaboration',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'TechnologyNodeApplicationComponentUse',
    scheme: 'TechnologyScheme',
  },

  // 21 more confirmed from an independent reference export. Not backed by
  // a fixture pair in this repo, but
  // derived by the same method as every other entry: cross-referencing the
  // original `.archimate` against a real `.xma` export, by element name,
  // skipping anything ambiguous or unmatched rather than guessing. The one
  // procedural difference: the `.xma` here came from Archi -> ArchiMate Open
  // Exchange Format -> BizzDesign import -> BizzDesign XMA export, not a
  // direct Archi-authored-and-BizzDesign-exported fixture — fine for
  // confirming semantic relationship tags (which don't depend on how the
  // model reached BizzDesign), but this round-trip does NOT preserve
  // reliable graphical fidelity (routing/bendpoints), so it was not used as
  // evidence for anything geometry-related.
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationComponentApplicationServiceAssignment',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationInterfaceApplicationServiceAssignment',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'SystemSoftware',
    targetArchiType: 'Artifact',
    xmaType: 'TechnologySystemSoftwareTechnologyArtifactAssignment',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'SystemSoftware',
    targetArchiType: 'TechnologyService',
    xmaType: 'TechnologyNodeTechnologyServiceAssignment',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationComponentApplicationInterfaceComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationFunctionApplicationFunctionComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationInterfaceApplicationInterfaceComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'DataObject',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationDataObjectApplicationDataObjectComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'SystemSoftware',
    xmaType: 'TechnologyNodeTechnologyNodeComposition',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationFunctionApplicationFunctionFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationServiceApplicationFunctionFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationComponentApplicationFunctionRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationComponentApplicationFunctionUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationFunctionApplicationFunctionUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationFunctionApplicationInterfaceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationInterfaceApplicationComponentUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationInterfaceApplicationFunctionUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationInterfaceApplicationInterfaceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationInterfaceApplicationServiceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationServiceApplicationInterfaceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationFunctionApplicationComponentTriggering',
    scheme: 'ApplicationScheme',
  },

  // 2 more from the same independent reference export as above —
  // found while investigating why AccessRelationship instances weren't
  // resolving even after the batch above: turned out to be a second,
  // independent gap (the missing accessType child — see
  // relationship-writer.ts's ACCESS_TYPE_XMA_CODE), fixed for every
  // AccessRelationship regardless of triple, which is what surfaced these
  // as name-matchable in the round-tripped .xma at all.
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationComponentApplicationDataObjectAccess',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationInterfaceApplicationDataObjectAccess',
    scheme: 'ApplicationScheme',
  },

  // Confirmed via a dedicated, isolated round-trip: a single ApplicationComponent
  // and ApplicationInterface connected by one Serving relationship, drawn
  // directly in BizzDesign Enterprise Studio and exported to XMA (not derived
  // from a larger model), so there's no ambiguity about which relationship
  // produced this tag. Follows the same "...Use" naming already established
  // for every other confirmed ServingRelationship entry above.
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationComponentApplicationInterfaceUse',
    scheme: 'ApplicationScheme',
  },

  // Same dedicated-round-trip evidence method as the entry above, added to
  // the same test file: found while re-checking the independent SBB fixtures
  // against the newly-added entry above — this was the one remaining
  // unconfirmed relationship triple across both.
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationFunctionApplicationComponentUse',
    scheme: 'ApplicationScheme',
  },

  // Additional exact triples confirmed by sabsa.archimate -> sabsa.xma
  // semantic id tracing. These entries capture XMA's established metamodel
  // collapses rather than inferring new generic relationship rules.
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'SystemSoftware',
    targetArchiType: 'SystemSoftware',
    xmaType: 'TechnologyNodeTechnologyNodeComposition',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'SystemSoftware',
    targetArchiType: 'TechnologyService',
    xmaType: 'TechnologyNodeTechnologyServiceRealisation',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'TechnologyService',
    xmaType: 'TechnologyNodeTechnologyServiceRealisation',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'Requirement',
    xmaType: 'ApplicationServiceMotivationRequirementRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'Constraint',
    xmaType: 'ApplicationServiceMotivationRequirementRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Requirement',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationRequirementMotivationRequirementSpecialization',
    scheme: 'MotivationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'Constraint',
    targetArchiType: 'Requirement',
    xmaType: 'MotivationRequirementMotivationRequirementSpecialization',
    scheme: 'MotivationScheme',
  },

  // Additional exact triples confirmed by an independent Bizzdesign XMA reference export.
  // The source model is not copied; only its repeated XMA metamodel forms are
  // represented here as public, type-specific mappings.
  {
    archiRelationshipType: 'AggregationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationComponentApplicationComponentAggregation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AggregationRelationship',
    sourceArchiType: 'DataObject',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationDataObjectApplicationDataObjectAggregation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AggregationRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'Node',
    xmaType: 'TechnologyNodeTechnologyNodeAggregation',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationComponentApplicationProcessAssignment',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'Node',
    xmaType: 'TechnologyNodeTechnologyNodeAssignment',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AssignmentRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'TechnologyService',
    xmaType: 'TechnologyNodeTechnologyServiceAssignment',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'ApplicationProcess',
    targetArchiType: 'DataObject',
    xmaType: 'ApplicationProcessApplicationDataObjectAccess',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'Artifact',
    xmaType: 'TechnologyNodeTechnologyArtifactAccess',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'BusinessInteraction',
    targetArchiType: 'BusinessProcess',
    xmaType: 'BusinessInteractionBusinessProcessComposition',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Location',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'CompositeLocationApplicationComponentComposition',
    scheme: 'CompositeScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Location',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'CompositeLocationApplicationInterfaceComposition',
    scheme: 'CompositeScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Location',
    targetArchiType: 'DataObject',
    xmaType: 'CompositeLocationApplicationDataObjectComposition',
    scheme: 'CompositeScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Location',
    targetArchiType: 'Grouping',
    xmaType: 'CompositeLocationGroupingComposition',
    scheme: 'CompositeScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationProcess',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationProcessApplicationProcessFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationComponentApplicationComponentFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationComponentApplicationInterfaceFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'CommunicationNetwork',
    xmaType: 'TechnologyNodeTechnologyCommunicationNetworkFlow',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'CommunicationNetwork',
    targetArchiType: 'Node',
    xmaType: 'TechnologyCommunicationNetworkTechnologyNodeFlow',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'BusinessProcess',
    targetArchiType: 'ValueStream',
    xmaType: 'BusinessProcessStrategyValueStreamRealisation',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationInterfaceApplicationProcessUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'BusinessProcess',
    xmaType: 'ApplicationInterfaceBusinessProcessUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'Location',
    xmaType: 'TechnologyServiceCompositeLocationUse',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationFunction',
    xmaType: 'ApplicationServiceApplicationFunctionUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationComponentApplicationProcessTriggering',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationProcess',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationProcessApplicationComponentTriggering',
    scheme: 'ApplicationScheme',
  },

  // 23 more confirmed via the dedicated backlog round-trip described in this
  // file's header (T01-T23 of `docs/relationship-mapping-backlog.md`): a
  // purpose-built Archi-authored .archimate holding exactly these triples in
  // one view, imported into BizzDesign Enterprise Studio and exported to
  // XMA. Every tag below is byte-verified against that export; every
  // relation sat in its source element's own scheme's Relations collection,
  // matching the established scheme rule.
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationFunction',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationFunctionApplicationServiceRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Location',
    targetArchiType: 'SystemSoftware',
    xmaType: 'CompositeLocationTechnologyNodeComposition',
    scheme: 'CompositeScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationServiceApplicationServiceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationComponentApplicationComponentTriggering',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'TechnologyServiceApplicationInterfaceUse',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationComponentApplicationServiceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationComponent',
    targetArchiType: 'BusinessService',
    xmaType: 'ApplicationComponentBusinessServiceRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationService',
    xmaType: 'ApplicationServiceApplicationServiceComposition',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'BusinessService',
    targetArchiType: 'ApplicationService',
    xmaType: 'BusinessServiceApplicationServiceUse',
    scheme: 'BusinessScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationServiceApplicationComponentTriggering',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'SpecializationRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationInterfaceApplicationInterfaceSpecialization',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationServiceApplicationProcessUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'BusinessInterface',
    xmaType: 'ApplicationInterfaceBusinessInterfaceRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'TechnologyService',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'TechnologyServiceApplicationComponentTriggering',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'CompositionRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'Node',
    xmaType: 'TechnologyNodeTechnologyNodeComposition',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationServiceApplicationComponentUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationComponent',
    xmaType: 'ApplicationInterfaceApplicationComponentTriggering',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationProcess',
    xmaType: 'ApplicationServiceApplicationProcessTriggering',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'RealizationRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'BusinessService',
    xmaType: 'ApplicationServiceBusinessServiceRealisation',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'AccessRelationship',
    sourceArchiType: 'Node',
    targetArchiType: 'DataObject',
    xmaType: 'TechnologyNodeApplicationDataObjectAccess',
    scheme: 'TechnologyScheme',
  },
  {
    archiRelationshipType: 'FlowRelationship',
    sourceArchiType: 'ApplicationInterface',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationInterfaceApplicationInterfaceFlow',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'ServingRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'BusinessInterface',
    xmaType: 'ApplicationServiceBusinessInterfaceUse',
    scheme: 'ApplicationScheme',
  },
  {
    archiRelationshipType: 'TriggeringRelationship',
    sourceArchiType: 'ApplicationService',
    targetArchiType: 'ApplicationInterface',
    xmaType: 'ApplicationServiceApplicationInterfaceTriggering',
    scheme: 'ApplicationScheme',
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
