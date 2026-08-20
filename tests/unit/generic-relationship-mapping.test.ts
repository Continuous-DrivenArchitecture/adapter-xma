import { describe, expect, it } from 'vitest';
import { lookupGenericRelationshipMapping } from '../../src/mapping/generic-relationship-mapping.js';

/**
 * Regression coverage for a real correctness bug, since fully resolved:
 * `lookupGenericRelationshipMapping` used to apply the mixed-endpoint
 * (Grouping + regular element) confirmed-verb set to the
 * both-endpoints-Grouping case too, producing `GroupingGroupingComposition`
 * — a tag with zero fixture evidence. Enterprise Studio rejected a real
 * private model outright on import for it ("could not generate the object:
 * unknown type"), reported against a real generated file.
 *
 * All six verbs are now independently confirmed for the
 * both-endpoints-Grouping case (Use/Influence via sabsa.xma;
 * Specialization/Realisation/Access via a dedicated, isolated Enterprise
 * Studio round-trip). `Composition` is the one asymmetric case — it never
 * produces `GroupingGroupingComposition`, always `GroupingElementComposition`
 * (target labeled `Element` regardless of its actual type) — confirmed the
 * same way. See generic-relationship-mapping.ts.
 */
describe('generic-relationship-mapping: Grouping endpoints', () => {
  it('both endpoints Grouping, Use -> GroupingGroupingUse (sabsa.xma)', () => {
    expect(lookupGenericRelationshipMapping('ServingRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingUse',
    });
  });

  it('both endpoints Grouping, Influence -> GroupingGroupingInfluence (sabsa.xma)', () => {
    expect(lookupGenericRelationshipMapping('InfluenceRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingInfluence',
    });
  });

  it('both endpoints Grouping, Specialization -> GroupingGroupingSpecialization', () => {
    expect(lookupGenericRelationshipMapping('SpecializationRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingSpecialization',
    });
  });

  it('both endpoints Grouping, Realization -> GroupingGroupingRealisation', () => {
    expect(lookupGenericRelationshipMapping('RealizationRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingRealisation',
    });
  });

  it('both endpoints Grouping, Access -> GroupingGroupingAccess', () => {
    expect(lookupGenericRelationshipMapping('AccessRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingGroupingAccess',
    });
  });

  it('both endpoints Grouping, Composition -> the asymmetric GroupingElementComposition, never GroupingGroupingComposition', () => {
    expect(lookupGenericRelationshipMapping('CompositionRelationship', 'Grouping', 'Grouping')).toEqual({
      xmaType: 'GroupingElementComposition',
    });
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
