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
  await expect(page.locator('.core-render')).toHaveAttribute('data-render-ready', 'true');
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

test('public Focus workspace persists work, supports search and deletion, and exports actual tasks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/examples/focus');
  await page.getByLabel('New demo task').fill('Ship the customer portal');
  await page.getByLabel('New task priority').selectOption('high');
  await page.getByRole('button', { name: 'Add demo task', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Ship the customer portal' })).toBeVisible();
  await page.getByLabel('Search demo tasks').fill('customer portal');
  await expect(page.getByRole('checkbox', { name: 'Build the interface', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Ship the customer portal' }).check();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export tasks' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('focus-tasks.json');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('No export contents');
  const parts: Buffer[] = []; for await (const part of stream) parts.push(Buffer.from(part));
  const exported = JSON.parse(Buffer.concat(parts).toString());
  expect(exported.tasks).toContainEqual(expect.objectContaining({ title: 'Ship the customer portal', done: true, priority: 'high' }));
  await page.getByRole('button', { name: 'Delete task: Ship the customer portal', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Ship the customer portal' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invalid or unavailable local storage leaves Focus usable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nexyral-focus-v1', '[{"id":"broken","title":7}]');
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await page.goto('/examples/focus');
  await expect(page.getByRole('checkbox', { name: 'Build the interface', exact: true })).toBeVisible();
  await page.getByLabel('New demo task').fill('Still usable without storage');
  await page.getByRole('button', { name: 'Add demo task', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Still usable without storage' })).toBeVisible();
  await expect(page.getByText('Temporary session', { exact: true })).toBeVisible();
});

test('mobile navigation returns keyboard focus and highlights the current page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Pricing', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
});
