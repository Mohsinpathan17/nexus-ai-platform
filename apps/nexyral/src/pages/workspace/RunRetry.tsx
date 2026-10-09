import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { EngineeringRun } from "../../../shared/contracts";
import { useAuth } from "../../app/auth-context";
import { api, errorMessage } from "../../lib/api";

export function RunRetry({ run }: { run: EngineeringRun }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [intent, setIntent] = useState(run.intent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const requestId = useRef("");
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (editing && !pending) input.current?.focus();
    else if (!editing && restoreFocus.current) { trigger.current?.focus(); restoreFocus.current = false; }
  }, [editing, pending]);
  function close() { restoreFocus.current = true; setEditing(false); setError(null); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const result = await api<{ run: EngineeringRun }>(`/runs/${run.id}/retry`, { method: "POST", csrf: auth.csrfToken, body: { intent, requestId: requestId.current } });
      navigate(`/workspace/runs/${result.run.id}`);
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  return <section className="run-retry" aria-labelledby="run-retry-title">
    <span className="eyebrow">OWNER CONTROL / NEW ATTEMPT</span><h2 id="run-retry-title">Review before trying again.</h2>
    <p>A new run reuses the original captured requirements and starts planning again. Review its new proposal before approving a build. An enabled planning worker may pick up the new intent.</p>
    <button ref={trigger} className="text-button" disabled={pending} aria-expanded={editing} aria-controls="retry-run-form" onClick={() => { if (editing) close(); else { requestId.current = crypto.randomUUID(); setIntent(run.intent); setEditing(true); setError(null); } }}>Prepare retry</button>
    {editing && <form id="retry-run-form" className="workspace-form" onSubmit={submit} onKeyDown={event => { if (event.key === "Escape" && !pending) { event.preventDefault(); close(); } }}>
      <label htmlFor="retry-intent">Intent for the new attempt</label><textarea id="retry-intent" ref={input} value={intent} onChange={event => setIntent(event.target.value)} rows={5} required minLength={10} maxLength={4000} disabled={pending} />
      <p>Original evidence stays available. Prior approvals, generated code and verification results are not copied into the new attempt.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div><button className="button" disabled={pending}>{pending ? "Creating new attempt…" : "Create new attempt"}</button><button className="text-button" type="button" disabled={pending} onClick={close}>Cancel</button></div>
    </form>}
  </section>;
}
