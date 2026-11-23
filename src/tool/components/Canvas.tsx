'use client';

import React from 'react';
import { convertWithState } from '../tool-definition';
import { DEFAULT_STATE, type ToolState, MIN_INDENT, MAX_INDENT } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onDownload?: () => void;
}

const textareaClass =
  'w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onDownload }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const { xml, error } = convertWithState(state);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="converter-canvas">
      <div>
        <label
          htmlFor="json-input"
          className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          JSON input
        </label>
        <textarea
          id="json-input"
          value={state.jsonInput}
          onChange={(e) => update({ jsonInput: e.target.value })}
          data-testid="json-input"
          rows={10}
          spellCheck={false}
          className={textareaClass}
          placeholder='{"hello": "world"}'
        />
        {error ? (
          <p
            className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
            data-testid="json-error"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="output-card"
      >
        <span className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          XML output
        </span>
        {error ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="output-placeholder">
            The last valid XML output is shown until the JSON parses again.
          </p>
        ) : null}
        <pre
          data-testid="xml-output"
          className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:bg-gray-950/60 dark:text-gray-200 ${
            error ? 'opacity-50' : ''
          }`}
        >
          {xml ?? ''}
        </pre>
        {!error ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDownload}
              data-testid="btn-download"
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            >
              Download .xml
            </button>
            <button
              type="button"
              onClick={() => onChange?.({ ...DEFAULT_STATE, jsonInput: '' })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reset options
            </button>
          </div>
        ) : null}
      </div>
      <span className="hidden" data-testid="indent-range">
        {MIN_INDENT}-{MAX_INDENT}
      </span>
    </div>
  );
};
