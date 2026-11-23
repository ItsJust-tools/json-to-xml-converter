export interface HistoryEntry {
  /** Short human readable description of the conversion. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface NsPrefix {
  /** Namespace URI. */
  uri: string;
  /** Prefix; empty string means the default namespace. */
  prefix: string;
}

export interface ToolState {
  /** JSON source text entered by the user. */
  jsonInput: string;
  /** Emit an XML declaration when true. */
  includeDeclaration: boolean;
  /** XML declaration version. */
  declarationVersion: string;
  /** XML declaration encoding. */
  declarationEncoding: string;
  /** Treat keys prefixed with '@' as attributes of the parent element. */
  attributeNotation: boolean;
  /** Indent size in spaces for pretty output. */
  indentSize: number;
  /** Minify the output instead of pretty printing. */
  minify: boolean;
  /** Default namespace URI; empty disables it. */
  defaultNamespace: string;
  /** Prefix-to-URI mappings applied to the root element. */
  prefixes: NsPrefix[];
  /** Saved conversion history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  jsonInput:
    '{\n  "name": "Ada Lovelace",\n  "age": 36,\n  "languages": ["math", "notes"],\n  "@id": "p1"\n}',
  includeDeclaration: true,
  declarationVersion: '1.0',
  declarationEncoding: 'UTF-8',
  attributeNotation: true,
  indentSize: 2,
  minify: false,
  defaultNamespace: '',
  prefixes: [],
  history: [],
};

export const MAX_HISTORY = 20;
export const MAX_JSON_INPUT = 100000;
export const MIN_INDENT = 1;
export const MAX_INDENT = 8;
