import { chromium,expect } from '@playwright/test';
import {mkdirSync} from 'node:fs';
const base=process.env.NEXYRAL_VISUAL_URL??'https://nexyral.online';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
async function actual(route,url=route.request().url()) {const request=route.request();try{const response=await fetch(url,{method:request.method(),headers:request.headers(),body:request.postData()??undefined});const headers=Object.fromEntries(response.headers);for(const key of ['content-encoding','content-length','transfer-encoding'])delete headers[key];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}catch{await route.abort();}}
await page.route('https://**/*',route=>actual(route));
if(!base.startsWith('https://'))await page.route('**/api/examples/*',route=>actual(route,'https://nexyral.online'+new URL(route.request().url()).pathname));
try{
 for(const width of [390,768,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce',colorScheme:theme});await page.goto(base,{waitUntil:'domcontentloaded'});await expect(page.locator('.core-render')).toHaveAttribute('data-render-ready','true');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`artifacts/dimensional-home-${width}-${theme}.png`});
  const canvas=page.locator('.core-render canvas');await page.locator('.hero-visual').scrollIntoViewIfNeeded();const collapsed=await canvas.screenshot();await page.getByRole('button',{name:'Inspect Core layers'}).click();await expect(page.getByRole('button',{name:'Inspect Core layers'})).toHaveAttribute('aria-pressed','true');expect(collapsed.equals(await canvas.screenshot())).toBe(false);
  await page.locator('.hero-visual').screenshot({path:`artifacts/dimensional-core-${width}-${theme}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);console.log(JSON.stringify({width,theme,coreInspection:'passed',overflow:false}));
 }
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base);await page.locator('.invite-diagram').scrollIntoViewIfNeeded();const box=await page.locator('.invite-diagram').boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.2);expect(await page.locator('.invite-diagram').evaluate(element=>element.style.getPropertyValue('--depth-x'))).not.toBe('0deg');await page.locator('.workspace-invite').screenshot({path:'artifacts/dimensional-invite-desktop.png'});await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.invite-diagram')).toHaveCSS('transform','none');
 expect(errors).toEqual([]);console.log(JSON.stringify({pointerDepth:'passed',reducedMotion:'passed',errors}));
}finally{await browser.close();}
