import { describe, expect, it } from 'vitest';
import { serializeXma } from '../../src/index.js';
import { makeModel, makeElement, makeRelationship } from '../helpers/model-builder.js';

/**
 * AccessRelationship's accessType child (MM_ProfileValues/MM_Value
 * name="accessType") was previously omitted entirely — for every
 * AccessRelationship, including the already-confirmed triples, not just
 * newly-added ones. Confirmed present on the sabsa fixture's own
 * AccessRelationship instances (BusinessProcess -> BusinessObject,
 * accessType="1"/"3" -> "r"/"rw"); the default ("w", no native attribute)
 * and accessType="2" -> "n" were cross-checked exhaustively (all 4 codes,
 * zero unexplained values on either side) against an independent reference
 * model — see relationship-writer.ts's ACCESS_TYPE_XMA_CODE.
 */
describe('AccessRelationship accessType child', () => {
  function buildModel(accessType: 'Write' | 'Read' | 'Unspecified' | 'ReadWrite' | null) {
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const object = makeElement({ id: 'o', type: 'BusinessObject' });
    const rel = makeRelationship({ id: 'rel', type: 'AccessRelationship', sourceId: 'p', targetId: 'o', accessType });
    return makeModel({ elements: [process, object], relationships: [rel] });
  }

  it('emits accessType="r" for Read (confirmed: sabsa accessType="1")', () => {
    const xma = serializeXma(buildModel('Read'));
    expect(xma).toContain('<MM_Value name="accessType" type="AccessRelationType">r</MM_Value>');
  });

  it('emits accessType="rw" for ReadWrite (confirmed: sabsa accessType="3")', () => {
    const xma = serializeXma(buildModel('ReadWrite'));
    expect(xma).toContain('<MM_Value name="accessType" type="AccessRelationType">rw</MM_Value>');
  });

  it('emits accessType="w" for Write (the native default)', () => {
    const xma = serializeXma(buildModel('Write'));
    expect(xma).toContain('<MM_Value name="accessType" type="AccessRelationType">w</MM_Value>');
  });

  it('emits accessType="n" for Unspecified', () => {
    const xma = serializeXma(buildModel('Unspecified'));
    expect(xma).toContain('<MM_Value name="accessType" type="AccessRelationType">n</MM_Value>');
  });

  it('places the accessType MM_Value inside its own MM_ProfileValues, as a child of the relation element', () => {
    const xma = serializeXma(buildModel('Read'));
    expect(xma).toMatch(/<ArchiMate:BusinessProcessBusinessObjectAccess id="\d+" from="\d+" to="\d+"><MM_ProfileValues><MM_Value name="accessType" type="AccessRelationType">r<\/MM_Value><\/MM_ProfileValues><\/ArchiMate:BusinessProcessBusinessObjectAccess>/);
  });

  it('does not emit an accessType child for a non-AccessRelationship', () => {
    const actor = makeElement({ id: 'a', type: 'BusinessActor' });
    const process = makeElement({ id: 'p', type: 'BusinessProcess' });
    const rel = makeRelationship({ id: 'rel', type: 'AssignmentRelationship', sourceId: 'a', targetId: 'p' });
    const xma = serializeXma(makeModel({ elements: [actor, process], relationships: [rel] }));
    expect(xma).not.toContain('accessType');
  });

  it('serializes relationship properties alongside accessType values', () => {
    const xma = serializeXma(
      makeModel({
        elements: [makeElement({ id: 'p', type: 'BusinessProcess' }), makeElement({ id: 'o', type: 'BusinessObject' })],
        relationships: [
          makeRelationship({
            id: 'rel',
            type: 'AccessRelationship',
            sourceId: 'p',
            targetId: 'o',
            accessType: 'Read',
            properties: [{ key: 'classification', value: 'confidential' }],
          }),
        ],
      }),
    );
    expect(xma).toContain('<MM_Value name="accessType" type="AccessRelationType">r</MM_Value>');
    expect(xma).toContain('<MM_Value name="classification" type="string">confidential</MM_Value>');
  });
});
