import { MAX_JSON_INPUT, type NsPrefix } from './types';

/** Escape XML special characters for text nodes and attribute values. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Sanitize a string into a valid XML element name; falls back to 'item'. */
export function sanitizeName(raw: string): string {
  const replaced = raw.replace(/[^A-Za-z0-9_.-]/g, '-');
  const base = replaced === '' ? 'item' : replaced;
  const prefixed = /^[-.]/.test(base) ? `item${base}` : base;
  return /^\d/.test(prefixed) ? `n${prefixed}` : prefixed;
}

/** Format a JSON scalar for text-node placement; null for non-scalars. */
export function scalarText(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

interface XmlAttribute {
  name: string;
  value: string;
}

function collectAttributes(record: Record<string, unknown>): XmlAttribute[] {
  const attrs: XmlAttribute[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith('@')) continue;
    const text = value === null ? '' : scalarText(value);
    if (text === null) continue;
    const name = key.slice(1);
    if (name.length === 0) continue;
    attrs.push({ name: sanitizeName(name), value: text });
  }
  return attrs;
}

function entriesWithoutAttributes(record: Record<string, unknown>): [string, unknown][] {
  return Object.entries(record).filter(([key, value]) => {
    if (!key.startsWith('@')) return true;
    return scalarText(value) === null;
  });
}

/** Append the XML fragment for one JSON value to `lines`. */
function buildNode(name: string, value: unknown, lines: string[]): void {
  const tag = sanitizeName(name);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`<${tag}/>`);
      return;
    }
    const childLines: string[] = [];
    for (const entry of value) {
      buildNode(`${tag}_item`, entry, childLines);
    }
    lines.push(`<${tag}>${childLines.join('')}</${tag}>`);
    return;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const attrs = collectAttributes(record);
    const attrText =
      attrs.length > 0 ? ` ${attrs.map((a) => `${a.name}="${escapeXml(a.value)}"`).join(' ')}` : '';
    const children = entriesWithoutAttributes(record);
    if (children.length === 0) {
      lines.push(`<${tag}${attrText}/>`);
      return;
    }
    const childLines: string[] = [];
    for (const [childName, childValue] of children) {
      buildNode(childName, childValue, childLines);
    }
    lines.push(`<${tag}${attrText}>${childLines.join('')}</${tag}>`);
    return;
  }
  const text = scalarText(value);
  if (text === null) {
    lines.push(`<${tag}/>`);
    return;
  }
  lines.push(`<${tag}>${escapeXml(text)}</${tag}>`);
}

/** Pretty-print compact XML by inserting line breaks and indentation. */
export function prettyPrint(xml: string, indentSize: number): string {
  const size = Math.max(1, Math.min(8, Math.round(indentSize)));
  const indent = ' '.repeat(size);
  const tokens = xml.replace(/>\s*</g, '>\n<').split('\n');
  let depth = 0;
  const out: string[] = [];
  for (const token of tokens) {
    const closing = /^<\//.test(token);
    const openingOnly =
      /^<[^/!?]/.test(token) &&
      !/\/>$/.test(token) &&
      !/^<([\w:.-]+)(?:\s[^>]*)?>.*<\/\1>$/.test(token);
    if (closing) depth = Math.max(0, depth - 1);
    out.push(`${indent.repeat(depth)}${token}`);
    if (openingOnly) depth += 1;
  }
  return out.join('\n');
}

/** Parse JSON and report errors with a line/column position. */
export function parseJsonWithPosition(
  text: string
): { success: true; data: unknown } | { success: false; error: string } {
  if (text.trim().length === 0) {
    return { success: false, error: 'JSON input is empty.' };
  }
  try {
    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Invalid JSON: ${raw}. ${describeFirstProblem(text)}`.replace('. .', '.'),
    };
  }
}

/** Best-effort location of the first structural problem, for error hints. */
function describeFirstProblem(text: string): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trailing = line.match(/,\s*$/);
    if (trailing && (i + 1 >= lines.length || /^\s*[\]}]/.test(lines[i + 1] ?? ''))) {
      const start = trailing.index ?? 0;
      return `Unexpected trailing comma at line ${i + 1}, column ${start + 1}.`;
    }
    const valueGap = line.match(/^\s*"[^"]+"\s*:\s*,/);
    if (valueGap) {
      return `Missing value after key at line ${i + 1}, column ${line.indexOf(':') + 1}.`;
    }
  }
  if (!/^[\[{]/.test(text.trim())) {
    return 'Input must start with { or [.';
  }
  return 'Check syntax near the end of the input.';
}

export interface ConvertOptions {
  indentSize: number;
  minify: boolean;
  defaultNamespace: string;
  prefixes: NsPrefix[];
}

/** Convert parsed JSON into an XML string with the given options. */
export function jsonToXml(parsed: unknown, options: ConvertOptions): string {
  const record =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { root: parsed };
  const inner: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    buildNode(key, value, inner);
  }
  const nsAttrs: string[] = [];
  const defaultNs = options.defaultNamespace.trim();
  if (defaultNs.length > 0) {
    nsAttrs.push(`xmlns="${escapeXml(defaultNs)}"`);
  }
  for (const mapping of options.prefixes) {
    const prefix = mapping.prefix.trim();
    const uri = mapping.uri.trim();
    if (prefix.length === 0 || uri.length === 0) continue;
    nsAttrs.push(`xmlns:${sanitizeName(prefix)}="${escapeXml(uri)}"`);
  }
  const attrText = nsAttrs.length > 0 ? ` ${nsAttrs.join(' ')}` : '';
  let xml = `<root${attrText}>${inner.join('')}</root>`;
  if (!options.minify) {
    xml = prettyPrint(xml, options.indentSize);
  }
  return xml;
}

/** Full pipeline: JSON text to XML, or a structured error. */
export function convertJsonToXml(
  text: string,
  options: ConvertOptions
): { success: true; xml: string } | { success: false; error: string } {
  if (text.length > MAX_JSON_INPUT) {
    return {
      success: false,
      error: `JSON input is too long (max ${MAX_JSON_INPUT} characters).`,
    };
  }
  const parsed = parseJsonWithPosition(text);
  if (!parsed.success) return parsed;
  return { success: true, xml: jsonToXml(parsed.data, options) };
}
