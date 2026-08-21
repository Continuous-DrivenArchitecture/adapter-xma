import { describe, expect, it } from 'vitest';
import { lookupRelationshipMapping, RELATIONSHIP_MAPPINGS } from '../../src/mapping/relationship-mapping.js';

/**
 * The 64 mappings confirmed against tests/fixtures/sabsa/sabsa.{archimate,xma}
 * (see relationship-mapping.ts's docstring for provenance). One representative
 * case per scheme, plus a self-consistency sweep over the whole table.
 */
describe('relationship-mapping (sabsa-derived entries)', () => {
  it('maps ServingRelationship Capability -> ValueStream (StrategyScheme)', () => {
    expect(lookupRelationshipMapping('ServingRelationship', 'Capability', 'ValueStream')).toMatchObject({
      xmaType: 'StrategyCapabilityStrategyValueStreamUse',
      scheme: 'StrategyScheme',
    });
  });

  it('maps AccessRelationship BusinessProcess -> BusinessObject (BusinessScheme)', () => {
    expect(lookupRelationshipMapping('AccessRelationship', 'BusinessProcess', 'BusinessObject')).toMatchObject({
      xmaType: 'BusinessProcessBusinessObjectAccess',
      scheme: 'BusinessScheme',
    });
  });

  it('maps RealizationRelationship ApplicationComponent -> ApplicationService (ApplicationScheme)', () => {
    expect(lookupRelationshipMapping('RealizationRelationship', 'ApplicationComponent', 'ApplicationService')).toMatchObject({
      xmaType: 'ApplicationComponentApplicationServiceRealisation',
      scheme: 'ApplicationScheme',
    });
  });

  it('maps AssignmentRelationship Node -> Artifact (TechnologyScheme)', () => {
    expect(lookupRelationshipMapping('AssignmentRelationship', 'Node', 'Artifact')).toMatchObject({
      xmaType: 'TechnologyNodeTechnologyArtifactAssignment',
      scheme: 'TechnologyScheme',
    });
  });

  it('maps CompositionRelationship Facility -> Facility (PhysicalScheme)', () => {
    expect(lookupRelationshipMapping('CompositionRelationship', 'Facility', 'Facility')).toMatchObject({
      xmaType: 'PhysicalFacilityPhysicalFacilityComposition',
      scheme: 'PhysicalScheme',
    });
  });

  it('maps SpecializationRelationship Principle -> Principle (MotivationScheme)', () => {
    expect(lookupRelationshipMapping('SpecializationRelationship', 'Principle', 'Principle')).toMatchObject({
      xmaType: 'MotivationPrincipleMotivationPrincipleSpecialization',
      scheme: 'MotivationScheme',
    });
  });

  it('maps RealizationRelationship WorkPackage -> BusinessFunction, in IMScheme (the source\'s scheme even though the target is BusinessScheme)', () => {
    expect(lookupRelationshipMapping('RealizationRelationship', 'WorkPackage', 'BusinessFunction')).toMatchObject({
      xmaType: 'IMWorkpackageBusinessFunctionRealisation',
      scheme: 'IMScheme',
    });
  });

  it('maps SABSA-confirmed SystemSoftware endpoint collapses', () => {
    expect(lookupRelationshipMapping('CompositionRelationship', 'SystemSoftware', 'SystemSoftware')).toMatchObject({
      xmaType: 'TechnologyNodeTechnologyNodeComposition',
      scheme: 'TechnologyScheme',
    });
    expect(lookupRelationshipMapping('RealizationRelationship', 'SystemSoftware', 'TechnologyService')).toMatchObject({
      xmaType: 'TechnologyNodeTechnologyServiceRealisation',
      scheme: 'TechnologyScheme',
    });
  });

  it('maps SABSA-confirmed Motivation endpoint collapses', () => {
    expect(lookupRelationshipMapping('RealizationRelationship', 'ApplicationService', 'Requirement')).toMatchObject({
      xmaType: 'ApplicationServiceMotivationRequirementRealisation',
      scheme: 'ApplicationScheme',
    });
    expect(lookupRelationshipMapping('RealizationRelationship', 'ApplicationService', 'Constraint')).toMatchObject({
      xmaType: 'ApplicationServiceMotivationRequirementRealisation',
      scheme: 'ApplicationScheme',
    });
    expect(lookupRelationshipMapping('SpecializationRelationship', 'Requirement', 'Requirement')).toMatchObject({
      xmaType: 'MotivationRequirementMotivationRequirementSpecialization',
      scheme: 'MotivationScheme',
    });
    expect(lookupRelationshipMapping('SpecializationRelationship', 'Constraint', 'Requirement')).toMatchObject({
      xmaType: 'MotivationRequirementMotivationRequirementSpecialization',
      scheme: 'MotivationScheme',
    });
  });

  it('uses the British "Realisation" spelling, not "Realization", for every RealizationRelationship mapping', () => {
    const realizations = RELATIONSHIP_MAPPINGS.filter((m) => m.archiRelationshipType === 'RealizationRelationship');
    expect(realizations.length).toBeGreaterThan(0);
    for (const m of realizations) {
      expect(m.xmaType.endsWith('Realisation')).toBe(true);
    }
  });

  it('every table entry is self-resolvable by its own (type, source, target) key with no duplicates', () => {
    const seen = new Set<string>();
    for (const entry of RELATIONSHIP_MAPPINGS) {
      const key = `${entry.archiRelationshipType}|${entry.sourceArchiType}|${entry.targetArchiType}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const resolved = lookupRelationshipMapping(entry.archiRelationshipType, entry.sourceArchiType, entry.targetArchiType);
      expect(resolved).toBe(entry);
    }
    expect(RELATIONSHIP_MAPPINGS.length).toBe(141);
  });
});
