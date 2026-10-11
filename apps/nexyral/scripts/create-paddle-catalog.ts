import { readFileSync, writeFileSync } from 'node:fs';

interface Money { amount: string; currency_code: string }
interface PriceSpec {
  description: string;
  billing_cycle: { interval: string; frequency: number };
  trial_period: { interval: string; frequency: number };
  unit_price: Money;
  unit_price_overrides: {country_codes:string[];unit_price:Money}[];
  tax_mode: string;
  quantity: {minimum:number;maximum:number};
  custom_data: Record<string,string>;
}
interface ProductSpec { name:string;description:string;tax_category:string;custom_data:Record<string,string> }
interface Plan {key:string;product:ProductSpec;prices:PriceSpec[]}
interface Entity {id:string;name?:string;status?:string;custom_data?:Record<string,string>;[field:string]:unknown}
const origin='https://sandbox-api.paddle.com';
const catalog=JSON.parse(readFileSync(new URL('../billing/paddle-sandbox-catalog.json',import.meta.url),'utf8')) as {environment:string;plans:Plan[]};
if(catalog.environment!=='sandbox'||catalog.plans.length!==3)throw new Error('Only the approved three-plan sandbox catalog is supported.');
for(const plan of catalog.plans)for(const price of plan.prices){
  if(!/^\d+$/.test(price.unit_price.amount)||price.unit_price.currency_code!=='USD'||price.trial_period.interval!=='day'||price.trial_period.frequency!==7||price.unit_price_overrides.some(item=>!/^\d+$/.test(item.unit_price.amount)))throw new Error('Invalid catalog amount or trial.');
}
if(!process.argv.includes('--apply')) {
  console.log(JSON.stringify({mode:'preview',apiRequests:0,...catalog},null,2));
} else {
  const key=process.env.PADDLE_SANDBOX_API_KEY;
  if(!key)throw new Error('PADDLE_SANDBOX_API_KEY is missing. Add a sandbox Products/Prices read-write key in secure environment settings.');
  async function api(path:string,body?:unknown):Promise<{data:Entity|Entity[];meta?:{pagination?:{next?:string|null}}}> {
    const url=new URL(path,origin);
    if(url.origin!==origin||!/^\/(products|prices)(\/|$)/.test(url.pathname))throw new Error('Only Paddle sandbox catalog endpoints are allowed.');
    const response=await fetch(url,{method:body?'POST':'GET',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error(`Paddle sandbox returned HTTP ${response.status} with a non-JSON response. A security/network block may be preventing API access. No automatic retry or credential logging.`);
    const result=await response.json() as {data:Entity|Entity[];meta?:{pagination?:{next?:string|null}};error?:{code?:string}};
    if(!response.ok)throw new Error(`Paddle catalog request failed: HTTP ${response.status}, code ${result.error?.code??'unknown'}. No automatic retry of mutations.`);
    return result;
  }
  async function list(path:string) {
    const result:Entity[]=[];const visited=new Set<string>();let next:string|null=path;
    while(next){if(visited.has(next)||visited.size>=100)throw new Error('Unexpected catalog pagination.');visited.add(next);const page=await api(next);if(!Array.isArray(page.data))throw new Error('Unexpected Paddle list response.');result.push(...page.data);next=page.meta?.pagination?.next??null;}
    return result;
  }
  const mapping:{environment:string;plans:{plan:string;product_id:string;prices:{interval:string;price_id:string;unit_price:Money;overrides:PriceSpec['unit_price_overrides']}[]}[]}={environment:'sandbox',plans:[]};
  const output=new URL('../billing/paddle-sandbox-ids.json',import.meta.url);
  const save=()=>writeFileSync(output,JSON.stringify(mapping,null,2)+'\n');
  const products=await list('/products?status=active&per_page=200');
  for(const plan of catalog.plans){
    const matching=products.filter(p=>p.custom_data?.nexyral_catalog==='sandbox-v1'&&p.custom_data.plan===plan.key);
    if(matching.length>1)throw new Error(`Multiple tagged ${plan.key} products; review before proceeding.`);
    const product=matching[0]??(await api('/products',plan.product)).data as Entity;
    if(!/^pro_[a-z0-9]+$/.test(product.id))throw new Error('Unexpected product ID.');
    if(product.tax_category!==plan.product.tax_category)throw new Error(`Existing ${plan.key} tax category differs; no update was made.`);
    const record={plan:plan.key,product_id:product.id,prices:[] as {interval:string;price_id:string;unit_price:Money;overrides:PriceSpec['unit_price_overrides']}[]};mapping.plans.push(record);save();
    const existing=await list(`/prices?status=active&product_id=${encodeURIComponent(product.id)}&per_page=200`);
    for(const spec of plan.prices){
      const matches=existing.filter(p=>p.custom_data?.nexyral_catalog==='sandbox-v1'&&p.custom_data.plan===plan.key&&p.custom_data.interval===spec.billing_cycle.interval);
      if(matches.length>1)throw new Error(`Multiple tagged ${plan.key}/${spec.billing_cycle.interval} prices; review before proceeding.`);
      const price=matches[0]??(await api('/prices',{product_id:product.id,...spec})).data as Entity;
      if(!/^pri_[a-z0-9]+$/.test(price.id))throw new Error('Unexpected price ID.');
      for(const field of ['unit_price','billing_cycle','trial_period','quantity','tax_mode','unit_price_overrides'] as const){
        const normalize=(v:unknown):string=>{if(Array.isArray(v))return JSON.stringify(v.map(item=>JSON.parse(normalize(item))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));if(v&&typeof v==='object')return JSON.stringify(Object.fromEntries(Object.entries(v).filter(([name])=>name!=='unit_price_overrides').sort(([a],[b])=>a.localeCompare(b)).map(([name,item])=>[name,JSON.parse(normalize(item))])));return JSON.stringify(v??null);};
        // Paddle may add a null trial unit_price to a free trial.
        const actual=field==='trial_period'&&price[field]&&typeof price[field]==='object'?Object.fromEntries(Object.entries(price[field] as Record<string,unknown>).filter(([name,value])=>name!=='unit_price'||value!==null)):price[field];
        if(normalize(actual)!==normalize(spec[field]))throw new Error(`Existing ${plan.key}/${spec.billing_cycle.interval} ${field} differs. No unrelated records were modified; inspect saved IDs.`);
      }
      record.prices.push({interval:spec.billing_cycle.interval,price_id:price.id,unit_price:spec.unit_price,overrides:spec.unit_price_overrides});save();
    }
  }
  console.log(JSON.stringify(mapping,null,2));
}
