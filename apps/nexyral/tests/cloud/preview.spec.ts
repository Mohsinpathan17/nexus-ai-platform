import { test, expect } from '@playwright/test';
for (const width of [375, 768, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`open workspace ${width}px ${theme}: React interactions, mobile preview, editing and export`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.goto('/playground');
    await expect(page.getByRole('heading', {name:'See it. Change it. Make it yours.'})).toBeVisible();
    await page.getByRole('button', {name:'Run preview',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Preview running'})).toBeVisible();
    const app = page.frameLocator('iframe[title="Your generated app"]');
    await expect(app.getByRole('heading', {name:'Make room for progress.'})).toBeVisible();
    await app.getByLabel("What's next?").fill('Check the new workspace');
    await app.getByRole('button', {name:'Add task',exact:true}).click();
    await expect(app.getByText('1 of 4 done')).toBeVisible();
    await app.getByRole('checkbox', {name:'Check the new workspace'}).check();
    await expect(app.getByText('2 of 4 done')).toBeVisible();
    await page.getByRole('button', {name:'Mobile preview',exact:true}).click();
    await expect(page.locator('.preview-viewport')).toHaveClass(/mobile/);
    await page.getByRole('button', {name:'Edit code',exact:true}).click();
    const editor = page.getByLabel('Edit App.tsx');
    await editor.fill((await editor.inputValue()).replace('Make room', 'A clearer path'));
    await page.getByRole('button', {name:'Preview changes',exact:true}).click();
    // Switching views intentionally starts a fresh sandbox; no stale runtime state leaks across edits.
    await page.getByRole('button', {name:'Run preview',exact:true}).click();
    await expect(app.getByRole('heading', {name:'A clearer path for progress.'})).toBeVisible();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', {name:'Download project',exact:true}).click();
    expect((await downloadEvent).suggestedFilename()).toBe('nexyral-project.zip');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await app.locator('body').evaluate(element => element.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`artifacts/preview-${width}-${theme}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}
test('syntax and runtime errors are recoverable; preview cannot read the account page or make network requests', async ({page}) => {
  await page.goto('/playground');
  await page.getByRole('button', {name:'Edit code',exact:true}).click();
  await page.getByLabel('Edit App.tsx').fill('export default function App() { return <main>broken');
  await page.getByRole('button', {name:'Preview changes',exact:true}).click();
  await page.getByRole('button', {name:'Run preview',exact:true}).click();
  await expect(page.locator('.preview-status[role=alert]')).toBeVisible();
  await page.getByRole('button', {name:'Edit code',exact:true}).click();
  await page.getByLabel('Edit App.tsx').fill('export default function App(){throw new Error("A recoverable app error")}');
  await page.getByRole('button', {name:'Preview changes',exact:true}).click();
  await page.getByRole('button', {name:'Run preview',exact:true}).click();
  await expect(page.locator('.preview-status[role=alert]')).toContainText('A recoverable app error');
  let requests = 0;
  await page.route('**/should-never-reach-server', async route => {requests++; await route.fulfill({body:'unexpected'});});
  await page.getByRole('button', {name:'Edit code',exact:true}).click();
  await page.getByLabel('Edit App.tsx').fill(`import {useState, useEffect} from 'react';
export default function App(){const [state,setState]=useState('checking');useEffect(()=>{let blocked=false;try{parent.document.body.innerHTML='unsafe';}catch{blocked=true;}let storage=false;try{localStorage.getItem('account');}catch{storage=true;}fetch('http://127.0.0.1:4181/should-never-reach-server').then(()=>setState('unsafe network')).catch(()=>setState(blocked&&storage?'Account and network isolated':'unsafe access'));},[]);return <main>{state}</main>}`);
  await page.getByRole('button', {name:'Preview changes',exact:true}).click();
  await page.getByRole('button', {name:'Run preview',exact:true}).click();
  await expect(page.frameLocator('iframe').getByText('Account and network isolated')).toBeVisible();
  expect(requests).toBe(0);
  await expect(page.getByRole('heading', {name:'See it. Change it. Make it yours.'})).toBeVisible();
});
test('unsaved edits recover after a tab reload and discarded edits restore the original source',async({page})=>{
 await page.goto('/playground');await page.getByRole('button',{name:'Edit code',exact:true}).click();const original=await page.getByLabel('Edit App.tsx').inputValue();const changed=original.replace('Make room','Keep moving');await page.getByLabel('Edit App.tsx').fill(changed);
 await page.reload();await page.getByRole('button',{name:'Edit code',exact:true}).click();await expect(page.getByLabel('Edit App.tsx')).toHaveValue(changed);await expect(page.locator('.cloud-copy-notice')).toContainText('Unsaved edits restored');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Discard edits',exact:true}).click();await expect(page.getByLabel('Edit App.tsx')).toHaveValue(original);expect(await page.evaluate(()=>sessionStorage.getItem('nexyral-playground-draft'))).toBeNull();
});
test('status reports actual configuration, recovers from failures, and public policy pages are readable',async({page})=>{
 let fail=true;await page.route('**/api/health',route=>route.fulfill({status:fail?503:200,json:fail?{error:'Unavailable'}:{status:'ok',generationConfigured:true,emailCodeDeliveryConfigured:true}}));
 await page.goto('/status');await expect(page.getByRole('status')).toContainText('Service check failed');fail=false;await page.getByRole('button',{name:'Check again'}).click();await expect(page.getByRole('status')).toContainText('Current configuration received');await expect(page.getByText('Configured · subject to provider availability')).toBeVisible();
 for(const route of ['/privacy','/terms']){await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.route-articles article')).toHaveCount(5);}
});
