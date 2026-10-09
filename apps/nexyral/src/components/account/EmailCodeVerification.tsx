import { useState, type FormEvent } from 'react';
interface Props {
  busy: boolean;
  send: () => void;
  confirm: (code: string) => void;
}
export default function EmailCodeVerification({busy,send,confirm}: Props) {
  const [code,setCode]=useState('');
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();confirm(code);}
  return <div className="cloud-verification email-code-panel">
    <div><span className="eyebrow">SECURE YOUR ACCOUNT</span><h2>Enter your verification code.</h2><p>Request a six-digit code from NEXYRAL · nexyral.online. Enter it here within 10 minutes to activate AI generation.</p></div>
    <form onSubmit={submit}><label htmlFor="email-verification-code">Six-digit email code</label><input id="email-verification-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} required placeholder="000000"/><button className="cloud-action" disabled={busy||code.length!==6}>Verify email</button></form>
    <button className="cloud-action secondary" disabled={busy} onClick={send}>Send verification code</button>
  </div>;
}
