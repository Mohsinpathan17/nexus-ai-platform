import { useState } from "react";
import type { EngineeringPlan } from "../../../shared/plans";
import BehaviorEditor from "./BehaviorEditor";
const fields = ["requirements", "architecture", "acceptanceCriteria", "risks"] as const;
const labels = { requirements: "Requirements", architecture: "Architecture", acceptanceCriteria: "Acceptance criteria", risks: "Risks & assumptions" };
export default function PlanEditor({ plan, pending, onReview, onEditing }: {
  plan: EngineeringPlan; pending: boolean;
  onReview: (reason: string, plan?: EngineeringPlan) => void; onEditing: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(plan.summary);
  const [sections, setSections] = useState(Object.fromEntries(fields.map((key) => [key, plan[key].join("\n")])) as Record<typeof fields[number], string>);
  const [checks, setChecks] = useState(plan.behaviorChecks ?? []);
  const [reason, setReason] = useState("");
  return <div className="plan-editor">
    <button className="button button-secondary" disabled={pending} onClick={() => { setEditing(!editing); onEditing(!editing); }} aria-expanded={editing}>{editing ? "Close revision editor" : "Revise proposal"}</button>
    {editing && <div className="plan-editor-fields">
      <label htmlFor="revision-summary">Summary<textarea id="revision-summary" value={summary} maxLength={4000} onChange={(event) => setSummary(event.target.value)} /></label>
      <p>Use one item per line in each section. Saving preserves this proposal and creates a new version.</p>
      {fields.map((key) => <label key={key} htmlFor={`revision-${key}`}>{labels[key]}<textarea id={`revision-${key}`} value={sections[key]} onChange={(event) => setSections({ ...sections, [key]: event.target.value })} /></label>)}
      <BehaviorEditor checks={checks} onChange={setChecks} />
    </div>}
    <label htmlFor="review-reason">Review reason<textarea id="review-reason" value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Explain the change or why this proposal should not proceed." /></label>
    <div className="plan-editor-actions">
      {editing && <button className="button" disabled={pending || reason.trim().length < 2} onClick={() => onReview(reason, { summary, behaviorChecks: checks, ...Object.fromEntries(fields.map((key) => [key, sections[key].split("\n").map((text) => text.trim()).filter(Boolean)])) } as EngineeringPlan)}>Save new revision</button>}
      <button className="button button-secondary" disabled={pending || reason.trim().length < 2} onClick={() => onReview(reason)}>Reject proposal and end run</button>
    </div>
  </div>;
}
