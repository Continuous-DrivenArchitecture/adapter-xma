import { describe, expect, it } from 'vitest';
import { lookupRelationshipMapping } from '../../src/mapping/relationship-mapping.js';

/**
 * The 20 mappings confirmed against
 * tests/fixtures/agile-manifesto/agile-manifesto.{archimate,xma} (see
 * relationship-mapping.ts's docstring for provenance). These are also the
 * first confirmed mappings involving `Driver` as a relationship endpoint.
 */
describe('relationship-mapping (agile-manifesto-derived entries)', () => {
  it('maps ServingRelationship BusinessProcess -> BusinessProcess (self-serving)', () => {
    expect(lookupRelationshipMapping('ServingRelationship', 'BusinessProcess', 'BusinessProcess')).toMatchObject({
      xmaType: 'BusinessProcessBusinessProcessUse',
      scheme: 'BusinessScheme',
    });
  });

  it('maps SpecializationRelationship Driver -> Driver', () => {
    expect(lookupRelationshipMapping('SpecializationRelationship', 'Driver', 'Driver')).toMatchObject({
      xmaType: 'MotivationDriverMotivationDriverSpecialization',
      scheme: 'MotivationScheme',
    });
  });

  it('maps InfluenceRelationship Requirement -> Driver', () => {
    expect(lookupRelationshipMapping('InfluenceRelationship', 'Requirement', 'Driver')).toMatchObject({
      xmaType: 'MotivationRequirementMotivationDriverInfluence',
      scheme: 'MotivationScheme',
    });
  });

  it('maps RealizationRelationship Deliverable -> BusinessProcess (IMScheme)', () => {
    expect(lookupRelationshipMapping('RealizationRelationship', 'Deliverable', 'BusinessProcess')).toMatchObject({
      xmaType: 'IMDeliverableBusinessProcessRealisation',
      scheme: 'IMScheme',
    });
  });
});
