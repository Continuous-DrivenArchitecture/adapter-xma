/**
 * Archi element type -> XMA semantic type/scheme/collection mapping.
 *
 * Directly confirmed against `tests/fixtures/catalog/catalogo.{archimate,xma}`
 * (60 ArchiMate concept types, one view) and cross-checked against
 * `tests/fixtures/relationships/relaciones.{archimate,xma}`. Every field
 * below (scheme tag, collection tag/name, fill category, icon presence) was
 * read directly off those reference files — nothing here is extrapolated
 * beyond what both fixtures show.
 *
 * This is immutable mapping DATA, looked up by Archi type — never a
 * switch/if-chain.
 */

export type PresentationCategory =
  | 'Strategy'
  | 'Business'
  | 'Application'
  | 'Technology'
  | 'Physical'
  | 'Motivation'
  | 'ImplementationMigration'
  | 'Location'
  | 'Grouping';

export interface ElementMappingEntry {
  archiType: string;
  xmaType: string;
  scheme: string;
  collectionTag: string;
  collectionName: string;
  category: PresentationCategory;
  hasIcon: boolean;
}

/** `ArchiElement.type` -> mapping entry. Elements not present here are unsupported for v0.1. */
export const ELEMENT_MAPPINGS: readonly ElementMappingEntry[] = [
  // Strategy
  { archiType: 'Resource', xmaType: 'StrategyResource', scheme: 'StrategyScheme', collectionTag: 'StrategyResources', collectionName: 'resources', category: 'Strategy', hasIcon: true },
  { archiType: 'Capability', xmaType: 'StrategyCapability', scheme: 'StrategyScheme', collectionTag: 'StrategyCapabilities', collectionName: 'capabilities', category: 'Strategy', hasIcon: true },
  { archiType: 'ValueStream', xmaType: 'StrategyValueStream', scheme: 'StrategyScheme', collectionTag: 'StrategyValueStreams', collectionName: 'streams', category: 'Strategy', hasIcon: true },
  { archiType: 'CourseOfAction', xmaType: 'StrategyCourseOfAction', scheme: 'StrategyScheme', collectionTag: 'StrategyCoursesOfAction', collectionName: 'courses', category: 'Strategy', hasIcon: true },

  // Business
  { archiType: 'BusinessActor', xmaType: 'BusinessActor', scheme: 'BusinessScheme', collectionTag: 'BusinessActors', collectionName: 'actors', category: 'Business', hasIcon: true },
  { archiType: 'BusinessRole', xmaType: 'BusinessRole', scheme: 'BusinessScheme', collectionTag: 'BusinessRoles', collectionName: 'roles', category: 'Business', hasIcon: true },
  { archiType: 'BusinessCollaboration', xmaType: 'BusinessCollaboration', scheme: 'BusinessScheme', collectionTag: 'BusinessRoles', collectionName: 'roles', category: 'Business', hasIcon: true },
  { archiType: 'BusinessInterface', xmaType: 'BusinessInterface', scheme: 'BusinessScheme', collectionTag: 'BusinessInterfaces', collectionName: 'interfaces', category: 'Business', hasIcon: true },
  { archiType: 'BusinessProcess', xmaType: 'BusinessProcess', scheme: 'BusinessScheme', collectionTag: 'BusinessProcesses', collectionName: 'processes', category: 'Business', hasIcon: true },
  { archiType: 'BusinessFunction', xmaType: 'BusinessFunction', scheme: 'BusinessScheme', collectionTag: 'BusinessFunctions', collectionName: 'functions', category: 'Business', hasIcon: true },
  { archiType: 'BusinessInteraction', xmaType: 'BusinessInteraction', scheme: 'BusinessScheme', collectionTag: 'BusinessInteractions', collectionName: 'interactions', category: 'Business', hasIcon: true },
  { archiType: 'BusinessEvent', xmaType: 'BusinessEvent', scheme: 'BusinessScheme', collectionTag: 'BusinessEvents', collectionName: 'events', category: 'Business', hasIcon: false },
  { archiType: 'BusinessService', xmaType: 'BusinessService', scheme: 'BusinessScheme', collectionTag: 'BusinessServices', collectionName: 'services', category: 'Business', hasIcon: false },
  { archiType: 'BusinessObject', xmaType: 'BusinessObject', scheme: 'BusinessScheme', collectionTag: 'BusinessObjects', collectionName: 'objects', category: 'Business', hasIcon: false },
  { archiType: 'Contract', xmaType: 'BusinessContract', scheme: 'BusinessScheme', collectionTag: 'BusinessObjects', collectionName: 'objects', category: 'Business', hasIcon: false },
  { archiType: 'Representation', xmaType: 'BusinessRepresentation', scheme: 'BusinessScheme', collectionTag: 'BusinessRepresentations', collectionName: 'representations', category: 'Business', hasIcon: false },
  { archiType: 'Product', xmaType: 'BusinessProduct', scheme: 'BusinessScheme', collectionTag: 'BusinessProducts', collectionName: 'products', category: 'Business', hasIcon: false },

  // Application
  { archiType: 'ApplicationComponent', xmaType: 'ApplicationComponent', scheme: 'ApplicationScheme', collectionTag: 'ApplicationComponents', collectionName: 'components', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationCollaboration', xmaType: 'ApplicationCollaboration', scheme: 'ApplicationScheme', collectionTag: 'ApplicationComponents', collectionName: 'components', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationInterface', xmaType: 'ApplicationInterface', scheme: 'ApplicationScheme', collectionTag: 'ApplicationInterfaces', collectionName: 'interfaces', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationFunction', xmaType: 'ApplicationFunction', scheme: 'ApplicationScheme', collectionTag: 'ApplicationFunctions', collectionName: 'functions', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationInteraction', xmaType: 'ApplicationInteraction', scheme: 'ApplicationScheme', collectionTag: 'ApplicationInteractions', collectionName: 'interactions', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationProcess', xmaType: 'ApplicationProcess', scheme: 'ApplicationScheme', collectionTag: 'ApplicationProcesses', collectionName: 'processes', category: 'Application', hasIcon: true },
  { archiType: 'ApplicationEvent', xmaType: 'ApplicationEvent', scheme: 'ApplicationScheme', collectionTag: 'ApplicationEvents', collectionName: 'events', category: 'Application', hasIcon: false },
  { archiType: 'ApplicationService', xmaType: 'ApplicationService', scheme: 'ApplicationScheme', collectionTag: 'ApplicationServices', collectionName: 'services', category: 'Application', hasIcon: false },
  { archiType: 'DataObject', xmaType: 'ApplicationDataObject', scheme: 'ApplicationScheme', collectionTag: 'ApplicationDataObjects', collectionName: 'dataObjects', category: 'Application', hasIcon: false },

  // Technology
  { archiType: 'Node', xmaType: 'TechnologyNode', scheme: 'TechnologyScheme', collectionTag: 'TechnologyNodes', collectionName: 'nodes', category: 'Technology', hasIcon: false },
  { archiType: 'Device', xmaType: 'TechnologyDevice', scheme: 'TechnologyScheme', collectionTag: 'TechnologyNodes', collectionName: 'nodes', category: 'Technology', hasIcon: false },
  { archiType: 'SystemSoftware', xmaType: 'TechnologySystemSoftware', scheme: 'TechnologyScheme', collectionTag: 'TechnologyNodes', collectionName: 'nodes', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyCollaboration', xmaType: 'TechnologyCollaboration', scheme: 'TechnologyScheme', collectionTag: 'TechnologyNodes', collectionName: 'nodes', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyInterface', xmaType: 'TechnologyInterface', scheme: 'TechnologyScheme', collectionTag: 'TechnologyInterfaces', collectionName: 'interfaces', category: 'Technology', hasIcon: true },
  { archiType: 'Path', xmaType: 'TechnologyPath', scheme: 'TechnologyScheme', collectionTag: 'TechnologyPaths', collectionName: 'paths', category: 'Technology', hasIcon: true },
  { archiType: 'CommunicationNetwork', xmaType: 'TechnologyCommunicationNetwork', scheme: 'TechnologyScheme', collectionTag: 'TechnologyCommunicationNetworks', collectionName: 'networks', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyFunction', xmaType: 'TechnologyFunction', scheme: 'TechnologyScheme', collectionTag: 'TechnologyFunctions', collectionName: 'functions', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyProcess', xmaType: 'TechnologyProcess', scheme: 'TechnologyScheme', collectionTag: 'TechnologyProcesses', collectionName: 'processes', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyInteraction', xmaType: 'TechnologyInteraction', scheme: 'TechnologyScheme', collectionTag: 'TechnologyInteractions', collectionName: 'interactions', category: 'Technology', hasIcon: true },
  { archiType: 'TechnologyEvent', xmaType: 'TechnologyEvent', scheme: 'TechnologyScheme', collectionTag: 'TechnologyEvents', collectionName: 'events', category: 'Technology', hasIcon: false },
  { archiType: 'TechnologyService', xmaType: 'TechnologyService', scheme: 'TechnologyScheme', collectionTag: 'TechnologyServices', collectionName: 'services', category: 'Technology', hasIcon: false },
  { archiType: 'Artifact', xmaType: 'TechnologyArtifact', scheme: 'TechnologyScheme', collectionTag: 'TechnologyArtifacts', collectionName: 'artifacts', category: 'Technology', hasIcon: false },

  // Physical
  { archiType: 'Equipment', xmaType: 'PhysicalEquipment', scheme: 'PhysicalScheme', collectionTag: 'PhysicalEquipments', collectionName: 'equipments', category: 'Physical', hasIcon: true },
  { archiType: 'Facility', xmaType: 'PhysicalFacility', scheme: 'PhysicalScheme', collectionTag: 'PhysicalFacilities', collectionName: 'facilities', category: 'Physical', hasIcon: true },
  { archiType: 'DistributionNetwork', xmaType: 'PhysicalDistributionNetwork', scheme: 'PhysicalScheme', collectionTag: 'PhysicalDistributionNetworks', collectionName: 'networks', category: 'Physical', hasIcon: true },
  { archiType: 'Material', xmaType: 'PhysicalMaterial', scheme: 'PhysicalScheme', collectionTag: 'PhysicalMaterials', collectionName: 'materials', category: 'Physical', hasIcon: true },

  // Motivation
  { archiType: 'Stakeholder', xmaType: 'MotivationStakeholder', scheme: 'MotivationScheme', collectionTag: 'MotivationStakeholders', collectionName: 'stakeholders', category: 'Motivation', hasIcon: true },
  { archiType: 'Driver', xmaType: 'MotivationDriver', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Assessment', xmaType: 'MotivationAssessment', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Goal', xmaType: 'MotivationGoal', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Outcome', xmaType: 'MotivationOutcome', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Principle', xmaType: 'MotivationPrinciple', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Requirement', xmaType: 'MotivationRequirement', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Constraint', xmaType: 'MotivationConstraint', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: true },
  { archiType: 'Meaning', xmaType: 'MotivationMeaning', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: false },
  { archiType: 'Value', xmaType: 'MotivationValue', scheme: 'MotivationScheme', collectionTag: 'MotivationElements', collectionName: 'motivations', category: 'Motivation', hasIcon: false },

  // Implementation & Migration
  { archiType: 'WorkPackage', xmaType: 'IMWorkpackage', scheme: 'IMScheme', collectionTag: 'IMWorkpackages', collectionName: 'workpackages', category: 'ImplementationMigration', hasIcon: true },
  { archiType: 'Deliverable', xmaType: 'IMDeliverable', scheme: 'IMScheme', collectionTag: 'IMDeliverables', collectionName: 'deliverables', category: 'ImplementationMigration', hasIcon: false },
  { archiType: 'ImplementationEvent', xmaType: 'IMImplementationEvent', scheme: 'IMScheme', collectionTag: 'IMImplementationEvents', collectionName: 'events', category: 'ImplementationMigration', hasIcon: false },
  { archiType: 'Gap', xmaType: 'IMGap', scheme: 'IMScheme', collectionTag: 'IMGaps', collectionName: 'gaps', category: 'ImplementationMigration', hasIcon: true },
  { archiType: 'Plateau', xmaType: 'IMPlateau', scheme: 'IMScheme', collectionTag: 'IMPlateaus', collectionName: 'plateaus', category: 'ImplementationMigration', hasIcon: true },

  // Composite
  { archiType: 'Location', xmaType: 'CompositeLocation', scheme: 'CompositeScheme', collectionTag: 'CompositeLocations', collectionName: 'locations', category: 'Location', hasIcon: true },
  { archiType: 'Grouping', xmaType: 'CompositeGrouping', scheme: 'CompositeScheme', collectionTag: 'CompositeGroupings', collectionName: 'groupings', category: 'Grouping', hasIcon: false },
];

const BY_ARCHI_TYPE = new Map(ELEMENT_MAPPINGS.map((entry) => [entry.archiType, entry]));

export function lookupElementMapping(archiType: string): ElementMappingEntry | undefined {
  return BY_ARCHI_TYPE.get(archiType);
}

/**
 * For a given scheme tag, the ordered, de-duplicated list of collections it
 * can contain — declaration order in {@link ELEMENT_MAPPINGS}, independent of
 * input model traversal order, so output collection order never depends on
 * which element happens to appear first in the source `.archimate` file.
 */
const SCHEME_COLLECTION_ORDER: ReadonlyMap<string, Array<{ tag: string; name: string }>> = (() => {
  const bySchemeTag = new Map<string, Array<{ tag: string; name: string }>>();
  for (const entry of ELEMENT_MAPPINGS) {
    let collections = bySchemeTag.get(entry.scheme);
    if (!collections) {
      collections = [];
      bySchemeTag.set(entry.scheme, collections);
    }
    if (!collections.some((c) => c.tag === entry.collectionTag)) {
      collections.push({ tag: entry.collectionTag, name: entry.collectionName });
    }
  }
  return bySchemeTag;
})();

export function getSchemeCollectionOrder(schemeTag: string): ReadonlyArray<{ tag: string; name: string }> {
  return SCHEME_COLLECTION_ORDER.get(schemeTag) ?? [];
}
