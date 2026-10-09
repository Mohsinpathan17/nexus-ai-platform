import type { Env } from './worker.ts';
interface Identity { sub: string; email?: string; email_verified?: boolean }
const response = (value: unknown, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
export async function addressVerified(env: Env, user: Identity): Promise<boolean> {
  if (user.email_verified === true) return true;
  if (!user.email) return false;
  return Boolean(await env.DB.prepare('SELECT 1 FROM verified_addresses WHERE owner_id=? AND email=?').bind(user.sub,user.email).first());
}
async function digest(secret: string, owner: string, email: string, id: string, code: string) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify([owner,email,id,code])));
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function createCode() {
  const value=new Uint32Array(1);
  // Rejection sampling keeps all six-digit values equally likely.
  do { crypto.getRandomValues(value); } while(value[0]>=4294000000);
  return String(value[0]%1000000).padStart(6,'0');
}
export async function emailCodeRequest(request: Request, env: Env, user: Identity, body: string, fetcher: typeof fetch = fetch): Promise<Response> {
  const path=new URL(request.url).pathname;
  if (path.endsWith('/status') && request.method==='GET') return response({verified:await addressVerified(env,user),deliveryConfigured:Boolean(env.RESEND_API_KEY&&env.EMAIL_CODE_SECRET)});
  if (request.method!=='POST') return response({error:'Method not allowed'},405);
  if (!user.email || typeof user.email!=='string' || user.email.length>254 || /[\r\n]/.test(user.email)) return response({error:'This account has no valid email address.'},400);
  if (!env.RESEND_API_KEY || !env.EMAIL_CODE_SECRET) return response({error:'Verification-code delivery is not configured yet. Your account is saved; please try again after email setup is complete.'},503);
  const now=Date.now();
  if(path.endsWith('/send')) {
    if(await addressVerified(env,user))return response({verified:true});
    const id=crypto.randomUUID(),code=createCode();
    const hash=await digest(env.EMAIL_CODE_SECRET,user.sub,user.email,id,code);
    const reserved=await env.DB.prepare(`INSERT INTO email_code_challenges(owner_id,email,challenge_id,code_hash,sent_at,expires_at,window_start,sends) VALUES(?,?,?,?,?,?,?,1)
      ON CONFLICT(owner_id) DO UPDATE SET email=excluded.email,challenge_id=excluded.challenge_id,code_hash=excluded.code_hash,attempts=0,sent_at=excluded.sent_at,expires_at=excluded.expires_at,ready=0,receipt=NULL,
      window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END,
      sends=CASE WHEN window_start<=? THEN 1 ELSE sends+1 END
      WHERE sent_at<=? AND (window_start<=? OR sends<5) RETURNING challenge_id`)
      .bind(user.sub,user.email,id,hash,now,now+600000,now,now-3600000,now-3600000,now-60000,now-3600000).first();
    if(!reserved)return response({error:'Please wait before requesting another code. Up to five emails per account per hour are allowed.'},429);
    const day=new Date(now).toISOString().slice(0,10);
    const budget=await env.DB.prepare('INSERT INTO email_send_usage(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<100 RETURNING count').bind(day).first();
    if(!budget)return response({error:'Email delivery capacity reached. Please try again tomorrow.'},429);
    let sent=false;
    try {
      const mail=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({
        from:'NEXYRAL · nexyral.online <verify@nexyral.online>',to:[user.email],subject:`${code} — Your NEXYRAL verification code`,
        text:`NEXYRAL · nexyral.online\n\nYour verification code is ${code}.\n\nEnter this code in your NEXYRAL workspace. It expires in 10 minutes. Never share it. If you didn't request this, ignore this email.`,
        html:`<!doctype html><html><body style="margin:0;background:#f5f4f7;font-family:Arial,sans-serif;color:#24212e"><div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:16px"><p style="font-weight:bold;letter-spacing:2px">NEXYRAL</p><h1 style="font-size:26px">Verify your email</h1><p>Enter this code in your NEXYRAL workspace:</p><p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6550dd">${code}</p><p>This code expires in 10 minutes. Never share it.</p><p>If you didn't request this email, you can ignore it.</p><p style="margin-top:32px;font-size:13px;color:#686274">From Intent to Execution.<br><a href="https://nexyral.online" style="color:#6550dd">nexyral.online</a></p></div></body></html>`
      })});
      sent=mail.ok;
    } catch { /* No credentials, code, address or provider error body is logged. */ }
    if(!sent)return response({error:'The email service could not send your code. Please try again in one minute.'},502);
    await env.DB.prepare('UPDATE email_code_challenges SET ready=1 WHERE owner_id=? AND challenge_id=?').bind(user.sub,id).run();
    return response({sent:true,expiresIn:600,resendAfter:60});
  }
  if(path.endsWith('/confirm')) {
    let code:unknown;try{code=(JSON.parse(body) as {code?:unknown}).code;}catch{return response({error:'Invalid code request.'},400);}
    if(typeof code!=='string'||!/^\d{6}$/.test(code))return response({error:'Enter the six-digit code from your email.'},400);
    const challenge=await env.DB.prepare('SELECT challenge_id FROM email_code_challenges WHERE owner_id=? AND email=? AND ready=1 AND receipt IS NULL AND expires_at>? AND attempts<5').bind(user.sub,user.email,now).first<{challenge_id:string}>();
    if(!challenge)return response({error:'This code expired or reached its attempt limit. Request a new code.'},400);
    const hash=await digest(env.EMAIL_CODE_SECRET,user.sub,user.email,challenge.challenge_id,code),receipt=crypto.randomUUID();
    const result=await env.DB.batch([
      env.DB.prepare('UPDATE email_code_challenges SET receipt=? WHERE owner_id=? AND email=? AND challenge_id=? AND code_hash=? AND ready=1 AND receipt IS NULL AND expires_at>? AND attempts<5').bind(receipt,user.sub,user.email,challenge.challenge_id,hash,now),
      env.DB.prepare('INSERT INTO verified_addresses(owner_id,email,verified_at) SELECT owner_id,email,? FROM email_code_challenges WHERE owner_id=? AND receipt=? ON CONFLICT(owner_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at').bind(now,user.sub,receipt)
    ]);
    if(!result[0].meta.changes){await env.DB.prepare('UPDATE email_code_challenges SET attempts=attempts+1 WHERE owner_id=? AND challenge_id=? AND receipt IS NULL AND attempts<5').bind(user.sub,challenge.challenge_id).run();return response({error:'That code did not match. Check the latest email and try again.'},400);}
    return response({verified:true});
  }
  return response({error:'Not found'},404);
}
