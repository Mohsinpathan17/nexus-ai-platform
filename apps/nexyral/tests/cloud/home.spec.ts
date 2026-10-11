import { test, expect } from '@playwright/test';

for (const width of [375, 1440]) {
  test(`free homepage example at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: width === 375 ? 'light' : 'dark' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByLabel('New demo task').fill('Review the launch');
    await page.getByRole('button', { name: 'Add demo task', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Review the launch' }).check();
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Review the launch' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Build the interface', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Review the launch' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start building free' })).toHaveAttribute('href', '/get-started');
    await expect(page.getByText('No credit card required.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /subscribe/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('mobile Core rotates, pauses, and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const canvas = page.locator('.core-render canvas');
  await expect(canvas).toBeVisible();
  await page.locator('.hero-visual').scrollIntoViewIfNeeded();
  const before = await canvas.screenshot();
  await page.waitForTimeout(900);
  expect(before.equals(await canvas.screenshot())).toBe(false);
  await page.getByRole('button', { name: 'Pause Core rotation' }).click();
  await expect(page.getByRole('button', { name: 'Resume Core rotation' })).toBeVisible();
  await page.waitForTimeout(200);
  const paused = await canvas.screenshot();
  await page.waitForTimeout(400);
  expect(paused.equals(await canvas.screenshot())).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.core-motion-control button')).toBeDisabled();
  await page.locator('.core-stage-buttons button').nth(2).click();
  await expect(page.locator('.core-controls p')).toContainText('Approved scope');
});
