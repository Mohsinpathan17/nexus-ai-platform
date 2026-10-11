import { test, expect } from '@playwright/test';
const source = { html: '<main><label>Cash<input id="cash" type="number" value="100"></label><output id="total">100</output><button id="reset">Reset</button></main>', css:'main{padding:24px}input{max-width:100%;display:block}',js:'const cash=document.querySelector("#cash");cash.addEventListener("input",()=>document.querySelector("#total").textContent=cash.value);document.querySelector("#reset").addEventListener("click",()=>{cash.value="100";document.querySelector("#total").textContent="100";});' };
for (const width of [390,1440]) test(`AI showcase renders isolated interactive output at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/examples/*',route=>route.fulfill({json:{id:route.request().url().split('/').pop(),source,model:'fixture-model',generatedAt:'2026-10-11T12:00:00Z',cached:true}}));
 await page.goto('/');await expect(page.getByText('Saved AI build',{exact:true})).toBeAttached();
 const preview=page.frameLocator('iframe.live-preview');await preview.getByLabel('Cash').fill('250');await expect(preview.locator('output')).toHaveText('250');
 await preview.getByRole('button',{name:'Reset',exact:true}).click();await expect(preview.locator('output')).toHaveText('100');
 await expect(page.locator('iframe.live-preview')).toHaveAttribute('sandbox','allow-scripts allow-forms');
 await page.getByRole('button',{name:'View code',exact:true}).click();await expect(page.getByLabel('Actual AI-generated source')).toContainText(source.js);
 await page.locator('.live-example-tabs').getByRole('button',{name:'Support inbox'}).click();await expect(page.locator('.live-brief h3')).toHaveText('Support inbox');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('a failed AI request shows an honest error and no substituted example',async({page})=>{
 await page.route('**/api/examples/*',route=>route.fulfill({status:route.request().method()==='POST'?502:200,json:route.request().method()==='POST'?{error:'AI provider returned 429. No example was substituted.'}:{status:'not-built'}}));
 await page.goto('/');await page.getByRole('button',{name:'Build this example',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'No example was substituted'})).toBeVisible();await expect(page.locator('iframe.live-preview')).toHaveCount(0);
});
test('isolated generated forms handle local submissions without navigation',async({page})=>{
 const formSource={html:'<form id="add"><label>Task<input id="task" required></label><button>Add task</button></form><output id="result"></output>',css:'',js:'document.querySelector("#add").addEventListener("submit",event=>{event.preventDefault();document.querySelector("#result").textContent=document.querySelector("#task").value;});'};
 await page.route('**/api/examples/*',route=>route.fulfill({json:{id:'runway',source:formSource,model:'fixture-model',generatedAt:'2026-10-11T12:00:00Z',cached:true}}));
 await page.goto('/');const frame=page.frameLocator('iframe.live-preview');await frame.getByLabel('Task',{exact:true}).fill('Ship the example');await frame.getByRole('button',{name:'Add task',exact:true}).click();await expect(frame.locator('output')).toHaveText('Ship the example');await expect(page).toHaveURL('/');
});
