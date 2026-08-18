import { describe, expect, it } from 'vitest';
import { toRtfDocument } from '../../src/serializer/rtf.js';

describe('toRtfDocument', () => {
  it('wraps plain ASCII text in the confirmed minimal RTF shape', () => {
    expect(toRtfDocument('Hello world')).toBe('{\\rtf1 Hello world}');
  });

  it('escapes backslashes and braces', () => {
    const rtf = toRtfDocument('a\\b{c}d');
    expect(rtf).toContain('a\\\\b\\{c\\}d');
  });

  it('converts line breaks to \\par', () => {
    expect(toRtfDocument('line1\nline2')).toContain('line1\\par\nline2');
    expect(toRtfDocument('line1\r\nline2')).toContain('line1\\par\nline2');
    expect(toRtfDocument('line1\rline2')).toContain('line1\\par\nline2');
  });

  it('encodes Spanish accented text deterministically as \\uN? escapes', () => {
    const rtf = toRtfDocument('Aquí está el niño');
    // í = U+00ED = 237, á = U+00E1 = 225, ñ = U+00F1 = 241
    expect(rtf).toContain('Aqu\\u237?');
    expect(rtf).toContain('est\\u225?');
    expect(rtf).toContain('ni\\u241?o');
    expect(rtf).not.toMatch(/[^\x00-\x7f]/); // pure ASCII output
  });

  it('is deterministic: identical input always produces identical output', () => {
    const text = 'Esto es un Group\ncon "comillas" y \\barras\\';
    expect(toRtfDocument(text)).toBe(toRtfDocument(text));
  });

  it('matches the confirmed catalogue fixture byte-for-byte', () => {
    expect(toRtfDocument('Esto es un Resource')).toBe('{\\rtf1 Esto es un Resource}');
  });
});
