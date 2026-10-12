import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, ArrowUpRight, Compass, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { cloudAuth } from '../../lib/cloud-auth';
import { saveBuildDraft } from '../../lib/build-draft';
const help = [
  {label:'What can I build?',answer:'Describe a small web app, such as a task board, budget planner or support interface. NEXYRAL generates React code and styles you can preview, change and export. Connected databases, payments and backend services need additional engineering.',link:'/playground',action:'Try a working example'},
  {label:'How do I start?',answer:'Try an example first, or open the workspace and sign in. Verify your email, describe the screens and interactions you need, then generate. Start small: one clear use case and a few features.',link:'/workspace',action:'Open the workspace'},
  {label:'Can I change my app?',answer:'Yes. In the workspace, use “Tell AI what to change” after generating. Review the new preview. Saved versions lets you restore the last 10 previous source versions. Save or discard manual code edits before requesting AI changes.',link:'/docs',action:'Read the guide'},
  {label:'Something went wrong',answer:'If AI is busy or at capacity, wait and retry. A failed revision keeps your previous saved source. For sign-in trouble, use your original sign-in method; for email verification, enter the latest code and check spam. Never share a password or API key here.',link:'/status',action:'View service information'},
];
interface Message {role:'user'|'model';text:string;draft?:string;link?:string;action?:string;ai?:boolean}
export default function NexyralGuide(){
  const [open,setOpen]=useState(false),[user,setUser]=useState<User|null>(null),[messages,setMessages]=useState<Message[]>([]),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const close=useRef<HTMLButtonElement>(null),launcher=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null),log=useRef<HTMLDivElement>(null),controller=useRef<AbortController|null>(null),account=useRef<string|null>(null);
  const navigate=useNavigate();
  useEffect(()=>cloudAuth?onAuthStateChanged(cloudAuth,next=>{if(account.current!==next?.uid){controller.current?.abort();setMessages([]);setQuestion('');setError('');}account.current=next?.uid??null;setUser(next);}):undefined,[]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{if(!open)return;close.current?.focus();const previous=document.body.style.overflow;const app=document.getElementById('nexyral-app');const wasInert=app?.inert??false;if(app)app.inert=true;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;if(app)app.inert=wasInert;};},[open]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'instant'});},[messages,busy,error]);
  function dismiss(){setOpen(false);requestAnimationFrame(()=>launcher.current?.focus());}
  async function send(event:FormEvent){
    event.preventDefault();if(busy||question.trim().length<3)return;
    if(!user){setError('Sign in to ask AI. You can use quick help without an account.');return;}
    const prompt=question.trim(),prior=messages.filter(m=>m.ai).slice(-6);
    setBusy(true);setError('');const abort=new AbortController();controller.current=abort;
    try{
      const response=await fetch('/api/cloud/guide',{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({messages:[...prior,{role:'user',text:prompt}].map(m=>({role:m.role,text:m.text}))})});
      const data=await response.json() as {answer?:string;draft?:string|null;error?:string};
      if(!response.ok||!data.answer)throw new Error(data.error??'The Guide could not answer. Try again.');
      if(abort.signal.aborted)return;
      setMessages(current=>[...current,{role:'user',text:prompt,ai:true},{role:'model',text:data.answer!,draft:data.draft??undefined,ai:true}]);setQuestion('');
    }catch(cause){if(!abort.signal.aborted)setError(cause instanceof Error?cause.message:'The Guide could not connect.');}
    finally{setBusy(false);}
  }
  function applyDraft(draft:string){if(!saveBuildDraft(draft)){setError('Your browser could not save the draft. Copy it into the workspace instead.');return;}dismiss();navigate('/workspace',{state:{guideDraft:draft}});}
  return <>
    <button ref={launcher} className={`guide-launcher ${open?'is-open':''}`} aria-label="Open NEXYRAL Guide" aria-expanded={open} aria-controls="nexyral-guide" onClick={()=>setOpen(value=>!value)}><MessageCircle size={19}/><span>Need help?</span><span className="guide-launcher-dot"/></button>
    {open&&<div className="guide-backdrop" onClick={dismiss} aria-hidden="true"/>}
    {open&&<section ref={panel} id="nexyral-guide" className="guide-panel" role="dialog" aria-modal="true" aria-labelledby="guide-title" onKeyDown={event=>{
      if(event.key==='Escape'){event.stopPropagation();dismiss();}
      if(event.key==='Tab'){const controls=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea')??[]);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    }}>
      <header className="guide-header"><div className="guide-mark"><Compass size={24}/></div><div><span className="guide-eyebrow">A little direction. A better start.</span><h2 id="guide-title">NEXYRAL Guide</h2></div><button ref={close} className="guide-icon" aria-label="Close NEXYRAL Guide" onClick={dismiss}><X size={20}/></button></header>
      <div ref={log} className="guide-body"><div className="guide-intro"><span className="guide-eyebrow">YOUR IDEA STARTS HERE</span><h3>What would you like<br/>to make?</h3><p>I can help you get started, explain the workspace or shape your next app idea.</p></div>
        <div className="guide-quick" aria-label="Quick help">{help.map(item=><button key={item.label} disabled={busy} onClick={()=>{setError('');setMessages(current=>[...current,{role:'user',text:item.label},{role:'model',text:item.answer,link:item.link,action:item.action}]);}}>{item.label}<ArrowUpRight size={15}/></button>)}</div>
        <div className="guide-conversation" role="log" aria-label="Guide conversation" aria-live="polite" aria-relevant="additions">{messages.map((m,i)=><article className={`guide-message ${m.role}`} key={i}><span className="guide-eyebrow">{m.role==='user'?'YOU':m.ai?'NEXYRAL · AI GUIDANCE':'NEXYRAL · QUICK HELP'}</span><p>{m.text}</p>{m.link&&<Link to={m.link} onClick={dismiss}>{m.action}<ArrowUpRight size={14}/></Link>}{m.draft&&<div className="guide-draft"><strong>Your app request</strong><p>{m.draft}</p><button onClick={()=>applyDraft(m.draft!)}>Use this in the workspace<ArrowUpRight size={16}/></button><small>You review the request before generating.</small></div>}</article>)}</div>
        {busy&&<p className="guide-working" role="status"><Sparkles size={16}/>Thinking through your request…</p>}
        {error&&<p className="guide-error" role="alert">{error}{!user&&<> <Link to="/login" onClick={dismiss}>Sign in</Link></>}</p>}
      </div>
      <footer className="guide-compose"><form onSubmit={send}><label className="sr-only" htmlFor="guide-question">Ask NEXYRAL Guide</label><textarea id="guide-question" rows={2} value={question} maxLength={3000} placeholder="Help me plan a simple booking app…" disabled={busy} onChange={e=>setQuestion(e.target.value)}/><button type="submit" disabled={busy||question.trim().length<3} aria-label="Send question"><ArrowUp size={19}/></button></form><div className="guide-footnote"><span>{user?'AI can make mistakes. No project access.':'Quick help is free. Sign in to ask AI.'}</span><button className="guide-icon" disabled={busy||!messages.length} aria-label="Clear guide conversation" onClick={()=>{setMessages([]);setError('');}}><RotateCcw size={14}/></button></div><small>Only messages you send are shared with our AI service. Don’t include secrets. Conversation stays in this tab until cleared or refreshed.</small></footer>
    </section>}
  </>;
}
