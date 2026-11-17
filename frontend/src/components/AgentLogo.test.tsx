import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentLogo } from './AgentLogo';

describe('AgentLogo Component', () => {
  it('renders SVG with default dimensions and accessibility aria-label', () => {
    const html = renderToStaticMarkup(<AgentLogo />);
    expect(html).toContain('<svg');
    expect(html).toContain('width="28"');
    expect(html).toContain('height="28"');
    expect(html).toContain('aria-label="Learnability AI Scholar"');
  });

  it('renders custom sizes and variants correctly', () => {
    const htmlLg = renderToStaticMarkup(<AgentLogo size="lg" variant="emerald" label="Custom Scholar" />);
    expect(htmlLg).toContain('width="36"');
    expect(htmlLg).toContain('height="36"');
    expect(htmlLg).toContain('aria-label="Custom Scholar"');
    expect(htmlLg).toContain('#34D399');
  });

  it('renders numeric size when specified', () => {
    const html = renderToStaticMarkup(<AgentLogo size={64} />);
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
  });
});
