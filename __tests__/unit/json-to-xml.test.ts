import { describe, it, expect } from 'vitest';
import {
  escapeXml,
  sanitizeName,
  scalarText,
  parseJsonWithPosition,
  prettyPrint,
  jsonToXml,
  convertJsonToXml,
} from '@/tool/convert';
import {
  serializeState,
  deserializeState,
  convertWithState,
  buildDeclaration,
  summaryText,
  stepsFor,
  isState,
  roundTrips,
  withHistory,
} from '@/tool/tool-definition';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_JSON_INPUT,
  MIN_INDENT,
  MAX_INDENT,
  type ToolState,
} from '@/tool/types';
import { jsonToXmlConverterTool } from '@/tool/tool-definition';
import toolConfig from '@/tool/tool.config';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('sanitizeName', () => {
  it('keeps valid name characters', () => {
    expect(sanitizeName('valid_name-1.2')).toBe('valid_name-1.2');
  });

  it('replaces invalid characters with dashes', () => {
    expect(sanitizeName('a b/c')).toBe('a-b-c');
    expect(sanitizeName('price €')).toBe('price--');
  });

  it('prefixes names starting with a digit', () => {
    expect(sanitizeName('1abc')).toBe('n1abc');
  });

  it('handles empty and punctuation-only input', () => {
    expect(sanitizeName('')).toBe('item');
    expect(sanitizeName('--')).toBe('item--');
    expect(sanitizeName('.x')).toBe('item.x');
  });
});

describe('escapeXml', () => {
  it('escapes all five special characters', () => {
    expect(escapeXml(`<a & "b" 'c'>`)).toBe('&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;');
  });

  it('leaves safe text untouched', () => {
    expect(escapeXml('plain text 123')).toBe('plain text 123');
  });
});

describe('scalarText', () => {
  it('maps scalars to strings', () => {
    expect(scalarText('hi')).toBe('hi');
    expect(scalarText(1.5)).toBe('1.5');
    expect(scalarText(false)).toBe('false');
  });

  it('returns null for null and non-scalars', () => {
    expect(scalarText(null)).toBeNull();
    expect(scalarText(undefined)).toBeNull();
    expect(scalarText({})).toBeNull();
    expect(scalarText([])).toBeNull();
  });
});

describe('parseJsonWithPosition', () => {
  it('parses valid JSON', () => {
    const result = parseJsonWithPosition('{"a":1}');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ a: 1 });
  });

  it('reports an empty input error', () => {
    const result = parseJsonWithPosition('   ');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('empty');
  });

  it('reports invalid JSON with a position', () => {
    const result = parseJsonWithPosition('{\n  "a": ,\n}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON');
      expect(result.error).toMatch(/at line \d+, column \d+/);
    }
  });
});

describe('prettyPrint', () => {
  it('indents nested elements', () => {
    const pretty = prettyPrint('<root><a>1</a><b><c>2</c></b></root>', 2);
    expect(pretty).toBe(
      ['<root>', '  <a>1</a>', '  <b>', '    <c>2</c>', '  </b>', '</root>'].join('\n')
    );
  });

  it('respects custom indent sizes', () => {
    const pretty = prettyPrint('<root><a>1</a></root>', 4);
    expect(pretty).toBe(['<root>', '    <a>1</a>', '</root>'].join('\n'));
  });

  it('keeps self-closing elements on one line', () => {
    const pretty = prettyPrint('<root><a/><b/></root>', 2);
    expect(pretty).toBe(['<root>', '  <a/>', '  <b/>', '</root>'].join('\n'));
  });
});

