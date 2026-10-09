import type { RunDetail } from "../../../shared/contracts";
import { summarizeEvidence, type EvidenceState } from "../../../shared/run-evidence";
const labels: Record<EvidenceState, string> = { passed: "Passed", failed: "Failed", incomplete: "Incomplete", not_run: "Not run", not_recorded: "Not recorded", unavailable: "Unreadable evidence" };
export default function EvidenceOverview({ detail }: { detail: RunDetail }) {
  const evidence = summarizeEvidence(detail.artifacts);
  const checks: { name: string; state: EvidenceState; scope: string }[] = [
    { name: "Type checking", state: evidence.typecheck, scope: "Recorded TypeScript process exit" },
    { name: "Production build", state: evidence.build, scope: "Recorded Vite process exit" },
    { name: "Browser behavior", state: evidence.browser, scope: "Owner-selected interactions only" },
    { name: "Security review", state: "not_run", scope: "No security audit is implemented" },
    { name: "Accessibility audit", state: "not_run", scope: "No generated-app audit has run" },
    { name: "Performance audit", state: "not_run", scope: "No generated-app benchmark has run" },
    { name: "Deployment", state: "not_run", scope: "No deployment service is connected" },
  ];
  return <section className="evidence-overview" aria-labelledby="evidence-overview-title">
    <div className="evidence-heading"><div><span className="eyebrow">EVIDENCE / THIS ATTEMPT</span><h2 id="evidence-overview-title" tabIndex={-1}>What has actually been checked.</h2></div><a className="text-button" href="#artifact-title">Inspect stored evidence</a></div>
    <p>{evidence.recorded ? "Check states below come from the retained verification artifact." : "No verification artifact is stored for this attempt yet. Its run status does not establish that checks passed."} Missing results are not treated as passes; unreadable results require raw evidence review.</p>
    <ul className="evidence-checks">{checks.map(check => <li key={check.name}><div><strong>{check.name}</strong><small>{check.scope}</small></div><span className={`evidence-state ${check.state}`}>{labels[check.state]}</span></li>)}</ul>
    <div className="evidence-availability"><div><span className="technical">SOURCE ARCHIVE</span><strong>{detail.outputs?.sourceAvailable ? "Available to request" : "Unavailable"}</strong></div><div><span className="technical">ISOLATED PREVIEW</span><strong>{detail.outputs?.previewAvailable ? "Available to request" : detail.outputs?.previewUnavailableReason === "expired" ? "Expired" : detail.outputs?.previewUnavailableReason === "quota" ? "Not retained · quota" : "Unavailable"}</strong></div>
      {detail.outputs?.sourceAvailable && <a className="text-button" href="#run-output-title">Review run output</a>}
    </div>
    <p className="evidence-disclosure">Output requests validate stored approval and source integrity. A retained preview is not a deployment. Prior attempts do not establish this attempt's results.</p>
  </section>;
}
