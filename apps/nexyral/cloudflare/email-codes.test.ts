import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { addressVerified, emailCodeRequest } from './email-codes.ts';
import type { Env } from './worker.ts';
function fixture() {
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./migrations/0002_email_codes.sql',import.meta.url),'utf8'));
  const adapter={prepare(sql:string){let args:(string|number)[]=[];return {bind(...values:(string|number)[]){args=values;return this;},async first(){return db.prepare(sql).get(...args)??null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};},async batch(statements:{run:()=>Promise<unknown>}[]){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};
  const env={DB:adapter as unknown as Env['DB'],RESEND_API_KEY:'fixture-mail-key',EMAIL_CODE_SECRET:'fixture-private-pepper'} as Env;
  const user={sub:'owner-one',email:'owner@example.invalid',email_verified:false};
  const req=(action:string)=>new Request(`https://nexyral.online/api/cloud/verification/${action}`,{method:action==='status'?'GET':'POST'});
  let code='',mailCount=0;
  const sender:typeof fetch=async(input,init)=>{assert.equal(String(input),'https://api.resend.com/emails');assert.equal(init?.redirect,'manual');const mail=JSON.parse(String(init?.body)) as {from:string;text:string;html:string};assert.match(mail.from,/NEXYRAL.*nexyral.online/);assert.match(mail.html,/<a href="https:\/\/nexyral.online"/);assert.doesNotMatch(mail.text,/oobCode|https:/);code=mail.text.match(/code is (\d{6})/)![1];mailCount++;return Response.json({id:'fixture-delivery'});};
  return {db,env,user,req,sender,get code(){return code;},get mailCount(){return mailCount;}};
}
test('codes are branded, hashed, single-use and tied to account and exact address',async()=>{
  const f=fixture();try{
    assert.equal((await emailCodeRequest(f.req('send'),f.env,f.user,'{}',f.sender)).status,200);
    const row=f.db.prepare('SELECT code_hash FROM email_code_challenges').get()!;assert.notEqual(row.code_hash,f.code);assert.equal(String(row.code_hash).length,64);
    assert.equal((await emailCodeRequest(f.req('send'),f.env,f.user,'{}',f.sender)).status,429);assert.equal(f.mailCount,1);
    const other={...f.user,sub:'other-owner'};assert.equal((await emailCodeRequest(f.req('confirm'),f.env,other,JSON.stringify({code:f.code}))).status,400);
    assert.equal((await emailCodeRequest(f.req('confirm'),f.env,f.user,JSON.stringify({code:f.code}))).status,200);
    assert.equal(await addressVerified(f.env,f.user),true);assert.equal(await addressVerified(f.env,{...f.user,email:'changed@example.invalid'}),false);
    assert.equal((await emailCodeRequest(f.req('confirm'),f.env,f.user,JSON.stringify({code:f.code}))).status,400);
  }finally{f.db.close();}
});
test('wrong-code attempts are bounded and expired or replaced codes fail',async()=>{
  const f=fixture();try{
    await emailCodeRequest(f.req('send'),f.env,f.user,'{}',f.sender);const wrong=f.code==='000000'?'111111':'000000';
    for(let i=0;i<5;i++)assert.equal((await emailCodeRequest(f.req('confirm'),f.env,f.user,JSON.stringify({code:wrong}))).status,400);
    assert.equal((await emailCodeRequest(f.req('confirm'),f.env,f.user,JSON.stringify({code:f.code}))).status,400);assert.equal(await addressVerified(f.env,f.user),false);
    f.db.exec('UPDATE email_code_challenges SET sent_at=0');await emailCodeRequest(f.req('send'),f.env,f.user,'{}',f.sender);
    f.db.exec('UPDATE email_code_challenges SET expires_at=0');assert.equal((await emailCodeRequest(f.req('confirm'),f.env,f.user,JSON.stringify({code:f.code}))).status,400);
  }finally{f.db.close();}
});
test('missing sender, failed delivery and daily mail budget cannot enable verification',async()=>{
  const f=fixture();try{
    assert.equal((await emailCodeRequest(f.req('send'),{...f.env,RESEND_API_KEY:undefined},f.user,'{}',f.sender)).status,503);assert.equal(f.mailCount,0);
    const failed:typeof fetch=async()=>new Response('',{status:302,headers:{Location:'https://other.example'}});
    assert.equal((await emailCodeRequest(f.req('send'),f.env,f.user,'{}',failed)).status,502);assert.equal(f.db.prepare('SELECT ready FROM email_code_challenges').get()!.ready,0);
    f.db.exec('UPDATE email_code_challenges SET sent_at=0');f.db.prepare('UPDATE email_send_usage SET count=100').run();
    assert.equal((await emailCodeRequest(f.req('send'),f.env,f.user,'{}',f.sender)).status,429);assert.equal(f.mailCount,0);assert.equal(await addressVerified(f.env,f.user),false);
  }finally{f.db.close();}
});
