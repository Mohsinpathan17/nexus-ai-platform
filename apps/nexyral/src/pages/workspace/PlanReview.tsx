import { useState } from "react";
import type { Artifact } from "../../../shared/contracts";
import PlanEditor from "./PlanEditor";
import { validatePlan, type EngineeringPlan } from "../../../shared/plans";
export default function PlanReview({ artifact, canApprove, pending, onApprove, onReview }: {
  artifact: Artifact; canApprove: boolean; pending: boolean; onApprove: () => void; onReview: (reason: string, plan?: EngineeringPlan) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(false);
  let plan;
  try { plan = validatePlan(JSON.parse(artifact.content)); } catch { return null; }
  return (
    <section className="plan-review" aria-labelledby="plan-review-title">
      <span className="eyebrow">PROPOSAL / HUMAN CONTROL</span>
      <h2 id="plan-review-title">Review before execution.</h2>
      <p>{plan.summary}</p>
      <div className="plan-review-sections">
        {([
          ["Requirements", plan.requirements], ["Architecture", plan.architecture],
          ["Acceptance criteria", plan.acceptanceCriteria], ["Risks & assumptions", plan.risks],
        ] as const).map(([title, items]) => (
          <div key={title}><h3>{title}</h3><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
        ))}
      </div>
      <div className="behavior-review"><h3>Approved behavior scope</h3>
        {plan.behaviorChecks?.length ? plan.behaviorChecks.map((check, i) => <div key={i}><strong>{check.name}</strong><ol>{check.steps.map((step, j) => <li key={j}>{step.action === "click" ? "Click button" : step.action === "fill" ? "Fill text input" : "Expect visible text"}: {step.text}{step.action === "fill" ? ` → ${step.value}` : ""}</li>)}</ol></div>) : <p>No browser behavior checks selected. Verification will cover type checking and compilation.</p>}
      </div>
      <PlanEditor plan={plan} pending={pending} onReview={onReview} onEditing={(value) => { setEditing(value); setConsent(false); }} />
      <label className="approval-consent">
        <input type="checkbox" disabled={editing || pending} checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I approve this exact proposal for a small client-side React frontend. It uses local state; selected browser behavior checks may execute. Backend services, authentication, security review, and deployment are outside this build.</span>
      </label>
      <button className="button" disabled={editing || !consent || !canApprove || pending} onClick={onApprove}>
        {pending ? "Recording approval…" : "Approve frontend build"}
      </button>
      {!canApprove && <p className="technical">A CONNECTED WORKER WITH ISOLATED BUILDS ENABLED IS REQUIRED.</p>}
    </section>
  );
}
