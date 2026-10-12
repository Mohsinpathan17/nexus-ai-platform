import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const base='https://nexyral.online';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
// Fetch actual HTTPS responses through Node's configured, verified TLS trust.
await page.route('https://**/*',async route=>{
 const request=route.request();try{const response=await fetch(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()??undefined});const headers=Object.fromEntries(response.headers);for(const key of ['content-encoding','content-length','transfer-encoding'])delete headers[key];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}catch{await route.abort();}
});
try{
 for(const width of [390,768,1440])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Open NEXYRAL Guide'}).click();const dialog=page.getByRole('dialog',{name:'NEXYRAL Guide'});await expect(dialog).toBeVisible();
 await expect(page.getByRole('button',{name:'Close NEXYRAL Guide'})).toBeFocused();
 await page.getByRole('button',{name:'What can I build?'}).click();await expect(dialog.getByText(/Connected databases, payments/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/live-guide-${width}-${theme}.png`});
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Open NEXYRAL Guide'})).toBeFocused();
 expect(await page.evaluate(()=>document.getElementById('nexyral-app').inert)).toBe(false);
 console.log(JSON.stringify({width,theme,quickHelp:'passed',keyboard:'passed',overflow:false}));
 }
 const response=await fetch(base+'/api/cloud/guide',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',text:'Help me plan a booking app'}]})});expect(response.status).toBe(401);
 expect(errors).toEqual([]);console.log(JSON.stringify({unauthenticatedAI:'rejected',errors}));
}finally{await browser.close();}
