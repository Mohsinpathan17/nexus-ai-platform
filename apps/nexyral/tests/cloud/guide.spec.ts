import {test,expect} from '@playwright/test';
for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Guide quick help ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme==='dark'?'dark':'light',reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Open NEXYRAL Guide'}).click();
 const dialog=page.getByRole('dialog',{name:'NEXYRAL Guide'});await expect(dialog).toBeVisible();await expect(page.getByRole('button',{name:'Close NEXYRAL Guide'})).toBeFocused();
 await page.getByRole('button',{name:'What can I build?'}).click();await expect(dialog.getByText(/Connected databases, payments/)).toBeVisible();
 await page.getByLabel('Ask NEXYRAL Guide').fill('Help me plan a booking app');await page.getByRole('button',{name:'Send question'}).click();await expect(dialog.getByRole('alert')).toContainText('Sign in to ask AI');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/guide-${width}-${theme}.png`});
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Open NEXYRAL Guide'})).toBeFocused();
 await page.getByRole('button',{name:'Open NEXYRAL Guide'}).click();await page.getByRole('link',{name:'Try a working example'}).click();await expect(page).toHaveURL(/playground/);await expect(dialog).toHaveCount(0);expect(errors).toEqual([]);
 });
}
