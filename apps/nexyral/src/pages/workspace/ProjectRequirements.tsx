import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProjectRequirements as Requirements } from "../../../shared/contracts";
import { useAuth } from "../../app/auth-context";
import { useResource } from "../../hooks/useResource";
import { api, errorMessage } from "../../lib/api";

export function ProjectRequirements({ projectId, onEditingChange }: { projectId: string; onEditingChange: (editing: boolean) => void }) {
  const resource = useResource<{ requirements: Requirements }>(`/projects/${projectId}/requirements`);
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (restoreFocus.current && !pending) { trigger.current?.focus(); restoreFocus.current = false; }
  }, [editing, pending]);
  useEffect(() => { onEditingChange(editing); return () => onEditingChange(false); }, [editing, onEditingChange]);
  function close() { restoreFocus.current = true; setEditing(false); setError(null); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resource.data) return;
    setPending(true); setError(null); setMessage("");
    try {
      await api(`/projects/${projectId}/requirements`, { method: "PATCH", csrf: auth.csrfToken, body: { text, expectedRevision: resource.data.requirements.revision } });
      await resource.refresh(); setMessage("Project requirements saved. Existing runs keep their original context."); close();
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  const requirements = resource.data?.requirements;
  return <section className="project-brief" aria-labelledby="project-brief-heading">
    <div className="project-brief-heading"><div><span className="eyebrow">PROJECT CONTEXT</span><h2 id="project-brief-heading">A brief that travels with your intent.</h2></div>
      {requirements && <button ref={trigger} className="text-button" disabled={pending} aria-expanded={editing} aria-controls="project-brief-editor" onClick={() => {
        if (editing) close();
        else { setText(requirements.text); setEditing(true); setMessage(""); }
      }}>{requirements.text ? "Edit requirements" : "Add requirements"}</button>}
    </div>
    <p className="project-brief-help">Save users, constraints and acceptance criteria once. Each new run captures the saved version; later edits leave earlier runs intact.</p>
    {resource.loading && <p role="status">Loading project requirements…</p>}
    {resource.error && <div role="alert"><p className="form-error">{resource.error}</p><button className="text-button" onClick={() => void resource.refresh()}>Retry requirements</button></div>}
    {requirements && !editing && <div className="project-brief-summary">
      <span className="technical">{requirements.revision ? `SAVED / REVISION ${requirements.revision}` : "NO SAVED REQUIREMENTS"}</span>
      <p tabIndex={requirements.text ? 0 : undefined} aria-label="Saved project requirements">{requirements.text || "Add shared context when your project needs it. Your run intent still describes the specific task."}</p>
    </div>}
    <p className="project-save-status" role="status">{message}</p>
    {editing && <form id="project-brief-editor" className="workspace-form" onSubmit={save} onKeyDown={event => { if (event.key === "Escape" && !pending) { event.preventDefault(); close(); } }}>
      <label htmlFor="project-requirements-text">Project requirements</label><textarea id="project-requirements-text" ref={input} value={text} onChange={event => setText(event.target.value)} maxLength={6000} rows={6} disabled={pending} aria-describedby="project-brief-limit" placeholder="Who is this for? What must it do? Which constraints and acceptance criteria apply across runs?" />
      <p id="project-brief-limit">{text.length} / 6,000 characters. An empty brief clears saved requirements for future runs.</p>
      {error && <div className="project-settings-error" role="alert"><p className="form-error">{error}</p><button className="text-button" type="button" disabled={pending} onClick={() => void resource.refresh()}>Refresh requirements</button>
        {requirements && <details><summary>Review saved requirements · revision {requirements.revision}</summary><p className="saved-requirements-text">{requirements.text || "No saved requirements."}</p></details>}
      </div>}
      <div><button className="button" disabled={pending || !requirements}>{pending ? "Saving…" : "Save requirements"}</button><button className="text-button" type="button" disabled={pending} onClick={close}>Cancel</button></div>
    </form>}
  </section>;
}
