import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
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

  it('strips control characters XML 1.0 can never represent, from text content', () => {
    // \x00 (NUL) and \x0B (vertical tab) are illegal in XML 1.0 in any form.
    const withIllegalChars = 'A' + String.fromCharCode(0x00) + 'B' + String.fromCharCode(0x0b) + 'CD';
    const xml = renderXmlDocument(textElement('X', withIllegalChars));
    expect(xml).toContain('<X>ABCD</X>');
  });

  it('strips illegal control characters from attribute values', () => {
    const withIllegalChars = 'a' + String.fromCharCode(0x01) + 'b' + String.fromCharCode(0x1f) + 'c';
    const xml = renderXmlDocument(element('X', [['v', withIllegalChars]]));
    expect(xml).toContain('v="abc"');
  });

  it('keeps tab/newline/carriage-return (legal in XML text, and escaped rather than stripped)', () => {
    const xml = renderXmlDocument(textElement('X', 'a\tb\nc\rd'));
    expect(xml).toContain('<X>a\tb&#10;c&#13;d</X>');
  });

  it('escapes a literal tab in an attribute value (normalized to a space otherwise)', () => {
    const xml = renderXmlDocument(element('X', [['v', 'a\tb']]));
    expect(xml).toContain('v="a&#9;b"');
  });

  it('produces a well-formed, parseable document even when input contains illegal control characters', () => {
    const withIllegalChars = 'a' + String.fromCharCode(0x0c) + 'b';
    const xml = renderXmlDocument(element('Root', [['v', withIllegalChars]], [textElement('Child', withIllegalChars)]));
    const parser = new XMLParser({ ignoreAttributes: false });
    expect(() => parser.parse(xml)).not.toThrow();
  });
});