describe('jsonToXml', () => {
  const options = {
    indentSize: 2,
    minify: true,
    defaultNamespace: '',
    prefixes: [],
  };

  it('converts nested objects and arrays to XML elements', () => {
    const xml = jsonToXml({ user: { name: 'Ada', tags: ['x', 'y'] } }, options);
    expect(xml).toBe(
      '<root><user><name>Ada</name><tags><tags_item>x</tags_item><tags_item>y</tags_item></tags></user></root>'
    );
  });

  it('renders @-prefixed keys as attributes on the parent element', () => {
    const xml = jsonToXml({ person: { '@id': 'p1', name: 'Ada' } }, options);
    expect(xml).toBe('<root><person id="p1"><name>Ada</name></person></root>');
  });

  it('escapes text and attribute values', () => {
    const xml = jsonToXml({ note: { '@title': 'a<b', body: '5 > 3 & 2 < 4' } }, options);
    expect(xml).toContain('title="a&lt;b"');
    expect(xml).toContain('5 &gt; 3 &amp; 2 &lt; 4');
  });

  it('handles booleans, numbers, null and empty containers', () => {
    const xml = jsonToXml({ ok: true, count: 3, nothing: null, empty: {}, list: [] }, options);
    expect(xml).toContain('<ok>true</ok>');
    expect(xml).toContain('<count>3</count>');
    expect(xml).toContain('<nothing/>');
    expect(xml).toContain('<empty/>');
    expect(xml).toContain('<list/>');
  });

  it('wraps non-object roots and handles top-level arrays', () => {
    expect(jsonToXml('hello', options)).toBe('<root><root>hello</root></root>');
    expect(jsonToXml(7, options)).toBe('<root><root>7</root></root>');
    expect(jsonToXml([1, 2], options)).toBe(
      '<root><root><root_item>1</root_item><root_item>2</root_item></root></root>'
    );
  });

  it('emits namespace attributes on the root', () => {
    const xml = jsonToXml(
      { a: 1 },
      {
        ...options,
        defaultNamespace: 'https://example.com/default',
        prefixes: [{ prefix: 'ex', uri: 'https://example.com/ex' }],
      }
    );
    expect(xml).toContain('xmlns="https://example.com/default"');
    expect(xml).toContain('xmlns:ex="https://example.com/ex"');
  });

  it('pretty prints when minify is false', () => {
    const xml = jsonToXml({ a: 1 }, { ...options, minify: false });
    expect(xml.split('\n')).toHaveLength(3);
  });
});

describe('convertJsonToXml', () => {
  const options = { indentSize: 2, minify: true, defaultNamespace: '', prefixes: [] };

  it('returns XML for valid input', () => {
    const result = convertJsonToXml('{"a":1}', options);
    expect(result.success).toBe(true);
    if (result.success) expect(result.xml).toBe('<root><a>1</a></root>');
  });

  it('returns an error for invalid input', () => {
    const result = convertJsonToXml('{nope', options);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Invalid JSON');
  });

  it('rejects overlong input', () => {
    const result = convertJsonToXml('x'.repeat(MAX_JSON_INPUT + 1), options);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('too long');
  });
});

