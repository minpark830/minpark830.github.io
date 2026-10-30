import { expect, test, type Page } from '@playwright/test';

const cell = (page: Page, id: string) => page.locator(`#pl-${id}`);

/** Set a slider the way a drag would, firing input and change. */
async function slide(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/projects/motion/');
});

test('the default limits pass both requirements', async ({ page }) => {
  await expect(cell(page, 'time').locator('.num')).toHaveText('1.50 s');
  await expect(cell(page, 'res').locator('.num')).toHaveText('0.01 mm');
  await expect(cell(page, 'ramp').locator('.num')).toHaveText('250 ms');
  await expect(page.locator('#pl-advice')).toHaveText('Both requirements pass.');
  await expect(page.locator('#pl-tr-v')).toHaveAttribute('d', /^M/);
  await expect(page.locator('#pl-tr-q')).toHaveAttribute('d', /^M/);
});

test('a stiffer jerk limit finishes sooner but leaves the payload swinging', async ({ page }) => {
  // 75 slider steps above 8 m/s³ is 8 × 10^(75/250), about 16 m/s³
  await slide(page, 'pl-j', 75);
  await expect(page.locator('#pl-j-out')).toHaveText('16.0');
  await expect(page.locator('#pl-c-j')).toHaveText('16.0f');
  await expect(cell(page, 'res')).toHaveClass(/fail/);
  await expect(cell(page, 'time')).toHaveClass(/pass/);
  await expect(cell(page, 'ramp').locator('.num')).toHaveText('125 ms');
  await expect(page.locator('#pl-advice')).toHaveText(/Lower jmax to about 8\.$/);
});

test('a swing too big for the display is marked off scale', async ({ page }) => {
  const name = page.locator('#pl-name-q');
  await expect(name).toHaveText('payload swing, mm');
  await slide(page, 'pl-a', 4);
  await slide(page, 'pl-j', 349); // the stiffest jerk limit: ramps of 20 ms
  await expect(cell(page, 'res').locator('.num')).toHaveText(/^\d+\.\d\d\smm$/);
  await expect(name).toHaveText('payload swing, mm, off scale');
  await page.getByRole('button', { name: 'Reset limits' }).click();
  await expect(name).toHaveText('payload swing, mm');
});

test('too little acceleration makes the move too slow', async ({ page }) => {
  await slide(page, 'pl-a', 1);
  await slide(page, 'pl-j', -75); // about 4 m/s³: ramps stay one period long
  await expect(cell(page, 'time')).toHaveClass(/fail/);
  await expect(cell(page, 'res')).toHaveClass(/pass/);
  await expect(page.locator('#pl-advice')).toHaveText('Too slow. Raise amax, then match jmax to it again.');
});

test('the comparison draws the move with no jerk limit', async ({ page }) => {
  await expect(page.locator('#pl-lg-trap')).toBeHidden();
  await page.getByLabel('Compare with no jerk limit').check();
  await expect(page.locator('#pl-lg-trap')).toBeVisible();
  await expect(page.locator('#pl-trap-q')).toHaveAttribute('d', /^M/);
});

test('reset restores the default limits', async ({ page }) => {
  await slide(page, 'pl-a', 3.5);
  await page.getByRole('button', { name: 'Reset limits' }).click();
  await expect(page.locator('#pl-a')).toHaveValue('2');
  await expect(page.locator('#pl-advice')).toHaveText('Both requirements pass.');
});

test('the jerk slider works from the keyboard and says its value in units', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no keyboard on the phone profile');
  const jerk = page.getByRole('slider', { name: /jmax/ });
  await jerk.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#pl-j-out')).toHaveText('8.07');
  await expect(jerk).toHaveAttribute('aria-valuetext', '8.07 meters per second cubed');
});
