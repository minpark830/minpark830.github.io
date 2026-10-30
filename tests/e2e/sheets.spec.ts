import { expect, test } from '@playwright/test';

const sheets = [
  { path: '/', title: 'Minwoo Park', n: '1 of 5' },
  { path: '/projects/swarm/', title: 'Crazyflie swarm controller', n: '2 of 5' },
  { path: '/projects/fotomagic/', title: 'FotoMagic photo editor', n: '3 of 5' },
  { path: '/projects/servo/', title: 'How the live servo works', n: '4 of 5' },
  { path: '/projects/motion/', title: 'Jerk-limited motion planner', n: '5 of 5' },
];

for (const s of sheets) {
  test(`${s.path} renders without errors and is numbered ${s.n}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(s.path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(s.title);
    await expect(page.locator('.titleblock')).toContainText(s.n);
    expect(errors).toEqual([]);
  });
}

test('the sheets link to one another in a loop', async ({ page }) => {
  await page.goto('/projects/swarm/');
  for (const next of ['FotoMagic photo editor', 'How the live servo works', 'Jerk-limited motion planner', 'Crazyflie swarm controller']) {
    await page.getByRole('link', { name: new RegExp(`Next sheet ${next}`) }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(next);
  }
});

test('a missing page returns 404 with a way back', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist.");
  await page.getByRole('link', { name: 'Go to the home page' }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/$/);
});
