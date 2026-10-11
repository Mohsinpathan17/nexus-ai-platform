import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts',{recursive:true});
// All routed responses below are fetched from the live site with verified TLS.
// This retains the environment's proxy CA trust without bypassing browser TLS checks.
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
await page.route('https://**/*',async route=>{try{const request=route.request();const response=await fetch(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()??undefined});if(!response.ok)console.error('Live asset failed',new URL(request.url()).pathname,response.status);const headers=Object.fromEntries(response.headers);for(const key of ['content-encoding','content-length','transfer-encoding'])delete headers[key];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}catch(error){console.error('Live transport failed',new URL(route.request().url()).pathname,error.message);await route.abort();}});
await page.emulateMedia({reducedMotion:'reduce'});await page.goto('https://nexyral.online',{waitUntil:'domcontentloaded'});await page.locator('#showcase').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
for(const width of [1440,390]) {
await page.setViewportSize({width,height:900});
for(const name of ['Startup runway','Support inbox','Launch planner']){
 await page.getByRole('button',{name}).click();await page.waitForTimeout(1200);
 await expect(page.locator('iframe.live-preview')).toBeVisible();
 if(name==='Startup runway')await expect(page.locator('iframe.live-preview')).toHaveCSS('height','840px');
 const frame=await (await page.locator('iframe.live-preview').elementHandle()).contentFrame();
 await frame.waitForLoadState('domcontentloaded');
 if(name==='Startup runway'){await frame.getByLabel('Current Cash Balance ($)',{exact:true}).fill('100000');await frame.getByLabel('Monthly Operating Costs ($)',{exact:true}).fill('20000');await frame.getByLabel('Monthly Revenue ($)',{exact:true}).fill('10000');await expect(frame.locator('#runway')).toHaveText('10.0 Months');await frame.getByLabel('Monthly Revenue ($)',{exact:true}).fill('20000');await expect(frame.locator('#runway')).toHaveText('Sustainable');await frame.getByRole('button',{name:'Reset Defaults'}).click();await expect(frame.locator('#net-burn')).toHaveText('$15,000');}
 if(name==='Support inbox'){await frame.locator('.ticket-item').first().click();const before=await frame.locator('#open-count-label').innerText();await frame.getByRole('button',{name:'Mark Resolved',exact:true}).click();if(await frame.locator('#open-count-label').innerText()===before)throw new Error('Ticket count failed to update');await frame.getByRole('button',{name:'Reopen Ticket',exact:true}).click();await expect(frame.locator('#open-count-label')).toHaveText(before);await frame.getByLabel('Search tickets',{exact:true}).fill('nothingmatches123');await expect(frame.locator('#empty-state')).toBeVisible();await frame.getByLabel('Search tickets',{exact:true}).fill('');}
 if(name==='Launch planner'){await frame.getByLabel('New Task',{exact:true}).fill('Check live proof');await frame.getByRole('button',{name:'Add Task',exact:true}).click();await expect(frame.locator('#progress-text')).toHaveText('3 of 13 completed');await frame.getByRole('checkbox',{name:'Mark Check live proof as completed',exact:true}).check();await expect(frame.locator('#progress-text')).toHaveText('4 of 13 completed');await frame.getByRole('button',{name:'Delete task Check live proof',exact:true}).click();await expect(frame.locator('#progress-text')).toHaveText('3 of 12 completed');}
 if(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Preview overflow');
 console.log(JSON.stringify({name,width,status:'passed',preview:await page.locator('iframe.live-preview').evaluate(el=>({height:getComputedStyle(el).height,example:el.parentElement.dataset.example}))}));
}
}
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Startup runway'}).click();await expect(page.locator('iframe.live-preview')).toBeVisible();await page.waitForTimeout(800);await page.locator('#showcase').screenshot({path:'artifacts/live-examples-desktop.png'});
await page.setViewportSize({width:390,height:900});await page.locator('iframe.live-preview').scrollIntoViewIfNeeded();await page.waitForTimeout(300);await page.locator('.live-app-area').screenshot({path:'artifacts/live-examples-mobile.png'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);expect(errors).toEqual([]);console.log(JSON.stringify({overflow,errors}));await browser.close();
