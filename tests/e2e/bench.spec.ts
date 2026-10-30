import { expect, test, type Page } from '@playwright/test';

const cell = (page: Page, id: string) => page.locator(`#req-${id}`);

/** Set a slider the way a drag would, firing input and change. */
async function setGain(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the default gains pass all three requirements', async ({ page }) => {
  await expect(cell(page, 'os').locator('.num')).toHaveText('2.7%');
  await expect(cell(page, 'ts').locator('.num')).toHaveText('0.26\u202fs');
  await expect(cell(page, 'ld').locator('.num')).toHaveText('0.51%');
  for (const id of ['os', 'ts', 'ld']) await expect(cell(page, id)).toHaveClass(/pass/);
  await expect(page.locator('#advice')).toHaveText('All three requirements pass.');
  await expect(page.locator('#p-pos')).toHaveAttribute('d', /^M/);
});

test('without integral action the load pulls the servo off target', async ({ page }) => {
  await setGain(page, 'ki', 0);
  await expect(cell(page, 'ld')).toHaveClass(/fail/);
  await expect(cell(page, 'ld').locator('.num')).toHaveText(/^2\.0\d%$/);
  await expect(page.locator('#advice')).toHaveText('The load pulls it off target. Raise Ki.');
  await expect(page.locator('#c-ki')).toHaveText(' 0.0f');
  await expect(page.locator('#ki-out')).toHaveText('0.0');
  // the previous response stays on screen for comparison
  await expect(page.locator('#lg-ghost')).toBeVisible();
});

test('reset restores the default gains', async ({ page }) => {
  await setGain(page, 'kd', 0);
  await expect(cell(page, 'os')).toHaveClass(/fail/);
  await page.getByRole('button', { name: 'Reset gains' }).click();
  await expect(page.locator('#kd')).toHaveValue('0.4');
  await expect(page.locator('#advice')).toHaveText('All three requirements pass.');
});

test('the sliders work from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no keyboard on the phone profile');
  const kp = page.getByRole('slider', { name: /Kp/ });
  await kp.focus();
  await page.keyboard.press('ArrowRight');
  await expect(kp).toHaveValue('15.1');
  await expect(page.locator('#kp-out')).toHaveText('15.1');
  await expect(page.locator('#c-kp')).toHaveText('15.1f');
});

test('the controller source opens and shows the C++ the tests compile', async ({ page }) => {
  await page.getByText('Show the controller source').click();
  await expect(page.locator('.source')).toContainText('struct Pid');
  await expect(page.locator('.source')).toContainText('TIM2_IRQHandler');
});
