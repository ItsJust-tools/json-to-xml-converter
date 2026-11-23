import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { jsonToXmlConverterTool } from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { DEFAULT_STATE as BASE_DEFAULT_STATE } from '@/tool/types';
import type { ToolState } from '@/tool/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    expect(jsonToXmlConverterTool.name).toBe(toolConfig.name);
    expect(
      jsonToXmlConverterTool.deserialize({
        jsonInput: '{"a":1}',
        minify: true,
        history: [{ text: '1 line of XML', createdAt: '2026-11-23T10:00:00.000Z' }],
      })
    ).toEqual({
      success: true,
      data: {
        jsonInput: '{"a":1}',
        includeDeclaration: BASE_DEFAULT_STATE.includeDeclaration,
        declarationVersion: BASE_DEFAULT_STATE.declarationVersion,
        declarationEncoding: BASE_DEFAULT_STATE.declarationEncoding,
        attributeNotation: BASE_DEFAULT_STATE.attributeNotation,
        indentSize: BASE_DEFAULT_STATE.indentSize,
        minify: true,
        defaultNamespace: BASE_DEFAULT_STATE.defaultNamespace,
        prefixes: BASE_DEFAULT_STATE.prefixes,
        history: [{ text: '1 line of XML', createdAt: '2026-11-23T10:00:00.000Z' }],
      },
    });
    const repaired = jsonToXmlConverterTool.deserialize({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.jsonInput).toBe(BASE_DEFAULT_STATE.jsonInput);
      expect(repaired.data.history).toEqual([]);
    }
    expect(jsonToXmlConverterTool.serialize({ ...BASE_DEFAULT_STATE, minify: true })).toContain(
      '"minify":true'
    );
    expect(jsonToXmlConverterTool.exporters ?? []).toHaveLength(0);
  });

  it('renders tool components', () => {
    const sample: ToolState = { ...BASE_DEFAULT_STATE, jsonInput: '{"a":1, "b": "x&y"}' };
    render(
      <>
        <Toolbar state={{ ...BASE_DEFAULT_STATE }} onChange={() => {}} onClear={() => {}} />
        <Sidebar state={{ ...BASE_DEFAULT_STATE }} onChange={() => {}} />
        <Canvas state={sample} onChange={() => {}} />
      </>
    );

    expect(screen.getByTestId('opt-minify')).toBeInTheDocument();
    expect(screen.getByTestId('add-prefix')).toBeInTheDocument();
    expect(screen.getByTestId('xml-output')).toHaveTextContent(/<a>1<\/a>/);
    expect(screen.getByTestId('xml-output')).toHaveTextContent('x&amp;y');
  });
});