describe('buildDeclaration', () => {
  it('emits the declaration when enabled', () => {
    expect(buildDeclaration(state())).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('returns null when disabled and uses fallbacks for blank values', () => {
    expect(buildDeclaration(state({ includeDeclaration: false }))).toBeNull();
    expect(buildDeclaration(state({ declarationVersion: '', declarationEncoding: '' }))).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>'
    );
  });
});

describe('convertWithState', () => {
  it('prepends the declaration and joins with newlines when pretty', () => {
    const result = convertWithState(state({ jsonInput: '{"a":1}' }));
    expect(result.xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <a>1</a>\n</root>');
    expect(result.error).toBeNull();
  });

  it('omits the declaration when disabled', () => {
    const result = convertWithState(state({ jsonInput: '{"a":1}', includeDeclaration: false }));
    expect(result.xml).toBe('<root>\n  <a>1</a>\n</root>');
  });

  it('returns the error and null xml for invalid input', () => {
    const result = convertWithState(state({ jsonInput: 'oops' }));
    expect(result.xml).toBeNull();
    expect(result.error).toContain('Invalid JSON');
  });

  it('honors the minify option without declaration separator', () => {
    const result = convertWithState(state({ jsonInput: '{"a":1}', minify: true }));
    expect(result.xml).toBe('<?xml version="1.0" encoding="UTF-8"?><root><a>1</a></root>');
  });
});

describe('summaryText and stepsFor', () => {
  it('summarizes valid output as line count', () => {
    expect(summaryText(state({ jsonInput: '{"a":1}' }))).toBe('4 lines of XML');
  });

  it('summarizes errors with the parse message', () => {
    expect(summaryText(state({ jsonInput: 'nope' }))).toContain('Invalid JSON');
  });

  it('explains attribute notation and formatting', () => {
    const hints = stepsFor(state());
    expect(hints[0]).toContain('@');
    expect(hints[1]).toContain('2 space indent');
    expect(stepsFor(state({ minify: true }))[1]).toContain('minified');
  });
});

describe('serialize/deserialize round-trip', () => {
  const full: ToolState = {
    ...DEFAULT_STATE,
    jsonInput: '{"changed":true}',
    indentSize: 4,
    minify: true,
    defaultNamespace: 'https://example.com',
    prefixes: [{ prefix: 'ex', uri: 'https://example.com/ex' }],
    history: [{ text: '4 lines of XML', createdAt: '2026-11-23T10:00:00.000Z' }],
  };

  it('round-trips all fields through serializeState/deserializeState', () => {
    const restored = deserializeState(JSON.parse(serializeState(full)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(full);
    }
    expect(serializeState(full)).toContain('"indentSize":4');
  });

  it('round-trips via the Tool object', () => {
    const serialized = jsonToXmlConverterTool.serialize(full);
    const restored = jsonToXmlConverterTool.deserialize(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(full);
    }
  });

  it('keeps URL share state round-trip safe', () => {
    expect(roundTrips(full)).toBe(true);
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(undefined).success).toBe(false);
  });

  it('falls back to defaults for missing or invalid fields', () => {
    const restored = deserializeState({});
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(DEFAULT_STATE);
    }
    const repaired = deserializeState({
      indentSize: 99,
      includeDeclaration: 'yes',
      prefixes: ['bad', { uri: 'u' }, { prefix: 'p', uri: 'u2' }],
    });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.indentSize).toBe(MAX_INDENT);
      expect(repaired.data.includeDeclaration).toBe(DEFAULT_STATE.includeDeclaration);
      expect(repaired.data.prefixes).toEqual([{ prefix: 'p', uri: 'u2' }]);
    }
  });

  it('clamps indent size into the allowed range', () => {
    const low = deserializeState({ indentSize: 0 });
    if (low.success) expect(low.data.indentSize).toBe(MIN_INDENT);
    const high = deserializeState({ indentSize: 99 });
    if (high.success) expect(high.data.indentSize).toBe(MAX_INDENT);
    const fallback = deserializeState({ indentSize: 'big' });
    if (fallback.success) expect(fallback.data.indentSize).toBe(DEFAULT_STATE.indentSize);
  });

  it('truncates oversized jsonInput', () => {
    const restored = deserializeState({ jsonInput: 'x'.repeat(MAX_JSON_INPUT + 10) });
    expect(restored.success).toBe(true);
    if (restored.success) expect(restored.data.jsonInput.length).toBe(MAX_JSON_INPUT);
  });

  it('filters invalid history entries and caps length', () => {
    const entries = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `entry ${i}`,
      createdAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    }));
    const restored = deserializeState({ history: [...entries, 'bad', { text: 'x' }] });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.history.length).toBe(MAX_HISTORY);
      expect(restored.data.history[0]?.text).toBe('entry 0');
    }
  });
});

describe('withHistory', () => {
  it('prepends newest entries first and caps length', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    let s = state();
    s = withHistory(s, 'one', now);
    s = withHistory(s, 'two', now);
    expect(s.history[0]?.text).toBe('two');
    expect(s.history[1]?.text).toBe('one');
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `e${i}`, now);
    }
    expect(s.history.length).toBe(MAX_HISTORY);
  });
});

describe('tool identity and helpers', () => {
  it('exposes the configured tool identity', () => {
    expect(jsonToXmlConverterTool.id).toBe('json-to-xml-converter');
    expect(jsonToXmlConverterTool.name).toBe(toolConfig.name);
    expect(jsonToXmlConverterTool.initialState).toEqual(DEFAULT_STATE);
  });

  it('type-guards valid states', () => {
    expect(isState(state())).toBe(true);
    expect(isState({ jsonInput: 5, minify: false })).toBe(false);
    expect(isState(null)).toBe(false);
  });
});
