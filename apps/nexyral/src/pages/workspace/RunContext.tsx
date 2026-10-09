import { Link } from "react-router-dom";
import type { Artifact } from "../../../shared/contracts";

export function RunContext({ intent, artifacts }: { intent: string; artifacts: Artifact[] }) {
  const snapshot = artifacts.find(item => item.name === "project-requirements.json" && item.kind === "intent");
  let requirements: { text: string; revision: number } | undefined;
  if (snapshot) try {
    const value: unknown = JSON.parse(snapshot.content);
    if (value && typeof value === "object" && "text" in value && typeof value.text === "string" && value.text.length <= 6000 && "revision" in value && typeof value.revision === "number" && Number.isSafeInteger(value.revision) && value.revision > 0) requirements = { text: value.text, revision: value.revision };
  } catch { /* Keep malformed raw evidence accessible without crashing review. */ }
  let parent: string | undefined;
  const origin = artifacts.find(item => item.name === "retry-origin.json" && item.kind === "intent");
  if (origin) try {
    const value: unknown = JSON.parse(origin.content);
    if (value && typeof value === "object" && "parentRunId" in value && typeof value.parentRunId === "string" && /^[a-f0-9-]{36}$/.test(value.parentRunId)) parent = value.parentRunId;
  } catch { /* Original evidence remains available below. */ }
  return <section className="run-context" aria-labelledby="run-context-title">
    <span className="eyebrow">RECORDED / INPUT CONTEXT</span>
    <h2 id="run-context-title" tabIndex={-1}>What this run was asked to do.</h2>
    {parent && <p className="run-origin">Retry of <Link to={`/workspace/runs/${parent}`}>Original run</Link> · fresh plan approval required</p>}
    <h3>Requested outcome</h3><p className="run-context-text">{intent}</p>
    <h3>Captured project requirements{requirements ? ` · revision ${requirements.revision}` : ""}</h3>
    <p className="run-context-text">{requirements ? requirements.text || "The captured brief was empty." : snapshot ? "This context could not be read. Inspect the stored artifact below." : "No project brief was captured. This run uses its recorded intent."}</p>
    <p className="run-context-disclosure">This is stored input, not a completed implementation. Later project edits leave this run's context intact.</p>
  </section>;
}
