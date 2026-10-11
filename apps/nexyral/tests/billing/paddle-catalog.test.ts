import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
function fixture(existing=false){
 const dir=mkdtempSync(join(tmpdir(),'nexyral-paddle-test-'));mkdirSync(join(dir,'scripts'));mkdirSync(join(dir,'billing'));
 copyFileSync('scripts/create-paddle-catalog.ts',join(dir,'scripts/catalog.ts'));copyFileSync('billing/paddle-sandbox-catalog.json',join(dir,'billing/paddle-sandbox-catalog.json'));
 const harness=`
 import {readFileSync} from 'node:fs';
 const catalog=JSON.parse(readFileSync(new URL('./billing/paddle-sandbox-catalog.json',import.meta.url),'utf8'));
 let mutations=0;const products=catalog.plans.map(p=>({...p.product,id:'pro_'+p.key}));
 globalThis.fetch=async(input,init)=>{
  const u=new URL(input);if(u.origin!=='https://sandbox-api.paddle.com'||init.redirect!=='manual')throw new Error('Unexpected credential destination');
  if(init.method==='POST'){mutations++;const body=JSON.parse(init.body);return Response.json({data:{...body,id:(u.pathname==='/products'?'pro_':'pri_')+body.custom_data.plan+(body.custom_data.interval??'')}});}
  if(u.pathname==='/products')return Response.json({data:${existing?'products':'[]'}});
  const plan=catalog.plans.find(p=>'pro_'+p.key===u.searchParams.get('product_id'));
  return Response.json({data:${existing?"plan.prices.map(p=>({...p,id:'pri_'+plan.key+p.billing_cycle.interval,trial_period:{...p.trial_period,unit_price:null,unit_price_overrides:[]}}))":'[]'}});
 };
 process.argv.push('--apply');process.env.PADDLE_SANDBOX_API_KEY='fixture-only';await import('./scripts/catalog.ts');
 console.log(JSON.stringify({mutations}));`;
 writeFileSync(join(dir,'run.mjs'),harness);
 return {dir,run:()=>execFileSync(process.execPath,[join(dir,'run.mjs')],{encoding:'utf8',stdio:'pipe'}),close:()=>rmSync(dir,{recursive:true,force:true})};
}
test('sandbox preview preserves minor-unit strings and all approved prices without API requests',()=>{
 const output=JSON.parse(execFileSync(process.execPath,['scripts/create-paddle-catalog.ts'],{encoding:'utf8'}));assert.equal(output.apiRequests,0);assert.deepEqual(output.plans.map(p=>p.prices.map(q=>q.unit_price.amount)),[['500','5000'],['1200','12000'],['2500','25000']]);
 for(const plan of output.plans)for(const price of plan.prices){assert.deepEqual(price.trial_period,{interval:'day',frequency:7});assert.equal(price.unit_price_overrides.length,3);}
});
test('creation attaches six prices to three sandbox products and saves only returned IDs',()=>{
 const f=fixture();try{const output=f.run();assert.match(output,/"mutations":9/);const result=JSON.parse(readFileSync(join(f.dir,'billing/paddle-sandbox-ids.json'),'utf8'));assert.equal(result.plans.length,3);for(const plan of result.plans){assert.equal(plan.prices.length,2);assert.match(plan.product_id,/^pro_/);for(const price of plan.prices)assert.match(price.price_id,/^pri_/);}}finally{f.close();}
});
test('re-running an existing tagged catalog makes no mutations or duplicate products/prices',()=>{
 const f=fixture(true);try{assert.match(f.run(),/"mutations":0/);}finally{f.close();}
});
test('an HTML security block stops before any catalog mutation and exposes no credential',()=>{
 const f=fixture();try{
  writeFileSync(join(f.dir,'run.mjs'),`process.argv.push('--apply');process.env.PADDLE_SANDBOX_API_KEY='fixture-private-key';globalThis.fetch=async()=>new Response('<html>Security block</html>',{status:403,headers:{'Content-Type':'text/html'}});await import('./scripts/catalog.ts');`);
  let failure:unknown;try{f.run();}catch(error){failure=error;}
  assert.ok(failure&&typeof failure==='object'&&'stderr' in failure);const message=String(failure.stderr);assert.match(message,/HTTP 403 with a non-JSON response/);assert.doesNotMatch(message,/fixture-private-key/);
 }finally{f.close();}
});
