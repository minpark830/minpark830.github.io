// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://minpark830.github.io',
  trailingSlash: 'always',
  // Astro 7 defaults to JSX-style whitespace; the prose here is written for
  // HTML whitespace rules, so keep the v6 behavior.
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: { shikiConfig: { theme: 'css-variables' } },
});
