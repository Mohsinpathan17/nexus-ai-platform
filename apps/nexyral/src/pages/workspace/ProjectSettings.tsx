import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Project } from "../../../shared/contracts";
import { useAuth } from "../../app/auth-context";
import { api, errorMessage } from "../../lib/api";

export function ProjectSettings({ project, refresh }: { project: Project; refresh: () => Promise<void> }) {
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (restoreFocus.current && !pending) { trigger.current?.focus(); restoreFocus.current = false; }
  }, [editing, pending]);
  function close() { restoreFocus.current = true; setEditing(false); setError(null); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage("");
    const name = new FormData(event.currentTarget).get("name");
    try {
      await api(`/projects/${project.id}`, { method: "PATCH", csrf: auth.csrfToken, body: { name, expectedName: project.name } });
      await refresh(); setMessage("Project name saved."); close();
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  return <div className="project-settings">
    <button ref={trigger} className="text-button" aria-expanded={editing} aria-controls="project-settings-form" onClick={() => { if (editing) close(); else { setMessage(""); setEditing(true); } }} disabled={pending}>Rename project</button>
    <p className="project-save-status" role="status">{message}</p>
    {editing && <form id="project-settings-form" className="workspace-form" onSubmit={save} onKeyDown={event => { if (event.key === "Escape" && !pending) { event.preventDefault(); close(); } }}>
      <label>Project name<input ref={input} name="name" defaultValue={project.name} required minLength={2} maxLength={100} disabled={pending} /></label>
      <p>Runs and their engineering evidence stay with this project.</p>
      {error && <div className="project-settings-error" role="alert"><p className="form-error">{error}</p><button type="button" className="text-button" disabled={pending} onClick={() => void refresh()}>Refresh project</button></div>}
      <div><button className="button" disabled={pending}>{pending ? "Saving…" : "Save project name"}</button><button type="button" className="text-button" disabled={pending} onClick={close}>Cancel</button></div>
    </form>}
  </div>;
}
