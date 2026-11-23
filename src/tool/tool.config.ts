import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'json-to-xml-converter',
  name: 'JSON to XML Converter',
  description:
    'Convert JSON data to well-formed XML with attribute notation support, namespace prefixes, pretty printing and copy/download output. All client-side, privacy-first.',
  version: '1.0.0',
  exportFormats: ['json'] as const,
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'JSON to XML Converter',
    icon: '</>',
  },
  shortcuts: [
    {
      title: 'JSON to XML Converter',
      shortcuts: [
        { keys: 'Ctrl+Shift+C', label: 'Copy Output', description: 'copy XML output to clipboard' },
        {
          keys: 'Ctrl+Shift+X',
          label: 'Clear Input',
          description: 'clear input, output, and error state',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
