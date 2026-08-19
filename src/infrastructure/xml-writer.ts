/**
 * Minimal typed XML element tree + deterministic serializer.
 *
 * Business logic builds `XmlElement` trees (attribute order and child order
 * are explicit arrays, controlled entirely by the caller) and this module
 * turns them into text. No implicit ordering, no host/timestamp-dependent
 * output, no third-party XML dependency — keeps the runtime browser-safe.
 */

export interface XmlElement {
  tag: string;
  attrs?: Array<[string, string]>;
  children?: XmlElement[];
  /** Leaf text content. Mutually exclusive with `children` in practice. */
  text?: string;
}

export function element(
  tag: string,
  attrs?: Array<[string, string]>,
  children?: XmlElement[],
): XmlElement {
  return { tag, attrs, children };
}

export function textElement(tag: string, text: string, attrs?: Array<[string, string]>): XmlElement {
  return { tag, attrs, text };
}

/**
 * True for a code unit XML 1.0 forbids everywhere — even as a numeric
 * character reference, there is no legal way to represent it in a document.
 * Legal ranges: 0x9, 0xA, 0xD, 0x20-0xD7FF, 0xE000-0xFFFD, 0x10000-0x10FFFF.
 * Checked by char code (not a literal-character regex) so the source stays
 * readable and editor/tool-safe.
 */
function isIllegalXmlCodeUnit(code: number): boolean {
  if (code === 0x9 || code === 0xa || code === 0xd) return false;
  if (code < 0x20) return true;
  if (code >= 0xd800 && code <= 0xdfff) return false; // UTF-16 surrogate halves, valid when paired
  if (code === 0xfffe || code === 0xffff) return true;
  return false;
}

/**
 * Strips control characters XML 1.0 can never represent — stray bytes from
 * pasted/corrupted source text — so the renderer never emits syntactically
 * invalid XML. Everything else (including surrogate pairs) passes through.
 */
function stripIllegalXmlChars(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (!isIllegalXmlCodeUnit(code)) {
      out += value[i];
    }
  }
  return out;
}

function escapeXmlText(value: string): string {
  return stripIllegalXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;');
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#9;');
}

function renderElement(el: XmlElement, out: string[]): void {
  out.push('<', el.tag);
  for (const [name, value] of el.attrs ?? []) {
    out.push(' ', name, '="', escapeXmlAttr(value), '"');
  }
  const hasChildren = el.children !== undefined && el.children.length > 0;
  const hasText = el.text !== undefined && el.text.length > 0;
  if (!hasChildren && !hasText) {
    out.push('/>');
    return;
  }
  out.push('>');
  if (hasText) {
    out.push(escapeXmlText(el.text as string));
  }
  if (hasChildren) {
    for (const child of el.children as XmlElement[]) {
      renderElement(child, out);
    }
  }
  out.push('</', el.tag, '>');
}

/** Renders a root element to a complete, deterministic XML document string. */
export function renderXmlDocument(root: XmlElement): string {
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n'];
  renderElement(root, out);
  return out.join('');
}
