import { useState } from "react";
import { useProviders } from "../../hooks/useProviders";
import { useAuth } from "../../app/auth-context";
import { api, errorMessage } from "../../lib/api";
export default function AccountConnections() {
  const providers = useProviders(), auth = useAuth();
  const [pending, setPending] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function act(action: "github/connect" | "send-verification") {
    setPending(true); setError(""); setMessage("");
    try {
      const result = await api<{ url?: string }>(`/auth/${action}`, { method: "POST", body: {}, csrf: auth.csrfToken });
      if (result.url) window.location.assign(result.url);
      else setMessage("Verification email accepted for delivery. Check your inbox, then refresh account status.");
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  if (!providers.github && !providers.email) return null;
  return <section className="run-context" aria-labelledby="connections-title"><span className="eyebrow">YOUR ACCOUNT / CONNECTIONS</span><h2 id="connections-title">Sign-in and email.</h2>
    {providers.github && <p>{auth.githubConnected ? "GitHub sign-in is connected." : <button className="text-button" disabled={pending} onClick={() => void act("github/connect")}>Connect GitHub</button>}</p>}
    {providers.email && <><p>{auth.emailVerified ? "Email verified." : "Verify your email before creating or modifying project data."}</p>{!auth.emailVerified && <button className="text-button" disabled={pending} onClick={() => void act("send-verification")}>Send verification email</button>}<button className="text-button" disabled={pending} onClick={() => void auth.refresh()}>Refresh account status</button></>}
    {auth.emailDelivery === "failed" && <p className="form-error">Your account was created, but the verification email could not be sent. Request another email.</p>}
    {message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
