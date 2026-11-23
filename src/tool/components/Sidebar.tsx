'use client';

import React from 'react';
import { stepsFor } from '../tool-definition';
import type { NsPrefix, ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange({ ...state, ...patch });
  const setPrefix = (index: number, patch: Partial<NsPrefix>) => {
    const next = state.prefixes.map((p, i) => (i === index ? { ...p, ...patch } : p));
    update({ prefixes: next });
  };

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="converter-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">XML declaration</h3>
        <div className="space-y-2">
          <label className="block text-xs text-gray-700 dark:text-gray-300">
            Version
            <input
              type="text"
              value={state.declarationVersion}
              onChange={(e) => update({ declarationVersion: e.target.value })}
              data-testid="decl-version"
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-gray-700 dark:text-gray-300">
            Encoding
            <input
              type="text"
              value={state.declarationEncoding}
              onChange={(e) => update({ declarationEncoding: e.target.value })}
              data-testid="decl-encoding"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Namespaces</h3>
        <label className="block text-xs text-gray-700 dark:text-gray-300">
          Default namespace URI
          <input
            type="text"
            value={state.defaultNamespace}
            onChange={(e) => update({ defaultNamespace: e.target.value })}
            data-testid="default-ns"
            placeholder="https://example.com/ns"
            className={inputClass}
          />
        </label>
        <ul className="mt-2 space-y-2">
          {state.prefixes.map((mapping, index) => (
            <li key={index} className="flex gap-2 items-center" data-testid={`prefix-row-${index}`}>
              <input
                type="text"
                value={mapping.prefix}
                onChange={(e) => setPrefix(index, { prefix: e.target.value })}
                placeholder="prefix"
                aria-label="prefix"
                className={`${inputClass} w-20`}
              />
              <input
                type="text"
                value={mapping.uri}
                onChange={(e) => setPrefix(index, { uri: e.target.value })}
                placeholder="namespace URI"
                aria-label="namespace URI"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => update({ prefixes: state.prefixes.filter((_, i) => i !== index) })}
                aria-label="Remove prefix mapping"
                data-testid={`remove-prefix-${index}`}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => update({ prefixes: [...state.prefixes, { prefix: '', uri: '' }] })}
          data-testid="add-prefix"
          className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Add prefix
        </button>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How it works</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {stepsFor(state).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
          <li>Arrays become repeated elements with an _item suffix.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>Ctrl+Shift+C</kbd> — copy XML output
          </li>
          <li>
            <kbd>Ctrl+Shift+X</kbd> — clear input
          </li>
        </ul>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        All conversion runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
