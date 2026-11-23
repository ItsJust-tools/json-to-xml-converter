'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      role="group"
      aria-label="Conversion controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.attributeNotation}
            onChange={(e) => onChange({ ...state, attributeNotation: e.target.checked })}
            data-testid="opt-attributes"
          />
          @-attributes
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.minify}
            onChange={(e) => onChange({ ...state, minify: e.target.checked })}
            data-testid="opt-minify"
          />
          Minify
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.includeDeclaration}
            onChange={(e) => onChange({ ...state, includeDeclaration: e.target.checked })}
            data-testid="opt-declaration"
          />
          Declaration
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
          Indent
          <input
            type="number"
            min={1}
            max={8}
            value={state.indentSize}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) {
                onChange({ ...state, indentSize: Math.min(8, Math.max(1, Math.round(parsed))) });
              }
            }}
            data-testid="opt-indent"
            className="w-14 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-output"
            className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            Copy XML
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
