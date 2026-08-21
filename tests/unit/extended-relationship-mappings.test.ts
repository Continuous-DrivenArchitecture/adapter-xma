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
});
