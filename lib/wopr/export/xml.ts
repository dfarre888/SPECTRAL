/**
 * Minimal XML writer: enough to emit MSDL without a dependency.
 * Every text node and attribute value is escaped; names are validated so a
 * bad element name fails loudly instead of producing malformed XML.
 */

export interface XmlElement {
  name: string
  attrs?: Record<string, string>
  children?: Array<XmlElement | null | undefined | false>
  text?: string | number | boolean | null
}

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.:-]*$/

/** Escape text and attribute content. Also strips characters XML 1.0 forbids. */
export function escapeXml(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Element helper. Pass a string/number as the second argument for a text element. */
export function el(
  name: string,
  content?: string | number | boolean | null | Array<XmlElement | null | undefined | false>,
  attrs?: Record<string, string>,
): XmlElement {
  if (Array.isArray(content)) return { name, attrs, children: content }
  return { name, attrs, text: content ?? null }
}

function renderAttrs(attrs?: Record<string, string>): string {
  if (!attrs) return ''
  return Object.entries(attrs)
    .map(([k, v]) => {
      if (!NAME_RE.test(k)) throw new Error(`Invalid XML attribute name: ${k}`)
      return ` ${k}="${escapeXml(v)}"`
    })
    .join('')
}

export function renderXml(node: XmlElement, depth = 0, indent = '  '): string {
  if (!NAME_RE.test(node.name)) throw new Error(`Invalid XML element name: ${node.name}`)
  const pad = indent.repeat(depth)
  const open = `${node.name}${renderAttrs(node.attrs)}`
  const kids = (node.children ?? []).filter((c): c is XmlElement => Boolean(c))
  if (kids.length > 0) {
    const inner = kids.map((c) => renderXml(c, depth + 1, indent)).join('\n')
    return `${pad}<${open}>\n${inner}\n${pad}</${node.name}>`
  }
  if (node.text === null || node.text === undefined || node.text === '') {
    return `${pad}<${open}/>`
  }
  return `${pad}<${open}>${escapeXml(String(node.text))}</${node.name}>`
}

/** XML comments may not contain "--" or end in "-". */
export function xmlComment(text: string): string {
  const safe = text.replace(/--+/g, '-').replace(/-$/, '- ')
  return `<!-- ${safe} -->`
}

export function xmlDocument(root: XmlElement, comments: string[] = []): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ...comments.map(xmlComment),
    renderXml(root),
    '',
  ].join('\n')
}
