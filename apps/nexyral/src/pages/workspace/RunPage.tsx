import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Radio, X } from "lucide-react";
import type { RunDetail, RunEvent } from "../../../shared/contracts";
import { useAuth } from "../../app/auth-context";
import { useResource } from "../../hooks/useResource";
import { api, errorMessage } from "../../lib/api";
import { statusLabels } from "./run-labels";
import type { EngineeringPlan } from "../../../shared/plans";
import RunOutput from "./RunOutput";
import BehaviorEvidence from "./BehaviorEvidence";
import PlanReview from "./PlanReview";
import { RunContext } from "./RunContext";
import { RunRetry } from "./RunRetry";
import EvidenceOverview from "./EvidenceOverview";
import { summarizeEvidence } from "../../../shared/run-evidence";
export default function RunPage() {
  const { runId } = useParams();
  const { hash } = useLocation();
  const auth = useAuth();
  const refreshSession = auth.refresh;
  const resource = useResource<RunDetail>(`/runs/${runId}`);
  const { refresh } = resource;
  const [stream, setStream] = useState<{ id: string; events: RunEvent[] }>({
    id: "",
    events: [],
  });
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = resource.data?.run.id;
  useEffect(() => {
    if (id !== runId || !["#run-context-title", "#evidence-overview-title"].includes(hash)) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({ behavior: "instant", block: "start" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [id, runId, hash]);
  useEffect(() => {
    if (!id) return;
    const source = new EventSource(`/api/runs/${id}/events`);
    source.onopen = () => setConnected(true);
    source.onerror = () => {
      setConnected(false);
      void refreshSession();
    };
    source.addEventListener("run.event", (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as RunEvent;
      setStream((previous) => ({
        id,
        events: [
          ...(previous.id === id ? previous.events : []).filter(
            (item) => item.id !== event.id,
          ),
          event,
        ],
      }));
      void refresh();
    });
    source.addEventListener("session.expired", () => {
      source.close();
      window.dispatchEvent(new Event("nexyral:session-expired"));
    });
    return () => source.close();
  }, [id, refresh, refreshSession]);
  async function cancel() {
    setPending(true);
    setError(null);
    try {
      await api(`/runs/${runId}/cancel`, {
        method: "POST",
        body: {},
        csrf: auth.csrfToken,
      });
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  async function approve(artifactId: string) {
    setPending(true);
    setError(null);
    try {
      await api(`/runs/${runId}/approve`, { method: "POST", body: { artifactId }, csrf: auth.csrfToken });
      await refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  async function review(artifactId: string, reason: string, plan?: EngineeringPlan) {
    setPending(true); setError(null);
    try {
      await api(`/runs/${runId}/${plan ? "revise" : "reject"}`, { method: "POST", body: { artifactId, reason, ...(plan ? { plan } : {}) }, csrf: auth.csrfToken });
      await refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }
  if (resource.loading)
    return (
      <>
        <h1>Engineering run</h1>
        <p role="status">Loading run evidence…</p>
      </>
    );
  if (resource.error || !resource.data)
    return (
      <>
        <h1>Run unavailable.</h1>
        <p className="form-error" role="alert">
          {resource.error}
        </p>
        <Link to="/workspace">Return to projects</Link>
      </>
    );
  const { run, artifacts, executor } = resource.data;
  const evidence = summarizeEvidence(artifacts);
  const events = Array.from(
    new Map(
      [
        ...resource.data.events,
        ...(stream.id === run.id ? stream.events : []),
      ].map((event) => [event.id, event]),
    ).values(),
  ).sort((a, b) => a.id - b.id);
  return (
    <>
      <Link
        className="workspace-back"
        to={`/workspace/projects/${run.projectId}`}
      >
        <ArrowLeft size={13} />
        Project history
      </Link>
      <div className="workspace-page-heading">
        <div>
          <span className="eyebrow">
            ENGINEERING RUN / {run.id.slice(0, 8).toUpperCase()}
          </span>
          <h1>{run.stage === "intent" ? "Intent, recorded." : run.stage === "plan" ? "Engineering plan." : "Frontend engineering run."}</h1>
          <p>Created {new Date(run.createdAt).toLocaleString()}</p>
        </div>
        <span role="status" className={`run-status ${run.status}`}>
          {statusLabels[run.status]}
        </span>
      </div>
      <div className="executor-notice">
        <Radio size={18} />
        <div>
          <strong>
            {run.status === "cancelled"
              ? "This run has been cancelled."
              : run.status === "awaiting_approval" ? "Plan ready for review." : run.status === "succeeded" ? "This run completed." : run.status === "failed" ? "This run did not complete." : executor.available ? "Local worker connected." : "Waiting for an engineering worker."}
          </strong>
          <p>
            {run.status === "cancelled"
              ? "Available evidence remains stored. Cancellation does not establish successful verification or deployment."
              : ["succeeded", "failed"].includes(run.status) ? "Review the recorded check results and available output below. Missing evidence does not establish successful verification. Security review and deployment have not run." : executor.reason}
          </p>
        </div>
      </div>
      <div className="live-stage-track" aria-label="Run stages">
        {["Intent", "Understand", "Plan", "Build", "Verify", "Ship"].map(
          (stage, i) => (
            <div
              key={stage}
              className={run.stage === stage.toLowerCase() ? "current" : ""}
            >
              <span>0{i + 1}</span>
              <strong>{stage}</strong>
              <small>{i === 0 ? "RECORDED" : i === 2 && run.status === "awaiting_approval" ? "REVIEW REQUIRED" : (i === 2 && artifacts.some(artifact => artifact.name === "approved-plan.json")) ? "APPROVED" : (i === 3 && evidence.build === "passed") ? "BUILT" : (i === 4 && evidence.typecheck === "passed" && evidence.build === "passed") ? "TYPE / BUILD" : run.stage === stage.toLowerCase() && run.status === "running" ? "IN PROGRESS" : run.stage === stage.toLowerCase() && run.status === "failed" ? "INCOMPLETE" : "NOT STARTED"}</small>
            </div>
          ),
        )}
      </div>
      <RunContext intent={run.intent} artifacts={artifacts} />
      <EvidenceOverview detail={resource.data} />
      {run.status === "awaiting_approval" && artifacts.filter((artifact) => artifact.name === "engineering-plan.json").slice(-1).map((artifact) => (
        <PlanReview key={artifact.id} artifact={artifact} canApprove={Boolean(executor.buildAvailable)} pending={pending} onApprove={() => void approve(artifact.id)} onReview={(reason, plan) => void review(artifact.id, reason, plan)} />
      ))}
      {artifacts.filter((artifact) => artifact.name === "engineering-plan.json").length > 1 && <p className="technical">PROPOSAL HISTORY PRESERVED / ONLY THE LATEST REVISION CAN BE APPROVED</p>}
      <RunOutput key={run.id} runId={run.id} outputs={resource.data.outputs} />
      <BehaviorEvidence artifact={artifacts.filter((artifact) => artifact.kind === "verification").at(-1)} />
      <div className="run-evidence-layout">
        <section aria-labelledby="events-title">
          <div className="evidence-heading">
            <h2 id="events-title">Event history</h2>
            <span className="technical">
              {connected ? "STREAM CONNECTED" : "RECONNECTING"}
            </span>
          </div>
          <ol className="live-event-list">
            {events.map((event) => (
              <li key={event.id}>
                <span className="event-node" />
                <div>
                  <span className="technical">{event.type}</span>
                  <p>{event.message}</p>
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="artifact-title">
          <div className="evidence-heading">
            <h2 id="artifact-title">Artifacts</h2>
            <span className="technical">{artifacts.length} STORED</span>
          </div>
          {artifacts.map((artifact) => (
            <article className="stored-artifact" key={artifact.id}>
              <div>
                <FileText size={14} />
                <strong>{artifact.name}</strong>
                <span className="technical">{artifact.name === "retry-origin.json" ? "RETRY LINEAGE" : artifact.name === "project-requirements.json" ? "CAPTURED PROJECT CONTEXT" : artifact.kind === "intent" ? "USER INTENT" : artifact.kind === "verification" ? "ACTUAL CHECK OUTPUT" : artifact.kind === "patch" ? "GENERATED SOURCE" : artifact.name === "plan-review.json" ? "OWNER REVIEW" : artifact.name === "approved-plan.json" ? "OWNER APPROVAL" : "MODEL PROPOSAL"}</span>
              </div>
              <details className="artifact-details"><summary>Inspect raw evidence</summary><pre>{artifact.content}</pre></details>
              <button className="artifact-download" onClick={() => {
                const url = URL.createObjectURL(new Blob([artifact.content], { type: "application/octet-stream" }));
                const link = document.createElement("a"); link.href = url; link.download = artifact.name; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download artifact</button>
            </article>
          ))}
        </section>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="run-controls">
        <p>Builds require explicit approval and an enabled isolated worker. Verification covers type checking, compilation, and any explicitly selected browser behavior checks. Nothing is deployed.</p>
        {!["cancelled", "succeeded", "failed"].includes(run.status) && (
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => void cancel()}
          >
            <X size={14} />
            {pending ? "Cancelling…" : "Cancel run"}
          </button>
        )}
      </div>
      {["failed", "cancelled"].includes(run.status) && <RunRetry key={run.id} run={run} />}
    </>
  );
}
