import { test, expect, type Page } from '@playwright/test';
async function fixtures(page: Page, initiallyVerified = true, sourceConflict = false, refineFailure = false) {
  let verified = initiallyVerified;
  const now = Math.floor(Date.now()/1000);
  const token = `${Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'fixture-user',user_id:'fixture-user',aud:'nexyral',iss:'https://securetoken.google.com/nexyral',iat:now,exp:now+3600,email:'builder@example.invalid',email_verified:initiallyVerified,firebase:{sign_in_provider:'password'}})).toString('base64url')}.fixture`;
  const project = {id:'22222222-2222-4222-8222-222222222222',intent:'Build an accessible support interface',status:'draft',updated_at:'2026-01-01T00:00:00.000Z',source:null as null|{app:string;css:string},error:null as null|string};
  let fail = true; let revisionFailed=false; let versionCounter=0;
  const versions: {id:string;label:string;created_at:string;source:{app:string;css:string}}[]=[];
  const emailRequests: string[] = [];
  await page.route('**/identitytoolkit.googleapis.com/**', async route => {
    const url = route.request().url();
    if(url.includes("accounts:sendOobCode")) emailRequests.push(route.request().postDataJSON().requestType);
    const value = url.includes('accounts:lookup') ? { users:[{localId:'fixture-user',email:'builder@example.invalid',emailVerified:initiallyVerified,providerUserInfo:[{providerId:'password',email:'builder@example.invalid'}]}] } : {localId:'fixture-user',email:'builder@example.invalid',idToken:token,refreshToken:'fixture-refresh',expiresIn:'3600',registered:true};
    await route.fulfill({json:value});
  });
  await page.route('**/securetoken.googleapis.com/**', route => route.fulfill({json:{access_token:token,id_token:token,refresh_token:'fixture-refresh',expires_in:'3600',user_id:'fixture-user',project_id:'nexyral',token_type:'Bearer'}}));
  await page.route('**/api/cloud/**', async route => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const url = new URL(route.request().url());
    if(url.pathname.includes('/verification/')){if(url.pathname.endsWith('/send'))emailRequests.push('EMAIL_CODE');if(url.pathname.endsWith('/confirm')){if(route.request().postDataJSON().code!=='123456'){await route.fulfill({status:400,json:{error:'That code did not match.'}});return;}verified=true;}await route.fulfill({json:{verified,sent:true}});return;}
    if (url.pathname.endsWith('/history')) {await route.fulfill({json:{versions:versions.map(({source:_source,...version})=>version)}});return;}
    if (url.pathname.endsWith('/refine') || url.pathname.endsWith('/restore')) {
      const payload=route.request().postDataJSON();expect(payload.updatedAt).toBe(project.updated_at);
      if(refineFailure&&!revisionFailed&&url.pathname.endsWith('/refine')){revisionFailed=true;project.error='Provider unavailable. Your previous app is safe.';project.updated_at=new Date(Date.parse(project.updated_at)+1).toISOString();await route.fulfill({status:502,json:{error:project.error}});return;}
      const previous=project.source!;const target=url.pathname.endsWith('/restore')?versions.find(item=>item.id===payload.versionId)!.source:{app:'export default function App(){return <main><h1>A clearer support app</h1><button>Search tickets</button></main>}',css:'main{padding:24px;color:navy}'};
      versions.unshift({id:`version-${++versionCounter}`,label:url.pathname.endsWith('/restore')?'Before restoring a version':'Before AI change',created_at:project.updated_at,source:previous});project.source=target;project.error=null;project.updated_at=new Date(Date.parse(project.updated_at)+1).toISOString();await route.fulfill({json:{source:project.source,updated_at:project.updated_at}});return;
    }
    if (url.pathname.endsWith('/source')) {
      const payload=route.request().postDataJSON();
      if(sourceConflict || payload.updatedAt!==project.updated_at){await route.fulfill({status:409,json:{error:'A newer version exists. Download your edits before reopening the project.'}});return;}
      project.source=payload.source;project.updated_at='2026-01-01T00:00:01.000Z';await route.fulfill({json:{source:project.source,updated_at:project.updated_at}});return;
    }
    if (url.pathname.endsWith('/generate')) {
      if (fail) { fail=false;project.status='failed';project.error='AI quota reached. Try again later.';await route.fulfill({status:502,json:{error:project.error}});return; }
      project.status='generated';project.error=null;project.source={app:'export default function App() { return <main>Fixture support</main>; }',css:'main {padding: 2rem;}'};
      await route.fulfill({json:{source:project.source,verification:'not_run'}});return;
    }
    if (url.pathname.endsWith('/projects')) {await route.fulfill({status:route.request().method()==='POST'?201:200,json:route.request().method()==='POST'?{id:project.id}:{projects:[]}});return;}
    await route.fulfill({json:project});
  });
  return emailRequests;
}
for (const width of [375, 1440]) for (const theme of ['light','dark']) {
  test(`cloud workspace ${width}px ${theme}: sign in, save, failed generation recovery and project download`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'reduce',colorScheme:theme==='dark'?'dark':'light'});
    const errors: string[]=[];page.on('pageerror', error=>errors.push(error.message));
    await fixtures(page);
    await page.goto('/login');
    await page.locator('input[name=email]').fill('builder@example.invalid');
    await page.locator('input[name=password]').fill('password8');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your next idea starts here.'})).toBeVisible();
    if(width===1440) await expect(page.locator('header').getByRole('link',{name:'Workspace',exact:true})).toBeVisible();
    await page.getByLabel('What should we build?').fill('Build an accessible support interface');
    await page.getByRole('button',{name:'Save project'}).click();
    await page.getByRole('button',{name:'Generate with Gemini'}).click();
    await expect(page.getByRole('button',{name:'Retry generation'})).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('quota');
    await page.getByRole('button',{name:'Retry generation'}).click();
    await expect(page.getByRole('heading',{name:'Your source. Your next move.'})).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button',{name:'Download project',exact:true}).click();
    const download = await downloadPromise;expect(download.suggestedFilename()).toBe('nexyral-project.zip');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:`artifacts/cloud-workspace-${width}-${theme}.png`,fullPage:true});
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('signup requests a numeric code and recovery submits a password-reset request', async ({page}) => {
  const emailRequests = await fixtures(page);
  await page.goto('/get-started');
  await page.locator('input[name=email]').fill('builder@example.invalid');
  await page.locator('input[name=password]').fill('strong-test-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your next idea starts here.'})).toBeVisible();
  await expect.poll(()=>emailRequests).toContain('EMAIL_CODE');
  expect(emailRequests).not.toContain('VERIFY_EMAIL');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('button',{name:'Forgot your password?'}).click();
  await page.getByLabel('Reset password').fill('builder@example.invalid');
  await page.getByRole('button',{name:'Send recovery email'}).click();
  await expect.poll(()=>emailRequests).toContain('PASSWORD_RESET');
  await expect(page.locator('.cloud-notice')).toContainText('If an account exists');
});

