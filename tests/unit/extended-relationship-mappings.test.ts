import { describe, expect, it } from 'vitest';
import { serializeXma } from '../../src/index.js';
import { lookupGenericRelationshipMapping } from '../../src/mapping/generic-relationship-mapping.js';
import { lookupRelationshipMapping } from '../../src/mapping/relationship-mapping.js';
import { makeElement, makeModel, makeRelationship } from '../helpers/model-builder.js';

/**
 * These are deliberately minimal synthetic models covering the extended XMA
 * relationship metamodel forms. No source-model names, ids or content are
 * part of this test.
 */
const EXACT_CASES = [
  ['AggregationRelationship', 'ApplicationComponent', 'ApplicationComponent', 'ApplicationComponentApplicationComponentAggregation'],
  ['AggregationRelationship', 'DataObject', 'DataObject', 'ApplicationDataObjectApplicationDataObjectAggregation'],
  ['AggregationRelationship', 'Node', 'Node', 'TechnologyNodeTechnologyNodeAggregation'],
  ['AssignmentRelationship', 'ApplicationComponent', 'ApplicationProcess', 'ApplicationComponentApplicationProcessAssignment'],
  ['AssignmentRelationship', 'Node', 'Node', 'TechnologyNodeTechnologyNodeAssignment'],
  ['AssignmentRelationship', 'Node', 'TechnologyService', 'TechnologyNodeTechnologyServiceAssignment'],
  ['AccessRelationship', 'ApplicationProcess', 'DataObject', 'ApplicationProcessApplicationDataObjectAccess'],
  ['AccessRelationship', 'Node', 'Artifact', 'TechnologyNodeTechnologyArtifactAccess'],
  ['CompositionRelationship', 'BusinessInteraction', 'BusinessProcess', 'BusinessInteractionBusinessProcessComposition'],
  ['CompositionRelationship', 'Location', 'ApplicationComponent', 'CompositeLocationApplicationComponentComposition'],
  ['CompositionRelationship', 'Location', 'ApplicationInterface', 'CompositeLocationApplicationInterfaceComposition'],
  ['CompositionRelationship', 'Location', 'DataObject', 'CompositeLocationApplicationDataObjectComposition'],
  ['CompositionRelationship', 'Location', 'Grouping', 'CompositeLocationGroupingComposition'],
  ['FlowRelationship', 'ApplicationProcess', 'ApplicationProcess', 'ApplicationProcessApplicationProcessFlow'],
  ['FlowRelationship', 'ApplicationComponent', 'ApplicationComponent', 'ApplicationComponentApplicationComponentFlow'],
  ['FlowRelationship', 'ApplicationComponent', 'ApplicationInterface', 'ApplicationComponentApplicationInterfaceFlow'],
  ['FlowRelationship', 'Node', 'CommunicationNetwork', 'TechnologyNodeTechnologyCommunicationNetworkFlow'],
  ['FlowRelationship', 'CommunicationNetwork', 'Node', 'TechnologyCommunicationNetworkTechnologyNodeFlow'],
  ['RealizationRelationship', 'BusinessProcess', 'ValueStream', 'BusinessProcessStrategyValueStreamRealisation'],
  ['RealizationRelationship', 'Node', 'TechnologyService', 'TechnologyNodeTechnologyServiceRealisation'],
  ['ServingRelationship', 'ApplicationFunction', 'ApplicationComponent', 'ApplicationFunctionApplicationComponentUse'],
  ['ServingRelationship', 'ApplicationInterface', 'ApplicationProcess', 'ApplicationInterfaceApplicationProcessUse'],
  ['ServingRelationship', 'ApplicationInterface', 'BusinessProcess', 'ApplicationInterfaceBusinessProcessUse'],
  ['ServingRelationship', 'TechnologyService', 'Location', 'TechnologyServiceCompositeLocationUse'],
  ['ServingRelationship', 'ApplicationService', 'ApplicationFunction', 'ApplicationServiceApplicationFunctionUse'],
  ['TriggeringRelationship', 'ApplicationComponent', 'ApplicationProcess', 'ApplicationComponentApplicationProcessTriggering'],
  ['TriggeringRelationship', 'ApplicationProcess', 'ApplicationComponent', 'ApplicationProcessApplicationComponentTriggering'],
  // Backlog round-trip confirmations (see docs/relationship-mapping-backlog.md)
  ['RealizationRelationship', 'ApplicationFunction', 'ApplicationService', 'ApplicationFunctionApplicationServiceRealisation'],
  // SystemSoftware collapses to TechnologyNode for relationship naming
  ['CompositionRelationship', 'Location', 'SystemSoftware', 'CompositeLocationTechnologyNodeComposition'],
  ['ServingRelationship', 'ApplicationService', 'ApplicationService', 'ApplicationServiceApplicationServiceUse'],
  ['TriggeringRelationship', 'ApplicationComponent', 'ApplicationComponent', 'ApplicationComponentApplicationComponentTriggering'],
  ['ServingRelationship', 'TechnologyService', 'ApplicationInterface', 'TechnologyServiceApplicationInterfaceUse'],
  ['ServingRelationship', 'ApplicationComponent', 'ApplicationService', 'ApplicationComponentApplicationServiceUse'],
  ['RealizationRelationship', 'ApplicationComponent', 'BusinessService', 'ApplicationComponentBusinessServiceRealisation'],
  ['CompositionRelationship', 'ApplicationService', 'ApplicationService', 'ApplicationServiceApplicationServiceComposition'],
  ['ServingRelationship', 'BusinessService', 'ApplicationService', 'BusinessServiceApplicationServiceUse'],
  ['TriggeringRelationship', 'ApplicationService', 'ApplicationComponent', 'ApplicationServiceApplicationComponentTriggering'],
  ['SpecializationRelationship', 'ApplicationInterface', 'ApplicationInterface', 'ApplicationInterfaceApplicationInterfaceSpecialization'],
  ['ServingRelationship', 'ApplicationService', 'ApplicationProcess', 'ApplicationServiceApplicationProcessUse'],
  ['RealizationRelationship', 'ApplicationInterface', 'BusinessInterface', 'ApplicationInterfaceBusinessInterfaceRealisation'],
  ['TriggeringRelationship', 'TechnologyService', 'ApplicationComponent', 'TechnologyServiceApplicationComponentTriggering'],
  ['CompositionRelationship', 'Node', 'Node', 'TechnologyNodeTechnologyNodeComposition'],
  ['ServingRelationship', 'ApplicationService', 'ApplicationComponent', 'ApplicationServiceApplicationComponentUse'],
  ['TriggeringRelationship', 'ApplicationInterface', 'ApplicationComponent', 'ApplicationInterfaceApplicationComponentTriggering'],
  ['TriggeringRelationship', 'ApplicationService', 'ApplicationProcess', 'ApplicationServiceApplicationProcessTriggering'],
  ['RealizationRelationship', 'ApplicationService', 'BusinessService', 'ApplicationServiceBusinessServiceRealisation'],
  ['AccessRelationship', 'Node', 'DataObject', 'TechnologyNodeApplicationDataObjectAccess'],
  ['FlowRelationship', 'ApplicationInterface', 'ApplicationInterface', 'ApplicationInterfaceApplicationInterfaceFlow'],
  ['ServingRelationship', 'ApplicationService', 'BusinessInterface', 'ApplicationServiceBusinessInterfaceUse'],
  ['TriggeringRelationship', 'ApplicationService', 'ApplicationInterface', 'ApplicationServiceApplicationInterfaceTriggering'],
] as const;

