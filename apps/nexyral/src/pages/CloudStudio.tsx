import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  ArrowUpRight,
  Code2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { cloudAuth } from "../lib/cloud-auth";
import CloudAccount from "../components/account/CloudAccount";
import EmailCodeVerification from '../components/account/EmailCodeVerification';
import SourceOutput from "../components/workspace/SourceOutput";
interface Source {
  app: string;
  css: string;
}
interface Project {
  id: string;
  intent: string;
  status: string;
  error?: string;
  source?: Source | null;
  updated_at?: string;
}
const authMessages: Record<string, string> = {
  "auth/configuration-not-found": "Account sign-in is not activated yet. Please try again after setup is complete.",
  "auth/operation-not-allowed": "This sign-in method is not enabled yet. Please try again after setup is complete.",
  "auth/invalid-credential": "Check your email and password.",
  "auth/email-already-in-use":
    "An account already uses this email. Sign in or reset your password.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow popups for nexyral.online and try again.",
  "auth/account-exists-with-different-credential": "Use your original sign-in method for this email to keep access to your account.",
  "auth/unauthorized-domain": "This website address needs authorization in Firebase settings.",
  "auth/popup-closed-by-user": "The sign-in window was closed.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
};
function message(error: unknown) {
  if (error && typeof error === "object" && "code" in error)
    return (
      authMessages[String(error.code)] ??
      "Sign-in could not complete. Check provider configuration."
    );
  return error instanceof Error
    ? error.message
    : "The request could not complete.";
}
export default function CloudStudio() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [codeVerified,setCodeVerified]=useState(false);
  const location = useLocation();
  const signup = location.pathname === "/get-started";
  const [intent, setIntent] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const [phase, setPhase] = useState<"idle" | "generating">("idle");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  useEffect(() => {
    if (!cloudAuth) return;
    let active = true;
    const unsubscribe = onAuthStateChanged(cloudAuth, (next) => {
      setUser(next);
      setCodeVerified(false);
      setReady(true);
      setProjects([]);
      setSelected(null);
      if (next && window.location.pathname === "/verify-email") {
        void next.reload().then(() => next.getIdToken(true)).then(() => {
          if (active) { setUser(next); setNotice(next.emailVerified ? "Your email is verified. You can start generating." : "Your address is not verified yet. Open the verification link or request a fresh email."); }
        }).catch(() => { if (active) setNotice("Could not refresh verification. Use Check verification to try again."); });
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  const request = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    if (!user) throw new Error("Sign in to continue.");
    const response = await fetch(`/api/cloud${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The service is temporarily unavailable. Your saved projects are safe; try again.");
    const value = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(value.error ?? "Request failed.");
    return value;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void request<{verified:boolean}>('/verification/status').then(value=>{if(active)setCodeVerified(current=>current||value.verified);}).catch(()=>{/* Keep generation locked until the server confirms verification. */});
    void request<{ projects: Project[] }>("/projects")
      .then((value) => {
        if (active) setProjects(value.projects);
      })
      .catch((error) => {
        if (active) setNotice(message(error));
      });
    return () => {
      active = false;
    };
  }, [user, request]);
  useEffect(() => {
    if (!selected || selected.status !== "generating" || phase === "generating") return;
    let active = true;
    const timer = window.setInterval(() => {
      setClock(Date.now());
      void request<Project>(`/projects/${selected.id}`).then(project => {
        if (active) setSelected(project);
      }).catch(() => { /* Retry on the next bounded poll; no generation is submitted. */ });
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [selected, phase, request]);
  async function perform(action: () => Promise<unknown>, success = "") {
    setBusy(true);
    setNotice("");
    try {
      await action();
      if (success) setNotice(success);
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void perform(async () => {
      if (!cloudAuth) return;
      const email = String(data.get("email")),
        password = String(data.get("password"));
      if (signup) {
        const account = await createUserWithEmailAndPassword(
          cloudAuth,
          email,
          password,
        );
        const response=await fetch('/api/cloud/verification/send',{method:'POST',headers:{Authorization:`Bearer ${await account.user.getIdToken()}`,'Content-Type':'application/json'},body:'{}'});
        const result=await response.json() as {error?:string};
        setNotice(response.ok ? 'Account created. Enter the six-digit code sent to your email.' : `Account created. ${result.error??'Code delivery is temporarily unavailable. Request a new code below.'}`);
      } else await signInWithEmailAndPassword(cloudAuth, email, password);
    });
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedIntent = String(new FormData(event.currentTarget).get("intent"));
    void perform(async () => {
      const value = await request<{ id: string }>("/projects", { intent: submittedIntent });
      const project = await request<Project>(`/projects/${value.id}`);
      setSelected(project);
      setIntent("");
      setProjects((current) => [project, ...current]);
    });
  }
  async function generate() {
    if (!selected) return;
    const id = selected.id;
    setPhase("generating");
    await perform(async () => {
      setNotice("Gemini is generating your frontend. Keep this tab open.");
      const value = await request<{ source: Source }>(
        `/projects/${id}/generate`,
        {},
      );
      setSelected((current) =>
        current?.id === id
          ? { ...current, status: "generated", source: value.source }
          : current,
      );
      setProjects((current) =>
        current.map((project) =>
          project.id === id ? { ...project, status: "generated" } : project,
        ),
      );
    }, "Source generated. Build, tests and deployment have not run.");
    setPhase("idle");
    try {
      const project = await request<Project>(`/projects/${id}`);
      setSelected(current => current?.id === id ? project : current);
      setProjects(current => current.map(item => item.id === id ? project : item));
    } catch { /* The visible error remains; refresh can recover persisted state. */ }
  }
  if (!cloudAuth)
    return (
      <section className="cloud-studio container">
        <span className="eyebrow">SERVERLESS WORKSPACE</span>
        <h1>Connect your cloud.</h1>
        <p>
          Firebase public configuration is required before accounts can be
          activated. Follow the free serverless deployment guide.
        </p>
      </section>
    );
  const auth = cloudAuth;
  const awaitingGeneration = selected?.status === "generating" && clock - Date.parse(selected.updated_at ?? "") < 120000;
  return (
    <section className={`cloud-studio container ${user ? "" : "cloud-account-page"}`}>
      {user && <div className="cloud-heading">
        <div>
          <span className="eyebrow">NEXYRAL / CLOUD STUDIO</span>
          <h1>
            {user
              ? "Your next idea starts here."
              : "Intent deserves execution."}
          </h1>
          <p>
            Save an idea. Generate a React frontend with Gemini. Keep control of
            the source.
          </p>
        </div>
        {user && (
          <button
            className="cloud-action secondary"
            onClick={() => void perform(() => signOut(auth))}
            disabled={busy}
          >
            <LogOut size={17} />
            Sign out
          </button>
        )}
      </div>}
      {user && <p className="cloud-notice" role="status" aria-live="polite">
        {notice || (!ready ? "Checking your session…" : "")}
      </p>}
      {!user ? (
        <CloudAccount signup={signup} ready={ready} busy={busy} notice={notice} authenticate={authenticate}
          google={() => void perform(() => { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); return signInWithPopup(auth, provider); })}
          github={import.meta.env.VITE_FIREBASE_GITHUB === "1" ? () => void perform(() => signInWithPopup(auth, new GithubAuthProvider())) : undefined}
          recover={email => void perform(() => sendPasswordResetEmail(auth, email, { url: "https://nexyral.online/login" }), "If an account exists, check your inbox for recovery instructions.")} />
      ) : (
        <>
          {!user.emailVerified && !codeVerified && <EmailCodeVerification busy={busy}
            send={()=>void perform(()=>request('/verification/send',{}),'Verification code sent. Check your inbox and enter it here.')}
            confirm={code=>void perform(async()=>{await request('/verification/confirm',{code});setCodeVerified(true);},'Email verified. You can start generating.')} />}
          <ol className="cloud-stages" aria-label="Project workflow">
            <li><span>01</span><div><strong>Capture intent</strong><small>{selected ? "Project saved" : "Describe your frontend"}</small></div></li>
            <li><span>02</span><div><strong>Generate source</strong><small>{phase === "generating" ? "Gemini is working" : selected?.source ? "Source received" : "Powered by Gemini"}</small></div></li>
            <li><span>03</span><div><strong>Review & export</strong><small>Build and test locally</small></div></li>
          </ol>
          <div className="cloud-workbench">
            <aside>
              <h2>Your projects</h2>
              {projects.length === 0 && (
                <p>No projects yet. Start with one clear idea.</p>
              )}
              {projects.map((project) => (
                <button
                  className="cloud-project"
                  aria-pressed={selected?.id === project.id}
                  disabled={busy}
                  key={project.id}
                  onClick={() =>
                    void perform(async () =>
                      setSelected(
                        await request<Project>(`/projects/${project.id}`),
                      ),
                    )
                  }
                >
                  <Code2 size={17} />
                  <span>
                    {project.intent.slice(0, 75)}
                    <small>{project.status}</small>
                  </span>
                </button>
              ))}
            </aside>
            <div className="cloud-editor">
              <form onSubmit={save}>
                <label htmlFor="cloud-intent">What should we build?</label>
                <textarea
                  id="cloud-intent"
                  name="intent"
                  value={intent}
                  onChange={event => setIntent(event.target.value)}
                  disabled={busy}
                  rows={5}
                  minLength={10}
                  maxLength={8000}
                  placeholder="Build an accessible support ticket interface with search, filters and a responsive layout…"
                  required
                />
                <button className="cloud-action" disabled={busy}>
                  Save project
                  <ArrowUpRight size={18} />
                </button>
              </form>
              {selected && (
                <div className="cloud-output">
                  <h2>{selected.intent}</h2>
                  {phase === "generating" && <div className="cloud-generation-state" role="status"><span className="cloud-pulse" /><span>Generating with Gemini. Your project is saved; source appears when the response completes.</span></div>}
                  <p>
                    Frontend source generation · React + TypeScript · No backend
                    or deployment implied.
                  </p>
                  {selected.error && <p className="cloud-run-error" role="alert">{selected.error}</p>}
                  {!selected.source ? (
                    <button
                      className="cloud-action"
                      disabled={busy || (!user.emailVerified && !codeVerified) || awaitingGeneration}
                      onClick={() => void generate()}
                    >
                      <Sparkles size={18} />
                      {phase === "generating" ? "Generating source…" : awaitingGeneration ? "Generation in progress" : selected.status === "generating" ? "Retry interrupted generation" : selected.status === "failed" ? "Retry generation" : "Generate with Gemini"}
                    </button>
                  ) : (
                    <SourceOutput key={selected.id} source={selected.source} />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
