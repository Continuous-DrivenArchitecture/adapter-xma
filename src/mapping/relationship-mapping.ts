/**
 * Archi relationship mapping, resolved by (relationship type, source
 * semantic type, target semantic type) — never by relationship type alone.
 *
 * 67 mappings are proven: the original 3 confirmed against
 * `tests/fixtures/relationships/relaciones.{archimate,xma}`, plus 64 more
 * confirmed against `tests/fixtures/sabsa/sabsa.{archimate,xma}` (see that
 * fixture pair's entry in `tests/fixtures/README.md` for the full derivation
 * method and the open questions it also surfaced). Every other relationship
 * type/source/target combination is unsupported for v0.1 and must be
 * diagnosed, never guessed (see `serializer/relationship-writer.ts`).
 *
 * `scheme` is always the scheme of the *source* type (confirmed even across
 * schemes, e.g. `WorkPackage -> BusinessFunction` lives in `IMScheme`, the
 * source's scheme, not `BusinessScheme`).
 *
 * NOT modeled here — confirmed to exist, but needs a different mechanism
 * than this exact-triple table (see `tests/fixtures/README.md`):
 *   - `AssociationRelationship` always serializes as the generic
 *     `ElementElementAssociation`, regardless of source/target type.
 *   - Any relationship with a `Grouping` or `Junction` endpoint uses a
 *     generic form (e.g. `GroupingElementComposition`, `RealisationRelation`)
 *     instead of a type-specific one.
 *   - A handful of concrete types collapse to a coarser XMA "category" only
 *     for relationship naming (not for their own element mapping) — e.g. a
 *     `TechnologyCollaboration` endpoint produces a `TechnologyNode`-prefixed
 *     relationship type. Confirmed instances: `SystemSoftware` and
 *     `TechnologyCollaboration` both collapse to `TechnologyNode`;
 *     `Constraint` collapses to `MotivationRequirement`.
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