describe('extended relationship mappings', () => {
  it.each(EXACT_CASES)('serializes %s %s -> %s as %s', (relationshipType, sourceType, targetType, xmaType) => {
    expect(lookupRelationshipMapping(relationshipType, sourceType, targetType)?.xmaType).toBe(xmaType);
    const source = makeElement({ id: 'source', type: sourceType });
    const target = makeElement({ id: 'target', type: targetType });
    const relationship = makeRelationship({ id: 'relationship', type: relationshipType, sourceId: source.id, targetId: target.id });
    expect(serializeXma(makeModel({ elements: [source, target], relationships: [relationship] }))).toContain(`ArchiMate:${xmaType}`);
  });

  it('supports the ElementGroupingTriggering generic form', () => {
    expect(lookupGenericRelationshipMapping('TriggeringRelationship', 'Grouping', 'BusinessProcess')?.xmaType).toBe('GroupingElementTriggering');
    expect(lookupGenericRelationshipMapping('TriggeringRelationship', 'BusinessProcess', 'Grouping')?.xmaType).toBe('ElementGroupingTriggering');
  });

  it('supports the AccessRelation generic form for Junction endpoints in both directions', () => {
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'ApplicationComponent', 'Junction')?.xmaType).toBe('AccessRelation');
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'Junction', 'DataObject')?.xmaType).toBe('AccessRelation');
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'ApplicationInterface', 'Junction')?.xmaType).toBe('AccessRelation');
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'ApplicationService', 'Junction')?.xmaType).toBe('AccessRelation');
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'ApplicationFunction', 'Junction')?.xmaType).toBe('AccessRelation');
  });

  it('supports the GroupingElementAssignment generic form', () => {
    expect(lookupGenericRelationshipMapping('AssignmentRelationship', 'Grouping', 'ApplicationService')?.xmaType).toBe('GroupingElementAssignment');
    expect(lookupGenericRelationshipMapping('AssignmentRelationship', 'ApplicationComponent', 'Grouping')?.xmaType).toBe('ElementGroupingAssignment');
  });

  it('supports the GroupingGroupingTriggering generic form', () => {
    expect(lookupGenericRelationshipMapping('TriggeringRelationship', 'Grouping', 'Grouping')?.xmaType).toBe('GroupingGroupingTriggering');
  });
});
