/**
 * Deterministic, dependency-free RTF encoding for Archi `documentation`
 * text, used as the `doc` profile value's content.
 *
 * RTF control characters (`\\`, `{`, `}`) are escaped, line breaks become
 * `\par`, and every non-ASCII / control code unit is escaped as a signed
 * `\uN?` Unicode destination (RTF 1.5+, one fallback byte per `\uc1`) rather
 * than interpolated raw — this keeps the output valid RTF regardless of
 * source locale (Spanish, accented Latin text, etc.) without guessing a
 * target ANSI code page.
 */
/**
 * Iterates by UTF-16 code unit (not by Unicode code point) deliberately: a
 * character outside the Basic Multilingual Plane (e.g. an emoji) is stored
 * in JS strings as a surrogate pair, and this naturally emits it as two
 * consecutive `\uN?` escapes, one per surrogate half — the standard,
 * widely-implemented RTF technique for supplementary-plane characters
 * (RTF's own `\u` model is itself UTF-16-code-unit-based). This is not
 * splitting one character across two escapes by accident; recombining a
 * code point first and emitting one escape would be the non-standard
 * choice. No fixture contains an astral character in documentation text to
 * confirm this against directly, but the signed-16-bit conversion below is
 * applied uniformly and correctly regardless of whether a given code unit
 * happens to be a surrogate half.
 */
function escapeRtfBody(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const code = normalized.charCodeAt(i);
    if (ch === '\n') {
      out.push('\\par\n');
    } else if (ch === '\\') {
      out.push('\\\\');
    } else if (ch === '{') {
      out.push('\\{');
    } else if (ch === '}') {
      out.push('\\}');
    } else if (code >= 0x20 && code <= 0x7e) {
      out.push(ch);
    } else {
      const signed = code > 0x7fff ? code - 0x10000 : code;
      out.push(`\\u${signed}?`);
    }
  }
  return out.join('');
}

/**
 * Wraps escaped documentation text into an RTF document, matching the exact
 * minimal shape confirmed by both reference fixtures: `{\rtf1 <text>}`, with
 * no additional header control words — the reference tool emits nothing
 * beyond that, and RTF 1.5+'s `\uN` Unicode escapes are valid on their own
 * (the per-`\u` fallback byte count defaults to 1 with no `\ucN` present).
 */
export function toRtfDocument(text: string): string {
  return `{\\rtf1 ${escapeRtfBody(text)}}`;
}
