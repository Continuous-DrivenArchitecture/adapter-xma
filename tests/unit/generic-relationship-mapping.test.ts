import { describe, expect, it } from 'vitest';
import { lookupGenericRelationshipMapping } from '../../src/mapping/generic-relationship-mapping.js';

/**
 * Regression coverage for a real correctness bug: `lookupGenericRelationshipMapping`
 * used to apply the mixed-endpoint (Grouping + regular element) confirmed-verb
 * set to the both-endpoints-Grouping case too, producing `GroupingGroupingComposition`
 * — a tag with zero fixture evidence. Enterprise Studio rejected a real private
 * model outright on import for it ("could not generate the object: unknown
 * type"), reported against a real generated file. The two endpoint shapes are
 * now tracked with separate confirmed-verb sets; see generic-relationship-mapping.ts.
 */
describe('generic-relationship-mapping: Grouping endpoints', () => {
  it('confirmed: both endpoints Grouping, Use -> GroupingGroupingUse (sabsa.xma)', () => {
    expect(lookupGenericRelationshipMapping('ServingRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingUse',
    });
  });

  it('confirmed: both endpoints Grouping, Influence -> GroupingGroupingInfluence (sabsa.xma)', () => {
    expect(lookupGenericRelationshipMapping('InfluenceRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingInfluence',
    });
  });

  it('NOT confirmed: both endpoints Grouping, Composition -> unsupported, not guessed as GroupingGroupingComposition', () => {
    expect(lookupGenericRelationshipMapping('CompositionRelationship', 'Grouping', 'Grouping')).toBeUndefined();
  });

  it('NOT confirmed: both endpoints Grouping, Specialization/Realisation/Access -> unsupported', () => {
    expect(lookupGenericRelationshipMapping('SpecializationRelationship', 'Grouping', 'Grouping')).toBeUndefined();
    expect(lookupGenericRelationshipMapping('RealizationRelationship', 'Grouping', 'Grouping')).toBeUndefined();
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'Grouping', 'Grouping')).toBeUndefined();
  });

  it('unaffected: exactly one endpoint Grouping, Composition -> still GroupingElementComposition / ElementGroupingComposition', () => {
    expect(lookupGenericRelationshipMapping('CompositionRelationship', 'Grouping', 'BusinessActor')).toEqual({
      xmaType: 'GroupingElementComposition',
    });
    expect(lookupGenericRelationshipMapping('CompositionRelationship', 'BusinessActor', 'Grouping')).toEqual({
      xmaType: 'ElementGroupingComposition',
    });
  });
});
