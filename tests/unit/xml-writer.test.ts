import { describe, expect, it } from 'vitest';
import { element, textElement, renderXmlDocument } from '../../src/infrastructure/xml-writer.js';

describe('xml-writer', () => {
  it('renders a self-closing element when there are no children/text', () => {
    const xml = renderXmlDocument(element('Foo', [['id', '1']]));
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<Foo id="1"/>');
  });

  it('renders nested elements and text content', () => {
    const xml = renderXmlDocument(element('Root', undefined, [textElement('Child', 'hello')]));
    expect(xml).toContain('<Root><Child>hello</Child></Root>');
  });

  it('escapes text content', () => {
    const xml = renderXmlDocument(textElement('X', `<a> & "b" 'c'`));
    expect(xml).toContain('&lt;a&gt; &amp; "b" \'c\'');
  });

  it('escapes attribute values', () => {
    const xml = renderXmlDocument(element('X', [['v', `a"b&c<d>e`]]));
    expect(xml).toContain('v="a&quot;b&amp;c&lt;d&gt;e"');
  });

  it('preserves explicit attribute and child order (caller-controlled, never re-sorted)', () => {
    const xml = renderXmlDocument(element('X', [['b', '2'], ['a', '1']], [textElement('Second', 's'), textElement('First', 'f')]));
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<X b="2" a="1"><Second>s</Second><First>f</First></X>');
  });
});
