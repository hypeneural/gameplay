import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouter } from './AppRouter.js';

describe('AppRouter Remote Session Security & Loading', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        pathname: '/s/cust-token-xyz',
        search: '',
      },
      history: {
        state: null,
        replaceState: vi.fn(),
        pushState: vi.fn(),
        back: vi.fn(),
      },
      scrollTo: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    vi.stubGlobal('document', {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders ChristmasLoadingExperience without leaking fixtures when capability token route loads', () => {
    const html = renderToStaticMarkup(React.createElement(AppRouter));
    expect(html).toContain('SEU ÁLBUM DE NATAL');
    expect(html).toContain('Preparando suas lembranças…');
    expect(html).not.toContain('Escolha seus jogos');
    expect(html).not.toContain('NATAL EM FAMÍLIA');
  });

  it('renders fixture-backed demo hub on public demo route /s/local-demo-token', () => {
    (window.location as { pathname: string }).pathname = '/s/local-demo-token';
    const html = renderToStaticMarkup(React.createElement(AppRouter));
    expect(html).toContain('Escolha seus jogos');
    expect(html).toContain('NATAL EM FAMÍLIA');
  });

  it('renders ThemeLab when accessing development route in dev mode', () => {
    (window.location as { pathname: string }).pathname = '/__dev/theme';
    const html = renderToStaticMarkup(React.createElement(AppRouter));
    expect(html).toContain('Mostruário do tema');
    expect(html).toContain('DESENVOLVIMENTO');
  });
});
