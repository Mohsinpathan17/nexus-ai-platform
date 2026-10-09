import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../app/auth-context";
export default function VerifyEmailPage() {
  const auth = useAuth();
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  const [status, setStatus] = useState(""), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const demo = import.meta.env.VITE_PUBLIC_DEMO === "1";
  useEffect(() => {
    function capture() {
      if (!window.location.hash) return;
      const next = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (next) { setToken(next); setStatus(""); setError(""); }
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    capture(); window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, []);
  async function verify() {
    setPending(true); setError("");
    try { await api("/auth/verify-email", { method: "POST", body: { token } }); await auth.refresh(); setStatus("Email verified. You can continue to your workspace."); }
    catch (error) { setError(errorMessage(error)); } finally { setPending(false); }
  }
  return <section className="route-intro container"><span className="eyebrow">NEXYRAL / EMAIL VERIFICATION</span><h1>Confirm your email.</h1><p>{demo ? "Email verification is unavailable on this public website demo." : "Verification links expire after one hour. Confirming this link does not sign you into an account."}</p>
    {!demo && !status && <button className="button" disabled={pending || !token} onClick={() => void verify()}>{pending ? "Verifying…" : "Verify email"}</button>}
    {status && <p role="status">{status}</p>}{error && <p role="alert" className="form-error">{error}</p>}
    <Link className="text-button" to="/workspace">Open workspace →</Link>
  </section>;
}
