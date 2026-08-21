import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element, textElement } from '../infrastructure/xml-writer.js';
import { toRtfDocument } from './rtf.js';
import type { ArchiProperty } from '@cda/archi-semantic-core';

/**
 * Builds an `<MM_ProfileValues>` block: a `nm` (display name) value, an
 * optional `doc` (RTF documentation) value, and optional native properties.
 * The first two retain the confirmed fixture order (`nm` before `doc`);
 * properties follow in their source order.
 */
export function buildProfileValues(
  language: string,
  name: string,
  documentation?: string | null,
  properties: readonly ArchiProperty[] = [],
): XmlElement {
  const children: XmlElement[] = [
    textElement('MM_Value', name, [
      ['name', 'nm'],
      ['type', 'string'],
      ['xml:lang', language],
    ]),
  ];
  if (documentation) {
    children.push(
      textElement('MM_Value', toRtfDocument(documentation), [
        ['name', 'doc'],
        ['type', 'rtf'],
        ['xml:lang', language],
      ]),
    );
  }
  for (const property of properties) {
    children.push(
      textElement('MM_Value', property.value, [
        ['name', property.key],
        ['type', 'string'],
      ]),
    );
  }
  return element('MM_ProfileValues', undefined, children);
}

/** Builds the non-name values carried by a relationship's profile block. */
export function buildRelationshipProfileValues(
  properties: readonly ArchiProperty[],
  accessType?: string,
): XmlElement | undefined {
  const children: XmlElement[] = [];
  if (accessType !== undefined) {
    children.push(
      textElement('MM_Value', accessType, [
        ['name', 'accessType'],
        ['type', 'AccessRelationType'],
      ]),
    );
  }
  for (const property of properties) {
    children.push(
      textElement('MM_Value', property.value, [
        ['name', property.key],
        ['type', 'string'],
      ]),
    );
  }
  return children.length > 0 ? element('MM_ProfileValues', undefined, children) : undefined;
}
