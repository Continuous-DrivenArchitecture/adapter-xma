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

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;');
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/"/g, '&quot;');
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
