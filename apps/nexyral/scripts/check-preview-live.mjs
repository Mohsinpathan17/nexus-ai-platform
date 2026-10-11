import { chromium, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
mkdirSync('artifacts', {recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
// Real HTTPS responses through Node's verified environment CA; no content fixtures or TLS bypass.
await page.route('https://**/*',async route=>{
 const request=route.request();
 try{const response=await fetch(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()??undefined});const headers=Object.fromEntries(response.headers);for(const name of ['content-encoding','content-length','transfer-encoding'])delete headers[name];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}
 catch{await route.abort();}
});
try {
 for(const width of [390,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce',colorScheme:theme});
  await page.goto('https://nexyral.online/playground');await page.evaluate(()=>sessionStorage.removeItem('nexyral-playground-draft'));await page.reload();
  await page.getByRole('button',{name:'Run preview',exact:true}).click();const app=page.frameLocator('iframe[title="Your generated app"]');
  await expect(app.getByRole('heading',{name:'Make room for progress.'})).toBeVisible();
  await app.getByLabel("What's next?").fill('Try the live product');await app.getByRole('button',{name:'Add task',exact:true}).click();await expect(app.getByText('1 of 4 done')).toBeVisible();
  await app.getByRole('checkbox',{name:'Try the live product'}).check();await expect(app.getByText('2 of 4 done')).toBeVisible();
  await page.getByRole('button',{name:'Edit code',exact:true}).click();const editor=page.getByLabel('Edit App.tsx');await editor.fill((await editor.inputValue()).replace('Make room','Make something'));
  await page.getByRole('button',{name:'Preview changes',exact:true}).click();await page.getByRole('button',{name:'Run preview',exact:true}).click();await expect(app.getByRole('heading',{name:'Make something for progress.'})).toBeVisible();
  await page.getByRole('button',{name:'Mobile preview',exact:true}).click();expect(await app.locator('body').evaluate(element=>element.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download project',exact:true}).click();const downloaded=await downloading;expect(downloaded.suggestedFilename()).toBe('nexyral-project.zip');const zip=readFileSync(await downloaded.path());expect(zip.includes(Buffer.from('Make something'))).toBe(true);expect(zip.includes(Buffer.from('src/App.tsx'))).toBe(true);
  await page.screenshot({path:`artifacts/live-preview-${width}-${theme}.png`,fullPage:true});
  await page.goto('https://nexyral.online');await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(600);await page.screenshot({path:`artifacts/live-home-upgrade-${width}-${theme}.png`});await page.locator('.workspace-invite').screenshot({path:`artifacts/live-invite-${width}-${theme}.png`});
  console.log(JSON.stringify({width,theme,interaction:'passed',editing:'passed',export:'passed',overflow:false}));
 }
 await page.goto('https://nexyral.online/status');await expect(page.getByRole('status')).toContainText('Current configuration received');
 const rejected=await fetch('https://nexyral.online/api/cloud/projects/44444444-4444-4444-8444-444444444444/source',{method:'POST',headers:{Origin:'https://nexyral.online','Content-Type':'application/json'},body:'{}'});expect(rejected.status).toBe(401);
 expect(errors).toEqual([]);console.log(JSON.stringify({status:'passed',unauthenticatedEdit:'rejected',errors}));
}finally{await browser.close();}
