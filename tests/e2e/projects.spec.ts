import { expect, test } from '@playwright/test';

const visibleCards = (page: import('@playwright/test').Page) => page.locator('#proj-grid > article:visible');

test('choosing a role filters the projects and updates the address', async ({ page }) => {
  await page.goto('/');
  const filter = page.getByRole('group', { name: 'Show projects for' });
  await expect(filter).toBeVisible();
  await expect(visibleCards(page)).toHaveCount(7);

  await filter.getByRole('radio', { name: /Controls/ }).check();
  await expect(page).toHaveURL(/\?for=controls$/);
  await expect(visibleCards(page)).toHaveCount(2);
  await expect(page.locator('#role-note')).toContainText('Showing 2 projects for controls roles.');
  await expect(page.locator('#more-projects')).toBeHidden();

  await filter.getByRole('radio', { name: /All roles/ }).check();
  await expect(page).toHaveURL(/\/$/);
  await expect(visibleCards(page)).toHaveCount(7);
});

test('a link with ?for= opens the page already filtered', async ({ page }) => {
  await page.goto('/?for=electrical');
  await expect(page.getByRole('radio', { name: /Electrical/ })).toBeChecked();
  await expect(visibleCards(page)).toHaveCount(4);
  await expect(page.locator('#more-projects')).toBeVisible();
});

test('a video loads the YouTube player only when asked', async ({ page }) => {
  // Keep the test offline: answer the player request with an empty page.
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ body: '' }));
  await page.goto('/');
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('link', { name: 'Play video: Crazyflie swarm controller demo' }).click();
  const player = page.locator('iframe[title="Crazyflie swarm controller demo"]');
  await expect(player).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/4RDGtc2B57w/);
});
