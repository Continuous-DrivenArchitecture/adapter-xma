import { describe, expect, it } from 'vitest';
import { ELEMENT_MAPPINGS, lookupElementMapping, getSchemeCollectionOrder } from '../../src/mapping/element-mapping.js';

describe('element-mapping', () => {
  it('covers exactly the 60 confirmed catalogue element types', () => {
    expect(ELEMENT_MAPPINGS).toHaveLength(60);
    const archiTypes = new Set(ELEMENT_MAPPINGS.map((e) => e.archiType));
    expect(archiTypes.size).toBe(60);
  });

  it('preserves the exact "IMWorkpackage" (lowercase p) spelling', () => {
    const mapping = lookupElementMapping('WorkPackage');
    expect(mapping?.xmaType).toBe('IMWorkpackage');
    expect(mapping?.collectionTag).toBe('IMWorkpackages');
    expect(mapping?.xmaType).not.toBe('IMWorkPackage');
  });

  it('maps ServingRelationship-adjacent and grouped-collaboration types correctly', () => {
    expect(lookupElementMapping('BusinessCollaboration')).toMatchObject({
      xmaType: 'BusinessCollaboration',
      scheme: 'BusinessScheme',
      collectionTag: 'BusinessRoles',
    });
    expect(lookupElementMapping('ApplicationCollaboration')).toMatchObject({
      xmaType: 'ApplicationCollaboration',
      scheme: 'ApplicationScheme',
      collectionTag: 'ApplicationComponents',
    });
    expect(lookupElementMapping('TechnologyCollaboration')).toMatchObject({
      xmaType: 'TechnologyCollaboration',
      scheme: 'TechnologyScheme',
      collectionTag: 'TechnologyNodes',
    });
    expect(lookupElementMapping('Contract')).toMatchObject({
      xmaType: 'BusinessContract',
      scheme: 'BusinessScheme',
      collectionTag: 'BusinessObjects',
    });
  });

  it('returns undefined for unmapped/unknown Archi types (e.g. Junction)', () => {
    expect(lookupElementMapping('Junction')).toBeUndefined();
    expect(lookupElementMapping('NotARealType')).toBeUndefined();
  });

  it('confirms the "without icon" set from the catalogue fixture (19 types)', () => {
    const withoutIcon = ELEMENT_MAPPINGS.filter((e) => !e.hasIcon).map((e) => e.xmaType).sort();
    expect(withoutIcon).toEqual(
      [
        'ApplicationDataObject',
        'ApplicationEvent',
        'ApplicationService',
        'BusinessContract',
        'BusinessEvent',
        'BusinessObject',
        'BusinessProduct',
        'BusinessRepresentation',
        'BusinessService',
        'CompositeGrouping',
        'IMDeliverable',
        'IMImplementationEvent',
        'MotivationMeaning',
        'MotivationValue',
        'TechnologyArtifact',
        'TechnologyDevice',
        'TechnologyEvent',
        'TechnologyNode',
        'TechnologyService',
      ].sort(),
    );
  });

  it('derives a stable, de-duplicated collection order per scheme', () => {
    const order = getSchemeCollectionOrder('BusinessScheme');
    const tags = order.map((c) => c.tag);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('BusinessActors');
    expect(tags).toContain('BusinessObjects');
    expect(getSchemeCollectionOrder('NoSuchScheme')).toEqual([]);
  });
});
