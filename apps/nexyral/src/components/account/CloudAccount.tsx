import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, GitBranch, Layers3, Eye, EyeOff } from 'lucide-react';
function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.7 4.7 0 0 1-2 3.1V20h3.3c2-1.8 2.9-4.4 2.9-7.8Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H3a10 10 0 0 0 0 9l3.4-2.7Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5L18.6 5A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.7C7.2 7.8 9.4 6.1 12 6.1Z"/></svg>;
}
interface Props {
  signup: boolean; ready: boolean; busy: boolean; notice: string;
  authenticate: (event: FormEvent<HTMLFormElement>) => void;
  google: () => void; github?: () => void; recover: (email: string) => void;
}
export default function CloudAccount({signup,ready,busy,notice,authenticate,google,github,recover}:Props) {
  const [showPassword,setShowPassword]=useState(false);
  const [recovery,setRecovery]=useState(false);
  return <div className="account-layout">
    <div className="account-story">
      <span className="eyebrow">NEXYRAL / YOUR BUILD SPACE</span>
      <h1>An idea is<br/>all it takes<span>.</span></h1>
      <p>Bring the intent. Shape the software.<br/>Keep every line of source.</p>
      <div className="account-orbit" aria-hidden="true"><div className="account-orbit-shell"/><div className="account-orbit-ring"/><div className="account-orbit-center"><Layers3 size={46}/></div><span className="orbit-label intent">INTENT</span><span className="orbit-label source">SOURCE</span><span className="orbit-label review">REVIEW</span></div>
      <ul className="account-principles"><li><Check size={17}/>Private projects, tied to your account</li><li><Check size={17}/>Editable React + TypeScript source</li><li><Check size={17}/>Your decision to review and ship</li></ul>
    </div>
    <div className="account-panel">
      <span className="eyebrow">{signup?'START SOMETHING':'CONTINUE YOUR WORK'}</span>
      <h2>{signup?'Create your account':'Welcome back'}</h2>
      <p className="account-subtitle">{signup?'Your first idea deserves a place to grow.':'Your ideas and projects are waiting.'}</p>
      <button className="account-google" disabled={busy||!ready} onClick={google}><GoogleMark/>Continue with Google</button>
      {github&&<button className="account-google" disabled={busy||!ready} onClick={github}><GitBranch size={20}/>Continue with GitHub</button>}
      <div className="account-divider"><span>or continue with email</span></div>
      <form onSubmit={authenticate}>
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required disabled={busy}/></label>
        <label>Password<div className="account-password"><input name="password" type={showPassword?'text':'password'} minLength={signup?12:1} autoComplete={signup?'new-password':'current-password'} placeholder={signup?'At least 12 characters':'Your password'} required disabled={busy}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
        <button className="cloud-action account-submit" disabled={busy||!ready}>{busy?'Please wait…':signup?'Create account':'Sign in'}<ArrowUpRight size={19}/></button>
      </form>
      <p className="cloud-notice account-notice" role="status" aria-live="polite">{notice||(!ready?'Checking your session…':'')}</p>
      <p className="account-switch">{signup?'Already have an account?':'New to NEXYRAL?'} <Link to={signup?'/login':'/get-started'}>{signup?'Sign in':'Create an account'}</Link></p>
      <button className="account-recovery-toggle" aria-expanded={recovery} onClick={()=>setRecovery(!recovery)}>Forgot your password?</button>
      {recovery&&<form className="account-recovery" onSubmit={event=>{event.preventDefault();recover(String(new FormData(event.currentTarget).get('recoveryEmail')));}}><label>Reset password<input name="recoveryEmail" type="email" autoComplete="email" required/></label><button className="cloud-action secondary" disabled={busy||!ready}>Send recovery email</button></form>}
      <p className="account-terms">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
    </div>
  </div>;
}