test('numeric verification gates generation, handles a wrong code and unlocks after confirmation',async({page})=>{
  await page.setViewportSize({width:375,height:900});await fixtures(page,false);await page.goto('/get-started');
  await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('strong-test-password');await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByLabel('Six-digit email code')).toBeVisible();
  await page.getByLabel('What should we build?').fill('Build an accessible support interface');await page.getByRole('button',{name:'Save project'}).click();
  await expect(page.getByRole('button',{name:'Generate with Gemini'})).toBeDisabled();
  await page.getByLabel('Six-digit email code').fill('000000');await page.getByRole('button',{name:'Verify email',exact:true}).click();await expect(page.getByRole('status')).toContainText('did not match');
  await page.getByLabel('Six-digit email code').fill('123456');await page.getByRole('button',{name:'Verify email',exact:true}).click();await expect(page.getByRole('status')).toContainText('Email verified');await expect(page.getByRole('button',{name:'Generate with Gemini'})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('account navigation keeps signup and login forms aligned with browser history', async ({page}) => {
  await fixtures(page);
  await page.goto('/login');
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await page.locator('header').getByRole('link',{name:'Get Started',exact:true}).click();
  await expect(page).toHaveURL(/\/get-started$/);
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await page.locator('.account-switch').getByRole('link',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
});
test('verification action confirms through Firebase and handles expired links', async ({page}) => {
  await page.route('**/identitytoolkit.googleapis.com/**', async route => {
    const payload=route.request().postDataJSON() as {oobCode?:string};
    if(payload.oobCode==='expired-fixture'){await route.fulfill({status:400,json:{error:{message:'EXPIRED_OOB_CODE'}}});return;}
    await route.fulfill({json:{email:'builder@example.invalid',requestType:'VERIFY_EMAIL',localId:'fixture-user'}});
  });
  await page.goto('/auth/action?mode=verifyEmail&oobCode=fixture-code');
  await page.getByRole('button',{name:'Verify email address'}).click();
  await expect(page.getByRole('heading',{name:'Email verified.'})).toBeVisible();
  await expect(page).not.toHaveURL(/oobCode/);
  await page.goto('/auth/action?mode=verifyEmail&oobCode=expired-fixture');
  await page.getByRole('button',{name:'Verify email address'}).click();
  await expect(page.getByRole('status')).toContainText('invalid, expired');
});
test('account design includes Google and remains readable in both themes on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  for(const theme of ['dark','light'] as const){
    await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
    await page.goto('/get-started');
    await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`artifacts/account-refined-mobile-${theme}.png`,fullPage:true});
  }
});
test('walkthrough is a playable 30-second video with captions and transcript', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('link',{name:'Watch the 30-second walkthrough'}).click();
  const video=page.getByLabel('30-second NEXYRAL build walkthrough');
  await video.evaluate((element:HTMLVideoElement)=>element.load());
  await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.duration)).toBe(30);
  await video.evaluate(async(element:HTMLVideoElement)=>{element.muted=true;await element.play();});
  await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.currentTime)).toBeGreaterThan(0);
  await video.evaluate((element:HTMLVideoElement)=>element.pause());
  await expect(video.locator('track')).toHaveAttribute('src','/media/nexyral-how-to-build.vtt');
  await page.getByText('Read the walkthrough',{exact:true}).click();
  await expect(page.getByText('Create an account with email or Google.',{exact:true})).toBeVisible();
});
test('updated homepage typography has no overflow at phone, tablet and desktop sizes', async({page})=>{
  for(const width of [375,390,430,768,1440]) for(const theme of ['light','dark'] as const){
    await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.goto('/');await page.evaluate(async()=>await document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
test('homepage draft reaches the authenticated workspace and clears only after a successful save',async({page})=>{
 await fixtures(page);await page.goto('/login');await page.evaluate(()=>sessionStorage.setItem('nexyral-build-draft','Create a bakery website with a menu and opening hours.'));await page.reload();
 await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('password8');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByLabel('What should we build?')).toHaveValue('Create a bakery website with a menu and opening hours.');
 await page.getByRole('button',{name:'Save project',exact:true}).click();await expect(page.getByLabel('What should we build?')).toHaveValue('');expect(await page.evaluate(()=>sessionStorage.getItem('nexyral-build-draft'))).toBeNull();
});

for(const conflict of [false,true])test(`workspace source editing ${conflict?'preserves edits on conflict':'persists after reopening'}`,async({page})=>{
 await fixtures(page,true,conflict);await page.goto('/login');await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('password8');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('What should we build?').fill('Build an accessible support interface');await page.getByRole('button',{name:'Save project'}).click();await page.getByRole('button',{name:'Generate with Gemini'}).click();await page.getByRole('button',{name:'Retry generation'}).click();
 await page.getByRole('button',{name:'Edit code',exact:true}).click();const code='export default function App(){return <main>My persisted edit</main>}';await page.getByLabel('Edit App.tsx').fill(code);await page.getByRole('button',{name:'Save changes',exact:true}).click();
 if(conflict){await expect(page.locator('.cloud-copy-notice')).toContainText('A newer version exists');await expect(page.getByLabel('Edit App.tsx')).toHaveValue(code);await expect(page.locator('.source-save-state')).toHaveText('Unsaved edits');}
 else{await expect(page.locator('.cloud-copy-notice')).toHaveText('Changes saved to your project.');await expect(page.locator('.source-save-state')).toHaveText('Saved source');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('password8');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('What should we build?').fill('Build an accessible support interface');await page.getByRole('button',{name:'Save project'}).click();await page.getByRole('button',{name:'Edit code',exact:true}).click();await expect(page.getByLabel('Edit App.tsx')).toHaveValue(code);}
});

for(const width of [375,1440])test(`AI changes at ${width}px preserve failed requests, update the preview and restore versions`,async({page})=>{
 await page.setViewportSize({width,height:950});await fixtures(page,true,false,true);await page.goto('/login');await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('password8');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('What should we build?').fill('Build an accessible support interface');await page.getByRole('button',{name:'Save project'}).click();await page.getByRole('button',{name:'Generate with Gemini'}).click();await page.getByRole('button',{name:'Retry generation'}).click();
 await page.getByRole('button',{name:'Run preview',exact:true}).click();await expect(page.frameLocator('iframe').getByText('Fixture support')).toBeVisible();await page.getByRole('button',{name:'Improve mobile layout',exact:false}).click();await page.getByRole('button',{name:'Apply AI change',exact:true}).click();await expect(page.locator('.refinement-notice')).toContainText('Provider unavailable');await expect(page.frameLocator('iframe').getByText('Fixture support')).toBeVisible();
 await page.getByRole('button',{name:'Apply AI change',exact:true}).click();await expect(page.locator('.refinement-notice')).toContainText('AI change saved');await expect(page.frameLocator('iframe').getByRole('heading',{name:'A clearer support app'})).toBeVisible();await page.getByRole('button',{name:'Saved versions',exact:true}).click();await expect(page.getByLabel('Restore a previous version')).toBeVisible();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Restore version',exact:true}).click();await expect(page.locator('.refinement-notice')).toContainText('Saved version restored');await expect(page.frameLocator('iframe').getByText('Fixture support')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/refinement-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Edit code',exact:true}).click();await page.getByLabel('Edit App.tsx').fill('export default function App(){return <main>Unsaved change</main>}');await expect(page.getByRole('button',{name:'Apply AI change',exact:true})).toBeDisabled();
});
for(const width of [390,1440])test(`Guide AI draft handoff and failure ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await fixtures(page);let fail=true;
 await page.route('**/api/cloud/guide',async route=>{
 expect(route.request().headers().authorization).toMatch(/^Bearer /);const payload=route.request().postDataJSON();expect(payload.messages.at(-1).text).toContain('booking');
 if(fail){fail=false;await route.fulfill({status:502,json:{error:'AI is busy. Your question is still here.'}});return;}
 await route.fulfill({json:{answer:'Here is a clear starting request.',draft:'Build a responsive booking app with a calendar and local reservation state.'}});
 });
 await page.goto('/login');await page.locator('input[name=email]').fill('builder@example.invalid');await page.locator('input[name=password]').fill('password8');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Your next idea starts here.'})).toBeVisible();
 await page.getByRole('button',{name:'Open NEXYRAL Guide'}).click();await page.getByLabel('Ask NEXYRAL Guide').fill('Help me plan a booking app');await page.getByRole('button',{name:'Send question'}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('AI is busy');await expect(page.getByLabel('Ask NEXYRAL Guide')).toHaveValue('Help me plan a booking app');
 await page.getByRole('button',{name:'Send question'}).click();await expect(page.getByText('Here is a clear starting request.')).toBeVisible();await page.getByRole('button',{name:'Use this in the workspace'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('What should we build?')).toHaveValue('Build a responsive booking app with a calendar and local reservation state.');
});
