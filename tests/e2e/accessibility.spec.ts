import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/projects/swarm/', '/projects/fotomagic/', '/projects/servo/', '/projects/motion/', '/no-such-page/'];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const path of pages) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(path);
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      });
    }
  });
}

test('the theme button switches themes and remembers the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Switch to dark theme' });
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('no page scrolls sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of pages) {
    await page.goto(path);
    // On failure, name the innermost elements that reach past the edge
    // outside any scrolling box, so a CI failure says what to fix.
    const { width, past } = await page.evaluate(() => {
      const edge = document.documentElement.clientWidth + 0.5;
      const inScroller = (el: Element) => {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)) return true;
        }
        return false;
      };
      const over = [...document.querySelectorAll('body *')].filter(
        (el) => el.getBoundingClientRect().right > edge && !inScroller(el),
      );
      const innermost = over.filter((el) => !over.some((o) => o !== el && el.contains(o)));
      return {
        width: document.documentElement.scrollWidth,
        past: innermost.slice(0, 4).map((el) => {
          const name = el.tagName.toLowerCase() + (el.classList.length ? `.${[...el.classList].join('.')}` : '');
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
          return `${name} to ${Math.round(el.getBoundingClientRect().right)}px ("${text}")`;
        }),
      };
    });
    expect(width, `${path} past the edge: ${past.join('; ') || 'nothing found'}`).toBeLessThanOrEqual(360);
  }
});

test('a keyboard user can skip straight to the content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no keyboard on the phone profile');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});
