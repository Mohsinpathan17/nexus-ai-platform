import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ArrowUpRight } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../app/auth-context";
import { useProviders } from "../hooks/useProviders";
export default function RecoverPage() {
  const publicDemo = import.meta.env.VITE_PUBLIC_DEMO === "1";
  const auth = useAuth();
  const providers = useProviders();
  const [requested, setRequested] = useState(false);
  async function requestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const email = new FormData(event.currentTarget).get("email");
    try { await api("/auth/request-recovery", { method: "POST", body: { email } }); setRequested(true); }
    catch (error) { setError(errorMessage(error)); } finally { setPending(false); }
  }
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function capture() {
      if (!window.location.hash) return;
      const next = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (next) { setToken(next); setComplete(false); setError(null); }
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    capture(); window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmation")) { setError("The passwords do not match."); return; }
    setPending(true); setError(null);
    try {
      await api("/auth/recovery", { method: "POST", body: { token, password: form.get("password") } });
      auth.update({ user: null, csrfToken: null });
      setToken(""); setComplete(true);
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  return <section className="auth-page container">
    <div className="auth-story"><span className="eyebrow">NEXYRAL / ACCOUNT RECOVERY</span><h1>Return to<br /><span>your work.</span></h1><p>Your projects and engineering history stay with your account.</p><div className="auth-boundary"><KeyRound size={18} /><p>{providers.email ? "Request a single-use recovery email. Password updates revoke previous sessions." : "Recovery links are issued by your instance operator after verifying your identity. Automatic email delivery is not configured."}</p></div></div>
    <div className="auth-panel"><span className="technical">RECOVER ACCESS</span><h2>{complete ? "Password updated." : "Set a new password."}</h2>
      {publicDemo ? <p role="status">Account recovery is unavailable on this public website demo. No recovery codes or passwords are collected. <Link to="/">Explore NEXYRAL →</Link></p> : complete ? <p role="status">Previous sessions have been signed out. <Link to="/login">Sign in with your new password →</Link></p> : <>
        {providers.email && <form onSubmit={requestEmail}><label>Account email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><button className="button button-secondary" disabled={pending}>Send recovery email</button>{requested && <p role="status">If your account exists and delivery is available, a recovery email will arrive shortly.</p>}</form>}
        <p>Open your one-time recovery link, or paste its code below. Links expire after 15 minutes.</p>
        <form onSubmit={submit}>
          <label>Recovery code<input name="token" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" spellCheck={false} required minLength={64} maxLength={64} /></label>
          <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
          <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
          <small>Use at least 12 characters. Updating your password signs out all existing sessions.</small>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button" disabled={pending}>{pending ? "Updating…" : "Update password"}<ArrowUpRight size={16} /></button>
        </form>
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </>}
    </div>
  </section>;
}
