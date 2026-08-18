import { describe, expect, it } from 'vitest';
import { lookupRelationshipMapping } from '../../src/mapping/relationship-mapping.js';

describe('relationship-mapping', () => {
  it('maps AssignmentRelationship BusinessActor -> BusinessProcess', () => {
    const mapping = lookupRelationshipMapping('AssignmentRelationship', 'BusinessActor', 'BusinessProcess');
    expect(mapping).toMatchObject({
      xmaType: 'BusinessActorBusinessProcessAssignment',
      scheme: 'BusinessScheme',
    });
  });

  it('maps ServingRelationship ApplicationService -> BusinessProcess to "...Use", not "...Serving"', () => {
    const mapping = lookupRelationshipMapping('ServingRelationship', 'ApplicationService', 'BusinessProcess');
    expect(mapping?.xmaType).toBe('ApplicationServiceBusinessProcessUse');
    expect(mapping?.xmaType).not.toContain('Serving');
    expect(mapping?.scheme).toBe('ApplicationScheme');
  });

  it('maps FlowRelationship BusinessProcess -> BusinessProcess', () => {
    const mapping = lookupRelationshipMapping('FlowRelationship', 'BusinessProcess', 'BusinessProcess');
    expect(mapping).toMatchObject({
      xmaType: 'BusinessProcessBusinessProcessFlow',
      scheme: 'BusinessScheme',
    });
  });

  it('resolves by the full (type, source, target) triple, not by relationship type alone', () => {
    // Same relationship type, unconfirmed source/target combination -> unsupported.
    expect(lookupRelationshipMapping('AssignmentRelationship', 'BusinessRole', 'BusinessProcess')).toBeUndefined();
    expect(lookupRelationshipMapping('ServingRelationship', 'ApplicationComponent', 'BusinessProcess')).toBeUndefined();
    expect(lookupRelationshipMapping('FlowRelationship', 'ApplicationProcess', 'ApplicationProcess')).toBeUndefined();
  });

  it('returns undefined for entirely unconfirmed relationship types', () => {
    expect(lookupRelationshipMapping('RealizationRelationship', 'ApplicationComponent', 'ApplicationService')).toBeUndefined();
  });
});
