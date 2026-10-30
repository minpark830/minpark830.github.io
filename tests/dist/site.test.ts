/**
 * Checks on the built site in dist/, run after `npm run build`: every
 * internal link and asset resolves, every page carries its metadata, and the
 * page weight stays inside its budget.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const DIST = join(process.cwd(), 'dist');
const SITE = 'https://minpark830.github.io';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const html = new Map(pages.map((f) => [f, readFileSync(f, 'utf8')]));

/** The URL path a page is served at. */
const urlOf = (file: string) => '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');

const attr = (source: string, name: string) =>
  [...source.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1] ?? '');

const ids = (source: string) => attr(source, 'id');

/** Resolve a site path to a file in dist, the way GitHub Pages does. */
function resolve(path: string): string | null {
  const clean = decodeURI(path.split(/[?#]/)[0] ?? '');
  const candidates = clean.endsWith('/') ? [join(DIST, clean, 'index.html')] : [join(DIST, clean), join(DIST, clean, 'index.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

describe('the built site', () => {
  it('has the pages it should', () => {
    expect(pages.map(urlOf).sort()).toEqual([
      '/',
      '/404.html',
      '/projects/fotomagic/',
      '/projects/motion/',
      '/projects/servo/',
      '/projects/swarm/',
    ]);
  });

  for (const [file, source] of html) {
    const url = urlOf(file);

    describe(url, () => {
      it('has one h1, a title, a description, and Open Graph tags', () => {
        expect(source.match(/<h1[\s>]/g)).toHaveLength(1);
        expect(source).toMatch(/<title>[^<]+<\/title>/);
        expect(source).toMatch(/<meta name="description" content="[^"]{50,}"/);
        expect(source).toMatch(/<meta property="og:image" content="https:\/\/minpark830\.github\.io\/assets\/og-image\.png"/);
        expect(source).toMatch(/<html lang="en">/);
      });

      it(url === '/404.html' ? 'is kept out of search results' : 'names its canonical address', () => {
        if (url === '/404.html') expect(source).toContain('<meta name="robots" content="noindex">');
        else expect(source).toContain(`<link rel="canonical" href="${SITE}${url}">`);
      });

      it('has no duplicate ids', () => {
        const all = ids(source);
        const dupes = all.filter((id, i) => all.indexOf(id) !== i);
        expect(dupes).toEqual([]);
      });

      it('links only to pages, files, and anchors that exist', () => {
        const refs = [
          ...attr(source, 'href'),
          ...attr(source, 'src'),
          ...attr(source, 'srcset').flatMap((s) => s.split(',').map((part) => part.trim().split(/\s+/)[0] ?? '')),
        ];
        const broken: string[] = [];
        for (const ref of refs) {
          if (!ref || /^(https?:|mailto:|data:)/.test(ref)) continue;
          if (ref.startsWith('#')) {
            if (ref.length > 1 && !ids(source).includes(ref.slice(1))) broken.push(ref);
            continue;
          }
          const target = resolve(ref.startsWith('/') ? ref : new URL(ref, `${SITE}${url}`).pathname);
          if (!target) {
            broken.push(ref);
            continue;
          }
          const hash = ref.split('#')[1];
          if (hash && target.endsWith('.html') && !ids(html.get(target) ?? '').includes(hash)) broken.push(ref);
        }
        expect(broken).toEqual([]);
      });

      it('uses https for every outside link', () => {
        const insecure = attr(source, 'href').filter((h) => h.startsWith('http:'));
        expect(insecure).toEqual([]);
      });
    });
  }

  it('lists every page except the 404 page in the sitemap', () => {
    const sitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
    for (const page of pages.map(urlOf).filter((u) => u !== '/404.html')) {
      expect(sitemap).toContain(`<loc>${SITE}${page}</loc>`);
    }
    expect(sitemap).not.toContain('404');
  });

  it('keeps the code a visitor downloads small', () => {
    const gz = (f: string) => gzipSync(readFileSync(f)).length;
    const js = files.filter((f) => f.endsWith('.js')).reduce((n, f) => n + gz(f), 0);
    const css = files.filter((f) => f.endsWith('.css')).reduce((n, f) => n + gz(f), 0);
    const home = gz(join(DIST, 'index.html'));
    // Budgets in gzipped bytes. Raise them on purpose, not by accident.
    expect(js).toBeLessThan(12_000);
    expect(css).toBeLessThan(14_000);
    expect(home).toBeLessThan(24_000);
  });

  it('serves the resume at the address used in applications', () => {
    expect(existsSync(join(DIST, 'assets', 'Minwoo_Park_Resume.pdf'))).toBe(true);
  });
});
