import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import type { EngineeringRun, RunHistoryEntry, Project } from "../../../shared/contracts";
import { useAuth } from "../../app/auth-context";
import { useResource } from "../../hooks/useResource";
import { api, errorMessage } from "../../lib/api";
import { ProjectSettings } from "./ProjectSettings";
import { ProjectRequirements } from "./ProjectRequirements";
import { RunHistory } from "./RunHistory";
export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const projectResource = useResource<{ project: Project }>(`/projects/${projectId}`);
  const runs = useResource<{ runs: RunHistoryEntry[] }>(
    `/projects/${projectId}/runs`,
  );
  const project = projectResource.data?.project;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const intent = new FormData(event.currentTarget).get("intent");
      const { run } = await api<{ run: EngineeringRun }>(
        `/projects/${projectId}/runs`,
        { method: "POST", body: { intent }, csrf: auth.csrfToken },
      );
      navigate(`/workspace/runs/${run.id}`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Link className="workspace-back" to="/workspace">
        <ArrowLeft size={13} />
        All projects
      </Link>
      <div className="workspace-page-heading">
        <div>
          <span className="eyebrow">PROJECT / ENGINEERING INTENT</span>
          <h1>{project?.name ?? "Project workspace"}</h1>
          <p>
            Describe the outcome, constraints, and what a correct result should
            do.
          </p>
        </div>
      </div>
      {projectResource.error && <p className="form-error" role="alert">{projectResource.error}</p>}
      {project && <ProjectSettings key={`settings-${project.id}`} project={project} refresh={projectResource.refresh} />}
      {project && <ProjectRequirements key={`requirements-${project.id}`} projectId={project.id} onEditingChange={setEditingRequirements} />}
      <form className="workspace-form intent-form" onSubmit={submit}>
        <label>
          What do you want to build?
          <textarea
            name="intent"
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Describe the users, required behavior, constraints, and acceptance criteria."
            aria-describedby="intent-disclosure"
          />
        </label>
        <p id="intent-disclosure">
          Saved project requirements are captured with this intent. Save or cancel any brief edits before creating a run. A connected local model worker can produce a proposal for review. A frontend build requires your explicit approval. Nothing is deployed.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={pending || !project || editingRequirements || Boolean(runs.error)}>
          {pending ? "Recording intent…" : "Create engineering run"}
          <ArrowUpRight size={15} />
        </button>
      </form>
      <div className="run-history-heading">
        <h2>Run history</h2>
        <span className="technical">PERSISTENT / OWNER-ONLY</span>
      </div>
      {runs.loading && <p role="status">Loading runs…</p>}
      {runs.error && (
        <p className="form-error" role="alert">
          {runs.error}
        </p>
      )}
      {runs.data && <RunHistory key={projectId} runs={runs.data.runs} />}
    </>
  );
}
