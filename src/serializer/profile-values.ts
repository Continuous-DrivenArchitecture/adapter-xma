import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element, textElement } from '../infrastructure/xml-writer.js';
import { toRtfDocument } from './rtf.js';

/**
 * Builds an `<MM_ProfileValues>` block: a `nm` (display name) value, and
 * optionally a `doc` (RTF documentation) value — confirmed order and shape
 * from both reference fixtures (`nm` always precedes `doc`).
 */
export function buildProfileValues(language: string, name: string, documentation?: string | null): XmlElement {
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
  return element('MM_ProfileValues', undefined, children);
}
