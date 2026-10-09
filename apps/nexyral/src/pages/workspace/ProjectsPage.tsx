import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FolderPlus, Plus } from "lucide-react";
import type { Project } from "../../../shared/contracts";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../app/auth-context";
import { api, errorMessage } from "../../lib/api";
export default function ProjectsPage() {
  const { data, error, loading, refresh } = useResource<{
    projects: Project[];
  }>("/projects");
  const auth = useAuth();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const visibleProjects = (data?.projects ?? []).filter(project => project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    if (sort === "runs") return b.runCount - a.runCount || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  });
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const name = new FormData(event.currentTarget).get("name");
    try {
      await api("/projects", {
        method: "POST",
        body: { name },
        csrf: auth.csrfToken,
      });
      await refresh();
      setQuery("");
      setSort("recent");
      setCreating(false);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <span className="eyebrow">YOUR WORK / PROJECTS</span>
          <h1>Give your intent a home.</h1>
          <p>
            Create a project to keep its engineering runs and artifacts
            together.
          </p>
        </div>
        <button
          className="button"
          onClick={() => setCreating(!creating)}
          aria-expanded={creating}
          aria-controls="new-project"
        >
          <Plus size={15} />
          New project
        </button>
      </div>
      {creating && (
        <form id="new-project" className="workspace-form" onSubmit={create}>
          <label>
            Project name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. SupportOS"
            />
          </label>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div>
            <button className="button" disabled={saving}>
              {saving ? "Creating…" : "Create project"}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {loading && <p role="status">Loading projects…</p>}
      {error && (
        <div className="resource-error" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      )}
      {data && data.projects.length === 0 && (
        <div className="workspace-empty">
          <FolderPlus size={35} strokeWidth={1} />
          <h2>Your first project starts here.</h2>
          <p>
            No sample projects or generated results. Create a project, then
            record the intent you want to engineer.
          </p>
        </div>
      )}
      {data && data.projects.length > 0 && (
        <>
        <div className="project-tools">
          <label>Find a project<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by project name" /></label>
          <label>Sort projects<select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Newest first</option><option value="name">Name A–Z</option><option value="runs">Most runs</option></select></label>
        </div>
        <p className="project-result-count" role="status">{visibleProjects.length} of {data.projects.length} projects</p>
        {visibleProjects.length === 0 && <div className="workspace-empty small"><h2>No matching projects.</h2><p>Try a different project name.</p><button className="text-button" onClick={() => setQuery("")}>Clear search</button></div>}
        <div className="project-list">
          {visibleProjects.map((project) => (
            <Link key={project.id} to={`/workspace/projects/${project.id}`}>
              <span className="project-monogram">
                {project.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>{project.name}</h2>
                <p>
                  {project.runCount} engineering{" "}
                  {project.runCount === 1 ? "run" : "runs"} · created{" "}
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
        </>
      )}
    </>
  );
}
