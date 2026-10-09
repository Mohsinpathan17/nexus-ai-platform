import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import type { Session } from "../../shared/contracts";
import { useAuth } from "../app/auth-context";
import { api, errorMessage } from "../lib/api";
import { useProviders } from "../hooks/useProviders";
export default function AuthPage({ signup = false }: { signup?: boolean }) {
  const auth = useAuth();
  const providers = useProviders();
  const publicDemo = import.meta.env.VITE_PUBLIC_DEMO === "1";
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const destination =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/workspace")
      ? location.state.from
      : "/workspace";
  if (auth.user) return <Navigate to={destination} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const fields = new FormData(event.currentTarget);
    try {
      const session = await api<Session>(
        signup ? "/auth/signup" : "/auth/login",
        {
          method: "POST",
          body: {
            name: fields.get("name"),
            email: fields.get("email"),
            password: fields.get("password"),
          },
        },
      );
      auth.update(session);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="auth-page container">
      <div className="auth-story">
        <span className="eyebrow">NEXYRAL / YOUR ENGINEERING WORKSPACE</span>
        <h1>
          {signup ? (
            <>
              Give your intent
              <br />
              <span>a place to begin.</span>
            </>
          ) : (
            <>
              Return to
              <br />
              <span>your next idea.</span>
            </>
          )}
        </h1>
        <p>
          Projects, intent, and execution history. A workspace that keeps the
          engineering context together.
        </p>
        <div className="auth-boundary">
          <LockKeyhole size={17} />
          <p>
            {publicDemo ? "Public website demo. Account creation, project storage, and engineering workers are unavailable on this deployment. Explore the product demonstrations on the Home page." : "Accounts and stored project data are functional. A connected local model can propose a plan. Frontend generation requires explicit approval and an enabled isolated build worker."}
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <span className="technical">
          {signup ? "CREATE YOUR ACCOUNT" : "SIGN IN"}
        </span>
        <h2>{signup ? "Start with your workspace." : "Welcome back."}</h2>
        {new URLSearchParams(location.search).has("github") && <p role="alert" className="form-error">{new URLSearchParams(location.search).get("github") === "link-required" ? "Sign in with your password, then connect GitHub from your workspace using the same verified email." : "GitHub sign-in did not complete. Please start again."}</p>}
        {!publicDemo && providers.github && <a className="button button-secondary" href="/api/auth/github/start">Continue with GitHub</a>}
        <p>
          {signup
            ? "Create an account on this NEXYRAL instance."
            : "Sign in to the account created on this instance."}
        </p>
        {publicDemo ? <p role="status">This demo does not collect account credentials. <Link to="/">Explore NEXYRAL →</Link></p> : <form onSubmit={submit}>
          {signup && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
              aria-describedby={signup ? "password-note" : undefined}
            />
          </label>
          {signup && (
            <small id="password-note">
              Use 12 or more characters. {providers.email ? "Check your inbox for a verification link after signup." : "Email delivery is not configured on this instance."}
            </small>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button"
            disabled={pending || auth.phase === "loading"}
          >
            {pending ? "Connecting…" : signup ? "Create account" : "Sign in"}
            <ArrowUpRight size={16} />
          </button>
        </form>}
        {!signup && !publicDemo && <p className="auth-switch"><Link to="/recover">Forgot your password?</Link></p>}
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New to NEXYRAL?"}{" "}
          <Link to={signup ? "/login" : "/get-started"} state={location.state}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}
