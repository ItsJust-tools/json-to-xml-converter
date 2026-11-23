import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import { convertJsonToXml } from './convert';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_JSON_INPUT,
  MIN_INDENT,
  MAX_INDENT,
  type HistoryEntry,
  type NsPrefix,
  type ToolState,
} from './types';

export type { DeserializeResult };
export type { HistoryEntry, NsPrefix, ToolState };
export { DEFAULT_STATE, MAX_HISTORY, MAX_JSON_INPUT, MIN_INDENT, MAX_INDENT, convertJsonToXml };

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const boolOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const numberInRangeOr = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  return fallback;
};

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY)
    .map((entry) => ({ text: entry.text, createdAt: entry.createdAt }));
}

function validPrefixes(value: unknown): NsPrefix[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is NsPrefix =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as NsPrefix).uri === 'string' &&
        typeof (entry as NsPrefix).prefix === 'string'
    )
    .slice(0, 16)
    .map((entry) => ({ prefix: entry.prefix.slice(0, 100), uri: entry.uri.slice(0, 500) }));
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    jsonInput: state.jsonInput,
    includeDeclaration: state.includeDeclaration,
    declarationVersion: state.declarationVersion,
    declarationEncoding: state.declarationEncoding,
    attributeNotation: state.attributeNotation,
    indentSize: state.indentSize,
    minify: state.minify,
    defaultNamespace: state.defaultNamespace,
    prefixes: state.prefixes,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected JSON to XML converter state object',
    };
  }
  const v = data as Record<string, unknown>;
  let jsonInput = stringOr(v.jsonInput, DEFAULT_STATE.jsonInput);
  if (jsonInput.length > MAX_JSON_INPUT) {
    jsonInput = jsonInput.slice(0, MAX_JSON_INPUT);
  }
  const state: ToolState = {
    jsonInput,
    includeDeclaration: boolOr(v.includeDeclaration, DEFAULT_STATE.includeDeclaration),
    declarationVersion: stringOr(v.declarationVersion, DEFAULT_STATE.declarationVersion),
    declarationEncoding: stringOr(v.declarationEncoding, DEFAULT_STATE.declarationEncoding),
    attributeNotation: boolOr(v.attributeNotation, DEFAULT_STATE.attributeNotation),
    indentSize: numberInRangeOr(v.indentSize, DEFAULT_STATE.indentSize, MIN_INDENT, MAX_INDENT),
    minify: boolOr(v.minify, DEFAULT_STATE.minify),
    defaultNamespace: stringOr(v.defaultNamespace, DEFAULT_STATE.defaultNamespace),
    prefixes: validPrefixes(v.prefixes),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Build the XML declaration line, or null when disabled. */
export function buildDeclaration(state: ToolState): string | null {
  if (!state.includeDeclaration) return null;
  const version = state.declarationVersion.trim() || '1.0';
  const encoding = state.declarationEncoding.trim() || 'UTF-8';
  return `<?xml version="${version}" encoding="${encoding}"?>`;
}

/** Convert the current JSON input with the state's options. */
export function convertWithState(state: ToolState): { xml: string | null; error: string | null } {
  const result = convertJsonToXml(state.jsonInput, {
    indentSize: state.indentSize,
    minify: state.minify,
    defaultNamespace: state.defaultNamespace,
    prefixes: state.prefixes,
  });
  if (!result.success) return { xml: null, error: result.error };
  const parts: string[] = [];
  const declaration = buildDeclaration(state);
  if (declaration) parts.push(declaration);
  parts.push(result.xml);
  return { xml: parts.join(state.minify ? '' : '\n'), error: null };
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const result = convertWithState(state);
  if (result.error) return result.error;
  if (result.xml === null) return 'No XML output';
  const lines = result.xml.split('\n').length;
  return `${lines} ${lines === 1 ? 'line' : 'lines'} of XML`;
}

/** Hint lines shown in the sidebar. */
export function stepsFor(state: ToolState): string[] {
  return [
    state.attributeNotation
      ? 'Attribute notation: keys starting with @ become attributes.'
      : 'Attribute notation is off.',
    state.minify ? 'Output is minified.' : `Output uses a ${state.indentSize} space indent.`,
  ];
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.jsonInput === 'string' && typeof v.minify === 'boolean';
}

export const jsonToXmlConverterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [],
};

export type { Tool };
export { toolConfig as config };
