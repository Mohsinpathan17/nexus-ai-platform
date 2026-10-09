import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { cloudAuth } from '../lib/cloud-auth';
export default function EmailAction() {
  const [params] = useState(()=>new URLSearchParams(location.search));
  const mode=params.get('mode'), code=params.get('oobCode');
  const [busy,setBusy]=useState(false),[complete,setComplete]=useState(false),[notice,setNotice]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!cloudAuth||!code)return;
    const password=String(new FormData(event.currentTarget).get('password')??'');
    setBusy(true);setNotice('');
    try{
      if(mode==='verifyEmail') {await checkActionCode(cloudAuth,code);await applyActionCode(cloudAuth,code);await cloudAuth.currentUser?.reload();await cloudAuth.currentUser?.getIdToken(true);}
      else if(mode==='resetPassword'){await verifyPasswordResetCode(cloudAuth,code);await confirmPasswordReset(cloudAuth,code,password);}
      else throw new Error('unsupported');
      history.replaceState(null,'',location.pathname);setComplete(true);
    }catch{setNotice('This link is invalid, expired, or already used. Request a fresh email from your account.');}
    finally{setBusy(false);}
  }
  const valid=cloudAuth&&code&&['verifyEmail','resetPassword'].includes(mode??'');
  return <section className="email-action container"><div className="account-panel"><span className="eyebrow">NEXYRAL / SECURE ACCOUNT ACTION</span>{complete?<><CheckCircle2 className="email-action-icon"/><h1>{mode==='resetPassword'?'Password updated.':'Email verified.'}</h1><p>{mode==='resetPassword'?'Sign in with your new password.':'Your address is verified. Return to your workspace to continue.'}</p><Link className="cloud-action" to={mode==='resetPassword'?'/login':'/workspace'}>Continue to NEXYRAL</Link></>:<><MailCheck className="email-action-icon"/><h1>{mode==='resetPassword'?'Set a new password.':'Verify your email.'}</h1><p>{valid?'Confirm this account action to continue securely.':'Open the complete verification or recovery link from your email. You can request a new link from your account.'}</p>{valid&&<form onSubmit={event=>void submit(event)}>{mode==='resetPassword'&&<label>New password<input name="password" type="password" minLength={12} autoComplete="new-password" required/></label>}<button className="cloud-action" disabled={busy}>{busy?'Confirming…':mode==='resetPassword'?'Save password':'Verify email address'}</button></form>}<p role="status">{notice}</p><Link to="/login">Back to sign in</Link></>}</div></section>;
}
