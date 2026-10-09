import { useState } from "react";
import { Link } from "react-router-dom";
import type { RunHistoryEntry } from "../../../shared/contracts";
import { statusLabels } from "./run-labels";

export function RunHistory({ runs }: { runs: RunHistoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [order, setOrder] = useState("newest");
  const [retriesOnly, setRetriesOnly] = useState(false);
  const visible = runs.filter(run => (!retriesOnly || run.parentRunId) && (!status || run.status === status) && run.intent.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    const difference = a.createdAt.localeCompare(b.createdAt) || (a.sequence ?? 0) - (b.sequence ?? 0) || a.id.localeCompare(b.id);
    return order === "oldest" ? difference : -difference;
  });
  if (!runs.length) return <div className="workspace-empty small"><h3>No runs yet.</h3><p>Record the first intent for this project. Every run will have its own events and artifacts.</p></div>;
  return <>
    <div className="project-tools run-history-tools">
      <label>Find a run<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search engineering intent" /></label>
      <label>Run status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Sort runs<select value={order} onChange={event => setOrder(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </div>
    <label className="attempt-filter"><input type="checkbox" checked={retriesOnly} onChange={event => setRetriesOnly(event.target.checked)} />Retries only</label>
    <p className="attempt-disclosure">Each attempt keeps its own context, approvals and evidence. Retry links identify the immediate parent; results are never combined. Filters may hide a related attempt.</p>
    <p className="project-result-count" role="status">{visible.length} of {runs.length} runs</p>
    {!visible.length && <div className="workspace-empty small"><h3>No matching runs.</h3><p>Change the search or status to find earlier work.</p><button className="text-button" onClick={() => { setQuery(""); setStatus(""); setRetriesOnly(false); }}>Clear run filters</button></div>}
    <ol className="run-list attempt-timeline" aria-label="Engineering attempts">{visible.map(run => <li key={run.id}>
      <div className="attempt-heading"><Link className="attempt-main" to={`/workspace/runs/${run.id}`}><span className="technical">RUN / {run.id.slice(0, 8).toUpperCase()}</span><h3>{run.intent}</h3><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time></Link>
        <span className={`run-status ${run.status}`}>{statusLabels[run.status]}</span></div>
      <div className="attempt-links"><span>{run.parentRunId ? <>Retry of <Link to={`/workspace/runs/${run.parentRunId}`}>{run.parentRunId.slice(0, 8).toUpperCase()}</Link></> : "No parent recorded"}</span>
        <Link to={`/workspace/runs/${run.id}#run-context-title`} aria-label={`Review context for run ${run.id.slice(0, 8)}`}>Context</Link>
        <Link to={`/workspace/runs/${run.id}#evidence-overview-title`} aria-label={`Review evidence for run ${run.id.slice(0, 8)}`}>Evidence</Link>
      </div>
    </li>)}</ol>
  </>;
}
