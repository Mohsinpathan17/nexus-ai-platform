import {test,expect} from '@playwright/test';
const response={id:'runway',source:{html:'<main><h1>Sample generated app</h1></main>',css:'main{padding:24px}',js:''},model:'fixture',generatedAt:'2026-10-11T12:00:00Z',cached:true};
test('plain-language homepage guides a first idea into signup and preserves it across reload',async({page})=>{
 await page.route('**/api/examples/*',route=>route.fulfill({json:response}));
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toHaveText('Describe an app.AI writes the code.');
 await page.getByRole('link',{name:'Describe your app',exact:true}).click();await expect(page).toHaveURL(/#start$/);
 await page.getByRole('button',{name:'Use business dashboard idea',exact:true}).click();await expect(page.getByLabel('What would you like to make?',{exact:true})).toHaveValue(/small business dashboard/);
 const idea='Create a website for my bakery with a menu and opening hours.';await page.getByLabel('What would you like to make?',{exact:true}).fill(idea);
 await page.getByRole('button',{name:'Continue with this idea',exact:true}).click();await expect(page).toHaveURL('/get-started');await expect(page.getByText('Your idea is saved for this tab.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('nexyral-build-draft'))).toBe(idea);
 await page.reload();expect(await page.evaluate(()=>sessionStorage.getItem('nexyral-build-draft'))).toBe(idea);
});
test('FAQ is keyboard operable and advanced engineering stays optional',async({page})=>{
 await page.route('**/api/examples/*',route=>route.fulfill({json:response}));await page.goto('/');
 const question=page.locator('summary').filter({hasText:'What does NEXYRAL actually make?'});await question.focus();await page.keyboard.press('Enter');await expect(page.getByText('It uses AI to create frontend code:',{exact:false})).toBeVisible();
 const vision=page.locator('.engineering-disclosure');await expect(vision).not.toHaveAttribute('open','');await expect(page.locator('#engine')).not.toBeVisible();
 await vision.locator(':scope > summary').click();await expect(page.locator('#engine')).toBeVisible();
});
test('blocked storage explains recovery and leaves the idea editable',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError');};});
 await page.route('**/api/examples/*',route=>route.fulfill({json:response}));await page.goto('/');await page.getByRole('button',{name:'Continue with this idea',exact:true}).click();await expect(page.getByRole('alert')).toContainText('blocked draft storage');await expect(page.getByLabel('What would you like to make?',{exact:true})).toBeEditable();await page.getByRole('button',{name:'Open the workspace',exact:true}).click();await expect(page).toHaveURL('/get-started');
});
